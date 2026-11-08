import { create } from 'zustand'
import { db } from '../data/db'
import { parseBackup } from '../data/schema'
import { deriveDoppelganger, emptyProfile } from '../lib/profile'
import { defaultSettings } from '../lib/io'
import { uid } from '../lib/id'
import type {
  Conversation,
  DecisionRecord,
  DoppelgangerProfile,
  Lang,
  Memory,
  ProfileVersion,
  SimilarityResult,
  Theme,
  UserProfile,
  UserSettings,
} from '../types'

interface AppState {
  loaded: boolean
  profile: UserProfile | null
  doppel: DoppelgangerProfile | null
  memories: Memory[]
  conversations: Conversation[]
  decisions: DecisionRecord[]
  similarities: SimilarityResult[]
  versions: ProfileVersion[]
  settings: UserSettings
  notice: { kind: 'ok' | 'err'; text: string } | null

  hydrate: () => Promise<void>
  setNotice: (notice: AppState['notice']) => void

  saveProfile: (patch: Partial<Omit<UserProfile, 'id'>>, reason: ProfileVersion['reason'], label?: string) => Promise<void>
  setLang: (lang: Lang) => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
  updateSettings: (patch: Partial<Omit<UserSettings, 'id'>>) => Promise<void>
  setAiConfig: (patch: Partial<UserSettings['ai']>) => Promise<void>

  addMemory: (input: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Memory>
  updateMemory: (id: string, patch: Partial<Omit<Memory, 'id' | 'createdAt'>>) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  toggleMemory: (id: string) => Promise<void>
  importMemories: (rows: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<number>

  saveConversation: (conversation: Conversation) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  clearConversations: () => Promise<void>

  saveDecision: (record: DecisionRecord) => Promise<void>
  answerDecision: (id: string, optionId: string, note: string) => Promise<void>

  saveSimilarity: (result: Omit<SimilarityResult, 'id' | 'createdAt'>) => Promise<SimilarityResult>

  restoreVersion: (versionId: string) => Promise<void>
  deleteVersion: (versionId: string) => Promise<void>

  importBackupData: (raw: unknown) => Promise<{ ok: boolean; error?: string }>
  wipeAll: () => Promise<void>
}

function recompute(profile: UserProfile, memories: Memory[], lang: Lang): DoppelgangerProfile {
  return deriveDoppelganger(profile, memories, lang)
}

export const useApp = create<AppState>((set, get) => ({
  loaded: false,
  profile: null,
  doppel: null,
  memories: [],
  conversations: [],
  decisions: [],
  similarities: [],
  versions: [],
  settings: defaultSettings(),
  notice: null,

  setNotice: (notice) => set({ notice }),

  hydrate: async () => {
    const [profileRow, memories, conversations, decisions, similarities, versions, settingsRow] = await Promise.all([
      db.profile.get('me'),
      db.memories.orderBy('createdAt').reverse().toArray(),
      db.conversations.orderBy('updatedAt').reverse().toArray(),
      db.decisions.orderBy('createdAt').reverse().toArray(),
      db.similarities.orderBy('createdAt').reverse().toArray(),
      db.versions.orderBy('createdAt').reverse().toArray(),
      db.settings.get('settings'),
    ])

    const settings = settingsRow ?? defaultSettings()
    if (!settingsRow) await db.settings.put(settings)

    const profile = profileRow ?? null
    const doppel = profile ? recompute(profile, memories, settings.lang) : null

    set({
      loaded: true,
      profile,
      doppel,
      memories,
      conversations,
      decisions,
      similarities,
      versions,
      settings,
    })
  },

  saveProfile: async (patch, reason, label) => {
    const state = get()
    const base = state.profile ?? emptyProfile()
    const next: UserProfile = { ...base, ...patch, id: 'me', updatedAt: Date.now() }
    await db.profile.put(next)

    const memories = state.memories
    const doppel = recompute(next, memories, state.settings.lang)

    const snapshot = { profile: next, doppel, memories: memories.map((m) => ({ ...m })) }
    const version: ProfileVersion = {
      id: uid('ver'),
      label: label ?? `${reason} 路 ${new Date().toLocaleString()}`,
      reason,
      snapshot,
      createdAt: Date.now(),
    }
    await db.versions.add(version)

    set({
      profile: next,
      doppel,
      versions: [version, ...state.versions],
    })
  },

  setLang: async (lang) => {
    const state = get()
    const settings: UserSettings = { ...state.settings, lang, updatedAt: Date.now() }
    await db.settings.put(settings)
    const doppel = state.profile ? recompute(state.profile, state.memories, lang) : null
    set({ settings, doppel })
  },

  setTheme: async (theme) => {
    const state = get()
    const settings: UserSettings = { ...state.settings, theme, updatedAt: Date.now() }
    await db.settings.put(settings)
    set({ settings })
  },

  updateSettings: async (patch) => {
    const state = get()
    const settings: UserSettings = { ...state.settings, ...patch, id: 'settings', updatedAt: Date.now() }
    await db.settings.put(settings)
    set({ settings })
  },

  setAiConfig: async (patch) => {
    const state = get()
    const ai = { ...state.settings.ai, ...patch }
    await get().updateSettings({ ai })
    if (!ai.persistKey && ai.apiKey) {
      // Key stays in memory only; strip it from the persisted row.
      await db.settings.put({ ...get().settings, ai: { ...ai, apiKey: '' } })
    }
  },

  addMemory: async (input) => {
    const state = get()
    const now = Date.now()
    const memory: Memory = { ...input, id: uid('mem'), createdAt: now, updatedAt: now }
    await db.memories.add(memory)
    const memories = [memory, ...state.memories]
    const doppel = state.profile ? recompute(state.profile, memories, state.settings.lang) : null
    set({ memories, doppel })
    return memory
  },

  updateMemory: async (id, patch) => {
    const state = get()
    const existing = state.memories.find((m) => m.id === id)
    if (!existing) return
    const next: Memory = { ...existing, ...patch, id, updatedAt: Date.now() }
    await db.memories.put(next)
    const memories = state.memories.map((m) => (m.id === id ? next : m))
    const doppel = state.profile ? recompute(state.profile, memories, state.settings.lang) : null
    set({ memories, doppel })
  },

  deleteMemory: async (id) => {
    const state = get()
    await db.memories.delete(id)
    const memories = state.memories.filter((m) => m.id !== id)
    const doppel = state.profile ? recompute(state.profile, memories, state.settings.lang) : null
    set({ memories, doppel })
  },

  toggleMemory: async (id) => {
    const state = get()
    const existing = state.memories.find((m) => m.id === id)
    if (!existing) return
    await get().updateMemory(id, { enabled: !existing.enabled })
  },

  importMemories: async (rows) => {
    const state = get()
    const now = Date.now()
    const created: Memory[] = rows.map((row) => ({
      ...row,
      id: uid('mem'),
      createdAt: now,
      updatedAt: now,
    }))
    await db.memories.bulkAdd(created)
    const memories = [...created, ...state.memories]
    const doppel = state.profile ? recompute(state.profile, memories, state.settings.lang) : null
    set({ memories, doppel })
    return created.length
  },

  saveConversation: async (conversation) => {
    const state = get()
    const exists = state.conversations.some((c) => c.id === conversation.id)
    await db.conversations.put(conversation)
    const conversations = exists
      ? state.conversations.map((c) => (c.id === conversation.id ? conversation : c))
      : [conversation, ...state.conversations]
    conversations.sort((a, b) => b.updatedAt - a.updatedAt)
    set({ conversations })
  },

  deleteConversation: async (id) => {
    const state = get()
    await db.conversations.delete(id)
    set({ conversations: state.conversations.filter((c) => c.id !== id) })
  },

  clearConversations: async () => {
    await db.conversations.clear()
    set({ conversations: [] })
  },

  saveDecision: async (record) => {
    const state = get()
    await db.decisions.put(record)
    const exists = state.decisions.some((d) => d.id === record.id)
    const decisions = exists
      ? state.decisions.map((d) => (d.id === record.id ? record : d))
      : [record, ...state.decisions]
    decisions.sort((a, b) => b.prediction.createdAt - a.prediction.createdAt)
    set({ decisions })
  },

  answerDecision: async (id, optionId, note) => {
    const state = get()
    const existing = state.decisions.find((d) => d.id === id)
    if (!existing) return
    if (existing.answer) return
    const next: DecisionRecord = {
      ...existing,
      answer: { optionId, note, createdAt: Date.now() },
      matched: existing.prediction.optionId === optionId,
    }
    await db.decisions.put(next)
    set({ decisions: state.decisions.map((d) => (d.id === id ? next : d)) })
  },

  saveSimilarity: async (result) => {
    const state = get()
    const row: SimilarityResult = { ...result, id: uid('sim'), createdAt: Date.now() }
    await db.similarities.add(row)
    const similarities = [row, ...state.similarities]
    set({ similarities })
    return row
  },

  restoreVersion: async (versionId) => {
    const state = get()
    const version = state.versions.find((v) => v.id === versionId)
    if (!version) return
    const { profile, doppel, memories } = version.snapshot

    await db.transaction('rw', db.profile, db.memories, db.versions, async () => {
      await db.profile.put(profile)
      await db.memories.clear()
      if (memories.length) await db.memories.bulkAdd(memories)
      await db.versions.add({
        id: uid('ver'),
        label: `restore -> ${version.label}`,
        reason: 'restore',
        snapshot: { profile, doppel, memories },
        createdAt: Date.now(),
      })
    })

    const versions = await db.versions.orderBy('createdAt').reverse().toArray()
    const refreshed = recompute(profile, memories, state.settings.lang)
    set({ profile, memories, doppel: refreshed, versions })
  },

  deleteVersion: async (versionId) => {
    const state = get()
    await db.versions.delete(versionId)
    set({ versions: state.versions.filter((v) => v.id !== versionId) })
  },

  importBackupData: async (raw) => {
    const parsed = parseBackup(raw)
    if (!parsed.ok || !parsed.data) return { ok: false, error: parsed.error }
    const data = parsed.data
    const state = get()

    await db.transaction(
      'rw',
      [db.profile, db.memories, db.conversations, db.decisions, db.similarities, db.versions, db.settings],
      async () => {
        await Promise.all([
          db.memories.clear(),
          db.conversations.clear(),
          db.decisions.clear(),
          db.similarities.clear(),
          db.versions.clear(),
        ])
        await db.profile.put(data.profile)
        if (data.memories.length) await db.memories.bulkAdd(data.memories)
        if (data.conversations.length) await db.conversations.bulkAdd(data.conversations)
        if (data.decisions.length) await db.decisions.bulkAdd(data.decisions)
        if (data.similarities.length) await db.similarities.bulkAdd(data.similarities)
        if (data.versions.length) await db.versions.bulkAdd(data.versions)
        await db.settings.put({
          ...data.settings,
          id: 'settings',
          ai: { ...data.settings.ai, apiKey: state.settings.ai.apiKey, persistKey: state.settings.ai.persistKey },
          updatedAt: Date.now(),
        })
      },
    )

    await get().hydrate()
    return { ok: true }
  },

  wipeAll: async () => {
    await Promise.all([
      db.profile.clear(),
      db.memories.clear(),
      db.conversations.clear(),
      db.decisions.clear(),
      db.similarities.clear(),
      db.versions.clear(),
      db.settings.clear(),
    ])
    const settings = { ...defaultSettings(), lang: get().settings.lang, theme: get().settings.theme }
    await db.settings.put(settings)
    set({
      profile: null,
      doppel: null,
      memories: [],
      conversations: [],
      decisions: [],
      similarities: [],
      versions: [],
      settings,
    })
  },
}))
