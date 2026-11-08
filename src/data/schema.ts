import { z } from 'zod'

const langText = z.object({ zh: z.string(), en: z.string() })

export const interestSchema = z.enum([
  'technology',
  'business',
  'finance',
  'art',
  'sports',
  'gaming',
  'reading',
  'travel',
  'other',
])

export const styleSchema = z.enum(['concise', 'humorous', 'rational', 'emotional', 'sharp', 'gentle'])

export const memoryCategorySchema = z.enum([
  'experience',
  'interest',
  'work',
  'opinion',
  'goal',
  'habit',
  'decision',
  'other',
])

export const decisionCategorySchema = z.enum([
  'money',
  'work',
  'startup',
  'relationship',
  'time',
  'risk',
  'lifestyle',
  'future',
])

export const prefsSchema = z.object({
  risk: z.number().min(0).max(1),
  horizon: z.number().min(0).max(1),
  autonomy: z.number().min(0).max(1),
  efficiency: z.number().min(0).max(1),
  certainty: z.number().min(0).max(1),
})

export const userProfileSchema = z.object({
  id: z.literal('me'),
  nickname: z.string().min(1).max(60),
  bio: z.string().max(600),
  field: z.string().max(80),
  occupation: z.string().max(80),
  interests: z.array(interestSchema).max(9),
  style: styleSchema,
  prefs: prefsSchema,
  updatedAt: z.number(),
})

export const interestSliceSchema = z.object({ interest: interestSchema, weight: z.number() })

export const doppelProfileSchema = z.object({
  name: z.string(),
  codename: z.string(),
  seed: z.string(),
  summary: langText,
  interests: z.array(interestSliceSchema),
  style: styleSchema,
  prefs: prefsSchema,
  values: z.array(z.string()),
  known: z.array(langText),
  unknown: z.array(langText),
  confidence: z.number().min(0).max(1),
  derivedAt: z.number(),
})

export const memorySchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).max(4000),
  category: memoryCategorySchema,
  source: z.enum(['manual', 'txt', 'markdown', 'json', 'seed']),
  importance: z.number().int().min(1).max(5),
  enabled: z.boolean(),
  tags: z.array(z.string()).max(12),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const citationSchema = z.object({
  memoryId: z.string(),
  excerpt: z.string(),
  category: memoryCategorySchema,
})

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'doppel']),
  text: z.string(),
  citations: z.array(citationSchema),
  confidence: z.number().min(0).max(1),
  mode: z.enum(['rules', 'ai']),
  createdAt: z.number(),
  error: z.string().optional(),
})

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(chatMessageSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const scenarioOptionSchema = z.object({
  id: z.string(),
  label: langText,
  weights: z.record(z.number()).optional().default({}),
  keywords: z.array(interestSchema),
})

export const scenarioSchema = z.object({
  id: z.string(),
  category: decisionCategorySchema,
  prompt: langText,
  options: z.array(scenarioOptionSchema).min(2),
  builtin: z.boolean(),
})

export const decisionOptionLabelsSchema = z.array(langText)

export const decisionRecordSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  category: decisionCategorySchema,
  prompt: langText,
  optionIds: z.array(z.string()),
  optionLabels: decisionOptionLabelsSchema.optional(),
  prediction: z.object({
    optionId: z.string(),
    rationale: langText,
    confidence: z.number().min(0).max(1),
    citations: z.array(citationSchema),
    profileVersionId: z.string().nullable(),
    memoryCount: z.number(),
    createdAt: z.number(),
  }),
  answer: z
    .object({ optionId: z.string(), note: z.string(), createdAt: z.number() })
    .nullable(),
  matched: z.boolean().nullable(),
})

export const similaritySchema = z.object({
  id: z.string(),
  decisionMatch: z.number(),
  interestMatch: z.number(),
  styleMatch: z.number(),
  valueMatch: z.number(),
  overall: z.number(),
  sampleSize: z.number(),
  createdAt: z.number(),
})

export const snapshotSchema = z.object({
  profile: userProfileSchema,
  doppel: doppelProfileSchema,
  memories: z.array(memorySchema),
})

export const profileVersionSchema = z.object({
  id: z.string(),
  label: z.string(),
  reason: z.enum(['create', 'edit', 'memory', 'restore', 'import']),
  snapshot: snapshotSchema,
  createdAt: z.number(),
})

export const aiConfigSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().url().or(z.literal('')),
  model: z.string(),
  temperature: z.number().min(0).max(2),
  apiKey: z.string(),
  persistKey: z.boolean(),
  proxyNote: z.string(),
})

export const settingsSchema = z.object({
  id: z.literal('settings'),
  lang: z.enum(['zh', 'en']),
  theme: z.enum(['dark', 'light']),
  ai: aiConfigSchema,
  galleryPublic: z.boolean(),
  updatedAt: z.number(),
})

export const publicCardSchema = z.object({
  version: z.literal(1),
  kind: z.literal('doppelganger-public-card'),
  exportedAt: z.number(),
  name: z.string(),
  codename: z.string(),
  summary: langText,
  interests: z.array(interestSliceSchema),
  style: styleSchema,
  values: z.array(z.string()),
  publicMemories: z.array(z.object({ content: z.string(), category: memoryCategorySchema })),
  score: z.number().nullable(),
})

export const backupSchema = z.object({
  version: z.literal(1),
  kind: z.literal('doppelganger-backup'),
  exportedAt: z.number(),
  profile: userProfileSchema,
  memories: z.array(memorySchema),
  conversations: z.array(conversationSchema),
  decisions: z.array(decisionRecordSchema),
  similarities: z.array(similaritySchema),
  versions: z.array(profileVersionSchema),
  settings: settingsSchema.omit({ ai: true }).extend({ ai: aiConfigSchema.omit({ apiKey: true }) }),
})

export type BackupInput = z.infer<typeof backupSchema>

export interface ParseResult<T> {
  ok: boolean
  data?: T
  error?: string
}

/** Validates an arbitrary parsed JSON value against the backup contract. */
export function parseBackup(value: unknown): ParseResult<BackupInput> {
  const result = backupSchema.safeParse(value)
  if (!result.success) {
    const first = result.error.issues[0]
    return {
      ok: false,
      error: first ? `${first.path.join('.') || 'root'}: ${first.message}` : 'invalid data structure',
    }
  }
  return { ok: true, data: result.data }
}

/** Memories-only import (array or { memories: [...] }). */
export function parseMemoryImport(value: unknown): ParseResult<z.infer<typeof memorySchema>[]> {
  const raw = Array.isArray(value) ? value : (value as { memories?: unknown })?.memories
  if (!Array.isArray(raw)) return { ok: false, error: 'expected an array of memories' }
  const out: z.infer<typeof memorySchema>[] = []
  for (let i = 0; i < raw.length; i += 1) {
    const parsed = memorySchema.safeParse(raw[i])
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return { ok: false, error: `memory[${i}] ${first?.path.join('.') ?? ''}: ${first?.message ?? 'invalid'}` }
    }
    out.push(parsed.data)
  }
  return { ok: true, data: out }
}
