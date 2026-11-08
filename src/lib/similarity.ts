import type {
  DecisionRecord,
  DoppelgangerProfile,
  Interest,
  Memory,
  PrefKey,
  SimilarityResult,
  Style,
  UserProfile,
} from '../types'
import { clamp } from './cn'
import { SCENARIOS } from '../data/scenarios'

export interface StyleSignature {
  avgLength: number
  exclaim: number
  question: number
  emoji: number
  firstPerson: number
}

const STYLE_TARGETS: Record<Style, StyleSignature> = {
  concise: { avgLength: 28, exclaim: 0, question: 0.05, emoji: 0, firstPerson: 0.15 },
  humorous: { avgLength: 55, exclaim: 0.35, question: 0.2, emoji: 0.3, firstPerson: 0.3 },
  rational: { avgLength: 110, exclaim: 0.02, question: 0.12, emoji: 0, firstPerson: 0.2 },
  emotional: { avgLength: 80, exclaim: 0.3, question: 0.25, emoji: 0.35, firstPerson: 0.45 },
  sharp: { avgLength: 45, exclaim: 0.15, question: 0.1, emoji: 0.02, firstPerson: 0.2 },
  gentle: { avgLength: 95, exclaim: 0.03, question: 0.2, emoji: 0.05, firstPerson: 0.35 },
}

export function styleSignature(texts: string[]): StyleSignature | null {
  const samples = texts.map((t) => t.trim()).filter((t) => t.length > 3)
  if (samples.length === 0) return null
  const joined = samples.join('\n')
  const chars = joined.length
  const exclaim = (joined.match(/[!！]/g)?.length ?? 0) / Math.max(samples.length, 1)
  const question = (joined.match(/[?？]/g)?.length ?? 0) / Math.max(samples.length, 1)
  const emoji =
    (joined.match(/[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/gu)?.length ?? 0) / Math.max(samples.length, 1)
  const firstPerson =
    ((joined.match(/\b(i|me|my|mine)\b/gi)?.length ?? 0) + (joined.match(/我/g)?.length ?? 0)) /
    Math.max(chars / 20, 1)
  return {
    avgLength: chars / samples.length,
    exclaim: clamp(exclaim, 0, 1),
    question: clamp(question, 0, 1),
    emoji: clamp(emoji, 0, 1),
    firstPerson: clamp(firstPerson, 0, 1),
  }
}

function signatureDistance(a: StyleSignature, b: StyleSignature): number {
  const norm = (x: number, scale: number) => clamp(x / scale, 0, 1)
  const parts = [
    Math.abs(norm(a.avgLength, 160) - norm(b.avgLength, 160)),
    Math.abs(a.exclaim - b.exclaim),
    Math.abs(a.question - b.question),
    Math.abs(a.emoji - b.emoji),
    Math.abs(a.firstPerson - b.firstPerson),
  ]
  return parts.reduce((s, v) => s + v, 0) / parts.length
}

/** How close the user's own writing is to the voice the doppel assumes. */
export function styleMatchFrom(texts: string[], style: Style): number | null {
  const sig = styleSignature(texts)
  if (!sig) return null
  return clamp(1 - signatureDistance(sig, STYLE_TARGETS[style]) * 1.6, 0, 1)
}

export function interestMatchFrom(decisions: DecisionRecord[], doppel: DoppelgangerProfile): number | null {
  const answered = decisions.filter((d) => d.answer)
  if (answered.length === 0) return null
  const implied = new Set<Interest>()
  for (const record of answered) {
    const scenario = SCENARIOS.find((s) => s.id === record.scenarioId)
    if (!scenario || !record.answer) continue
    const option = scenario.options.find((o) => o.id === record.answer?.optionId)
    for (const kw of option?.keywords ?? []) implied.add(kw)
  }
  if (implied.size === 0) return null
  const strong = new Set(doppel.interests.filter((i) => i.weight >= 0.12).map((i) => i.interest))
  let hit = 0
  for (const i of implied) if (strong.has(i)) hit += 1
  return clamp(hit / implied.size, 0, 1)
}

export function valueMatchFrom(decisions: DecisionRecord[], profile: UserProfile): number | null {
  const answered = decisions.filter((d) => d.answer)
  if (answered.length === 0) return null
  const sums: Partial<Record<PrefKey, { total: number; n: number }>> = {}
  for (const record of answered) {
    const scenario = SCENARIOS.find((s) => s.id === record.scenarioId)
    if (!scenario || !record.answer) continue
    const option = scenario.options.find((o) => o.id === record.answer?.optionId)
    for (const [key, target] of Object.entries(option?.weights ?? {}) as [PrefKey, number][]) {
      const bucket = sums[key] ?? { total: 0, n: 0 }
      bucket.total += target
      bucket.n += 1
      sums[key] = bucket
    }
  }
  const entries = Object.entries(sums) as [PrefKey, { total: number; n: number }][]
  if (entries.length === 0) return null
  let acc = 0
  for (const [key, bucket] of entries) {
    const implied = bucket.total / bucket.n
    acc += 1 - Math.abs(implied - profile.prefs[key])
  }
  return clamp(acc / entries.length, 0, 1)
}

export function decisionMatchFrom(decisions: DecisionRecord[]): number | null {
  const answered = decisions.filter((d) => d.answer && d.matched !== null)
  if (answered.length === 0) return null
  const hits = answered.filter((d) => d.matched).length
  return clamp(hits / answered.length, 0, 1)
}

export interface SimilarityComputation {
  result: Omit<SimilarityResult, 'id' | 'createdAt'>
  available: { decision: boolean; interest: boolean; style: boolean; value: boolean }
}

export function computeSimilarity(
  decisions: DecisionRecord[],
  profile: UserProfile,
  doppel: DoppelgangerProfile,
  memories: Memory[],
  userTexts: string[],
): SimilarityComputation {
  const decision = decisionMatchFrom(decisions)
  const interest = interestMatchFrom(decisions, doppel)
  const value = valueMatchFrom(decisions, profile)
  const styleTexts = [...userTexts, ...memories.filter((m) => m.enabled).map((m) => m.content)]
  const style = styleMatchFrom(styleTexts, doppel.style)

  const dims = [decision, interest, value, style].filter((v): v is number => v !== null)
  const overall = dims.length ? clamp(dims.reduce((s, v) => s + v, 0) / dims.length, 0, 1) : 0

  return {
    result: {
      decisionMatch: decision ?? 0,
      interestMatch: interest ?? 0,
      styleMatch: style ?? 0,
      valueMatch: value ?? 0,
      overall,
      sampleSize: decisions.filter((d) => d.answer).length + styleTexts.length,
    },
    available: {
      decision: decision !== null,
      interest: interest !== null,
      style: style !== null,
      value: value !== null,
    },
  }
}
