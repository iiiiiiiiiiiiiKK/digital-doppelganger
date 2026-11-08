import type { BackupBundle, Memory, UserSettings } from '../types'
import { parseBackup } from '../data/schema'

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function defaultSettings(): UserSettings {
  return {
    id: 'settings',
    lang: detectLang(),
    theme: 'dark',
    ai: {
      enabled: false,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      apiKey: '',
      persistKey: false,
      proxyNote: '',
    },
    galleryPublic: false,
    updatedAt: Date.now(),
  }
}

export function detectLang(): 'zh' | 'en' {
  const nav = typeof navigator === 'undefined' ? 'en' : navigator.language
  return nav.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** Converts loose text into structured memory seeds. */
export function splitToMemories(text: string): string[] {
  return text
    .split(/\n{2,}|\r?\n(?=[-*#]|\d+[.)])/)
    .map((chunk) =>
      chunk
        .replace(/^[-*#>\d.)\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((chunk) => chunk.length >= 6)
}

export interface FileImportResult {
  ok: boolean
  memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[]
  error?: string
  count: number
}

const ALLOWED_EXT = ['.txt', '.md', '.markdown', '.json']

/** Reads a user-selected file and turns it into memory rows (validated, no execution). */
export async function readMemoryFile(file: File): Promise<FileImportResult> {
  const lower = file.name.toLowerCase()
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    return { ok: false, memories: [], error: 'unsupported_type', count: 0 }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, memories: [], error: 'file_too_large', count: 0 }
  }
  const text = await file.text()

  if (lower.endsWith('.json')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return { ok: false, memories: [], error: 'invalid_json', count: 0 }
    }
    const result = parseBackup(parsed)
    if (result.ok && result.data) {
      return {
        ok: true,
        count: result.data.memories.length,
        memories: result.data.memories.map((m) => ({
          content: m.content,
          category: m.category,
          source: 'json',
          importance: m.importance,
          enabled: true,
          tags: m.tags,
        })),
      }
    }
    const arr = Array.isArray(parsed) ? parsed : (parsed as { memories?: unknown })?.memories
    if (Array.isArray(arr)) {
      const out: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[] = []
      for (const row of arr) {
        if (typeof row === 'string') {
          out.push({
            content: row.slice(0, 4000),
            category: 'other',
            source: 'json',
            importance: 3,
            enabled: true,
            tags: [],
          })
        } else if (row && typeof row === 'object') {
          const record = row as Record<string, unknown>
          const content = typeof record.content === 'string' ? record.content : typeof record.text === 'string' ? record.text : ''
          if (!content.trim()) continue
          out.push({
            content: content.slice(0, 4000),
            category:
              typeof record.category === 'string' &&
              ['experience', 'interest', 'work', 'opinion', 'goal', 'habit', 'decision', 'other'].includes(record.category)
                ? (record.category as Memory['category'])
                : 'other',
            source: 'json',
            importance: (typeof record.importance === 'number' && record.importance >= 1 && record.importance <= 5 ? Math.round(record.importance) : 3) as Memory['importance'],
            enabled: true,
            tags: Array.isArray(record.tags) ? record.tags.filter((x): x is string => typeof x === 'string').slice(0, 12) : [],
          })
        }
      }
      if (out.length === 0) return { ok: false, memories: [], error: 'no_memories', count: 0 }
      return { ok: true, memories: out, count: out.length }
    }
    return { ok: false, memories: [], error: 'invalid_structure', count: 0 }
  }

  const chunks = splitToMemories(text)
  if (chunks.length === 0) return { ok: false, memories: [], error: 'empty', count: 0 }
  return {
    ok: true,
    count: chunks.length,
    memories: chunks.slice(0, 200).map((chunk) => ({
      content: chunk.slice(0, 4000),
      category: 'other' as const,
      source: lower.endsWith('.json') ? ('json' as const) : lower.endsWith('.md') || lower.endsWith('.markdown') ? ('markdown' as const) : ('txt' as const),
      importance: 3 as const,
      enabled: true,
      tags: [],
    })),
  }
}

export function buildBackup(input: Omit<BackupBundle, 'version' | 'kind' | 'exportedAt'>): BackupBundle {
  return { version: 1, kind: 'doppelganger-backup', exportedAt: Date.now(), ...input }
}

export function readJsonFile(file: File): Promise<unknown> {
  return file.text().then((text) => JSON.parse(text) as unknown)
}
