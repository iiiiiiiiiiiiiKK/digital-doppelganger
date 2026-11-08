import { describe, expect, it } from 'vitest'
import { parseBackup, parseMemoryImport, memorySchema } from '../data/schema'
import { computeSimilarity } from '../lib/similarity'
import { deriveDoppelganger, emptyProfile } from '../lib/profile'
import { splitToMemories } from '../lib/io'
import type { DecisionRecord, Memory } from '../types'

const memory: Memory = {
  id: 'm1',
  content: '我在 2022 年开始做加密交易。',
  category: 'experience',
  source: 'manual',
  importance: 4,
  enabled: true,
  tags: ['crypto'],
  createdAt: 1,
  updatedAt: 1,
}

function baseBackup() {
  return {
    version: 1,
    kind: 'doppelganger-backup',
    exportedAt: Date.now(),
    profile: { ...emptyProfile(), nickname: 'Kai', interests: ['finance'] },
    memories: [memory],
    conversations: [],
    decisions: [],
    similarities: [],
    versions: [],
    settings: {
      id: 'settings',
      lang: 'zh',
      theme: 'dark',
      galleryPublic: false,
      updatedAt: 1,
      ai: {
        enabled: false,
        baseUrl: '',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        persistKey: false,
        proxyNote: '',
      },
    },
  }
}

describe('data validation', () => {
  it('accepts a well-formed backup', () => {
    const result = parseBackup(baseBackup())
    expect(result.ok).toBe(true)
  })

  it('rejects a backup with a broken memory row', () => {
    const broken = baseBackup()
    // @ts-expect-error intentionally invalid payload
    broken.memories = [{ id: 'x' }]
    const result = parseBackup(broken)
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects unknown enum values instead of silently coercing', () => {
    const bad = { ...memory, category: 'not-a-category' }
    expect(memorySchema.safeParse(bad).success).toBe(false)
  })

  it('parses a memories array import', () => {
    const result = parseMemoryImport([memory])
    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('splits plain text into memory chunks', () => {
    const chunks = splitToMemories('第一段经历，内容足够长。\n\n第二段观点，也不短。\n\n短')
    expect(chunks.length).toBe(2)
  })
})

describe('similarity', () => {
  it('returns zeros with no answered decisions', () => {
    const profile = { ...emptyProfile(), nickname: 'Kai', interests: ['finance' as const] }
    const doppel = deriveDoppelganger(profile, [], 'zh')
    const result = computeSimilarity([], profile, doppel, [], [])
    expect(result.result.decisionMatch).toBe(0)
    expect(result.result.overall).toBe(0)
    expect(result.available.decision).toBe(false)
  })

  it('counts matching predictions as a decision match', () => {
    const profile = { ...emptyProfile(), nickname: 'Kai', interests: ['finance' as const] }
    const doppel = deriveDoppelganger(profile, [memory], 'zh')
    const record: DecisionRecord = {
      id: 'd1',
      scenarioId: 'sc_risk_all_in',
      category: 'risk',
      prompt: { zh: '情境', en: 'scenario' },
      optionIds: ['a', 'b', 'c'],
      prediction: {
        optionId: 'b',
        rationale: { zh: '理由', en: 'reason' },
        confidence: 0.5,
        citations: [],
        profileVersionId: null,
        memoryCount: 1,
        createdAt: 1,
      },
      answer: { optionId: 'b', note: '', createdAt: 2 },
      matched: true,
    }
    const result = computeSimilarity([record], profile, doppel, [memory], [])
    expect(result.result.decisionMatch).toBe(1)
    expect(result.available.decision).toBe(true)
  })
})
