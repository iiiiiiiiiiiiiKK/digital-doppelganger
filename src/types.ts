export type Lang = 'zh' | 'en'
export type Theme = 'dark' | 'light'

export type Interest =
  | 'technology'
  | 'business'
  | 'finance'
  | 'art'
  | 'sports'
  | 'gaming'
  | 'reading'
  | 'travel'
  | 'other'

export type Style = 'concise' | 'humorous' | 'rational' | 'emotional' | 'sharp' | 'gentle'

export type MemoryCategory =
  | 'experience'
  | 'interest'
  | 'work'
  | 'opinion'
  | 'goal'
  | 'habit'
  | 'decision'
  | 'other'

export type DecisionCategory =
  | 'money'
  | 'work'
  | 'startup'
  | 'relationship'
  | 'time'
  | 'risk'
  | 'lifestyle'
  | 'future'

export type PrefKey = 'risk' | 'horizon' | 'autonomy' | 'efficiency' | 'certainty'

export type Prefs = Record<PrefKey, number>

export interface LocalizedText {
  zh: string
  en: string
}

export interface UserProfile {
  id: 'me'
  nickname: string
  bio: string
  field: string
  occupation: string
  interests: Interest[]
  style: Style
  prefs: Prefs
  updatedAt: number
}

export interface InterestSlice {
  interest: Interest
  weight: number
}

export interface DoppelgangerProfile {
  name: string
  codename: string
  seed: string
  summary: LocalizedText
  interests: InterestSlice[]
  style: Style
  prefs: Prefs
  values: string[]
  known: LocalizedText[]
  unknown: LocalizedText[]
  confidence: number
  derivedAt: number
}

export interface Memory {
  id: string
  content: string
  category: MemoryCategory
  source: 'manual' | 'txt' | 'markdown' | 'json' | 'seed'
  /** Integer 1-5, enforced by the Zod schema on import. */
  importance: number
  enabled: boolean
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Citation {
  memoryId: string
  excerpt: string
  category: MemoryCategory
}

export type ChatRole = 'user' | 'doppel'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  citations: Citation[]
  confidence: number
  mode: 'rules' | 'ai'
  createdAt: number
  error?: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface ScenarioOption {
  id: string
  label: LocalizedText
  weights: Partial<Prefs>
  keywords: Interest[]
}

export interface Scenario {
  id: string
  category: DecisionCategory
  prompt: LocalizedText
  options: ScenarioOption[]
  builtin: boolean
}

export interface DecisionRecord {
  id: string
  scenarioId: string
  category: DecisionCategory
  prompt: LocalizedText
  optionIds: string[]
  /** Present for user-created scenarios so history renders without the built-in catalogue. */
  optionLabels?: LocalizedText[]
  /** Locked before the user's own answer is revealed. Never recomputed afterwards. */
  prediction: {
    optionId: string
    rationale: LocalizedText
    confidence: number
    citations: Citation[]
    profileVersionId: string | null
    memoryCount: number
    createdAt: number
  }
  answer: {
    optionId: string
    note: string
    createdAt: number
  } | null
  matched: boolean | null
}

export interface SimilarityResult {
  id: string
  decisionMatch: number
  interestMatch: number
  styleMatch: number
  valueMatch: number
  overall: number
  sampleSize: number
  createdAt: number
}

export interface ProfileSnapshot {
  profile: UserProfile
  doppel: DoppelgangerProfile
  memories: Memory[]
}

export interface ProfileVersion {
  id: string
  label: string
  reason: 'create' | 'edit' | 'memory' | 'restore' | 'import'
  snapshot: ProfileSnapshot
  createdAt: number
}

export interface AiConfig {
  enabled: boolean
  baseUrl: string
  model: string
  temperature: number
  /** Only kept in memory unless the user explicitly chooses device persistence. */
  apiKey: string
  persistKey: boolean
  proxyNote: string
}

export interface UserSettings {
  id: 'settings'
  lang: Lang
  theme: Theme
  ai: AiConfig
  galleryPublic: boolean
  updatedAt: number
}

export interface PublicCard {
  version: 1
  kind: 'doppelganger-public-card'
  exportedAt: number
  name: string
  codename: string
  summary: LocalizedText
  interests: InterestSlice[]
  style: Style
  values: string[]
  publicMemories: { content: string; category: MemoryCategory }[]
  score: number | null
}

export interface BackupBundle {
  version: 1
  kind: 'doppelganger-backup'
  exportedAt: number
  profile: UserProfile
  memories: Memory[]
  conversations: Conversation[]
  decisions: DecisionRecord[]
  similarities: SimilarityResult[]
  versions: ProfileVersion[]
  settings: Omit<UserSettings, 'ai'> & { ai: Omit<AiConfig, 'apiKey'> }
}
