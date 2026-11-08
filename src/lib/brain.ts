import type {
  Citation,
  DoppelgangerProfile,
  Interest,
  Lang,
  LocalizedText,
  Memory,
  PrefKey,
  Scenario,
  ScenarioOption,
  Style,
  UserProfile,
} from '../types'
import { clamp } from './cn'
import { PREF_KEYS, interestHits, tokenize } from './profile'

const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'are', 'was', 'were', 'with', 'that', 'this', 'have', 'has', 'had', 'not',
  'but', 'from', 'they', 'them', 'what', 'when', 'which', 'how', 'why', 'who', 'will', 'would', 'should', 'could',
  'about', 'into', 'than', 'then', 'there', 'their', 'been', 'being', 'does', 'did', 'doing', 'can', 'may', 'might',
])

/** Token overlap score between a question and a memory (0..1-ish). */
export function relevance(question: string, memory: Memory): number {
  const qTokens = new Set(tokenize(question).filter((t) => t.length > 1 && !STOPWORDS.has(t)))
  if (qTokens.size === 0) return 0
  const mTokens = new Set(tokenize(`${memory.content} ${memory.tags.join(' ')}`))
  let overlap = 0
  for (const t of qTokens) if (mTokens.has(t)) overlap += 1
  const overlapScore = overlap / qTokens.size
  const qInterests = interestHits(question)
  const mInterests = interestHits(`${memory.content} ${memory.tags.join(' ')}`)
  let interestScore = 0
  for (const k of Object.keys(qInterests) as Interest[]) if (mInterests[k]) interestScore += 0.35
  const importanceBoost = (memory.importance - 3) * 0.04
  return overlapScore + interestScore + importanceBoost
}

export function cite(memory: Memory, lang: Lang): Citation {
  void lang
  const clean = memory.content.replace(/\s+/g, ' ').trim()
  return {
    memoryId: memory.id,
    excerpt: clean.length > 96 ? `${clean.slice(0, 95)}…` : clean,
    category: memory.category,
  }
}

export function selectMemories(question: string, memories: Memory[], limit = 4): { memory: Memory; score: number }[] {
  const scored = memories
    .filter((m) => m.enabled)
    .map((memory) => ({ memory, score: relevance(question, memory) }))
    .filter((x) => x.score > 0.12)
    .sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance)
  return scored.slice(0, limit)
}

const STYLE_OPENERS: Record<Style, LocalizedText> = {
  concise: { zh: '直说。', en: 'Straight answer.' },
  humorous: { zh: '我先猜一下，别急。', en: 'Let me take a swing at this.' },
  rational: { zh: '按你已有的资料推一遍。', en: 'Let me reason from what you already recorded.' },
  emotional: { zh: '我把自己放进你的处境里想了想。', en: 'I tried to sit inside your situation for a moment.' },
  sharp: { zh: '不绕弯子。', en: 'No sugar-coating.' },
  gentle: { zh: '慢一点说。', en: 'Taking this slowly.' },
}

function prefWord(key: PrefKey, value: number, lang: Lang): string {
  const highSide = value >= 0.5
  const strength = Math.abs(value - 0.5) * 2
  const label = strength > 0.5 ? (lang === 'zh' ? '明显' : 'clearly') : lang === 'zh' ? '略偏' : 'slightly'
  const zhMap: Record<PrefKey, [string, string]> = {
    risk: ['愿意承担风险', '更看重确定性'],
    horizon: ['长期布局', '立刻行动'],
    autonomy: ['独立拍板', '倾向讨论'],
    efficiency: ['结果优先', '看重体验'],
    certainty: ['需要确定性', '乐于探索'],
  }
  const enMap: Record<PrefKey, [string, string]> = {
    risk: ['risk-tolerant', 'certainty-seeking'],
    horizon: ['long-horizon', 'immediate-acting'],
    autonomy: ['independent', 'discussion-oriented'],
    efficiency: ['outcome-first', 'experience-first'],
    certainty: ['certainty-needing', 'exploration-friendly'],
  }
  if (lang === 'zh') return `${label}${zhMap[key][highSide ? 0 : 1]}`
  return `${label} ${enMap[key][highSide ? 0 : 1]}`
}

export interface RuleAnswer {
  text: string
  citations: Citation[]
  confidence: number
  insufficient: boolean
}

/**
 * Rule-driven answer. Deterministic for a given (profile, memories, question).
 * Never invents experiences: if nothing matches, it says it does not know.
 */
export function ruleAnswer(
  question: string,
  profile: UserProfile,
  doppel: DoppelgangerProfile,
  memories: Memory[],
  lang: Lang,
): RuleAnswer {
  void profile
  const picked = selectMemories(question, memories, 3)
  const qInterests = interestHits(question)
  const matchedInterests = (Object.keys(qInterests) as Interest[]).filter((i) =>
    doppel.interests.some((s) => s.interest === i),
  )
  const tokenCount = tokenize(question).filter((t) => t.length > 1).length
  const thin = tokenCount < 2

  if (picked.length === 0 && matchedInterests.length === 0) {
    return {
      text:
        lang === 'zh'
          ? '我目前还不了解你在这个问题上的倾向。你的记忆库里没有相关内容，问卷里也没有覆盖到这个方向。如果你愿意，可以在记忆实验室补一条相关经历，我再重新推断。'
          : "I don't yet know your stance on this. Nothing in your memory library or questionnaire covers this direction. Add a related memory in the Memory Lab and I'll re-derive it.",
      citations: [],
      confidence: 0.12,
      insufficient: true,
    }
  }

  const opener = STYLE_OPENERS[doppel.style][lang]
  const lines: string[] = [opener]
  const citations: Citation[] = picked.map((p) => cite(p.memory, lang))

  if (matchedInterests.length > 0) {
    const names = matchedInterests.join(' / ')
    lines.push(
      lang === 'zh'
        ? `你在这类话题上有明确记录：${names}。按你此前的取舍，我倾向于认为你会往这个方向靠。`
        : `You have explicit signals here: ${names}. Given your earlier trade-offs, I lean toward you moving in that direction.`,
    )
  }

  if (picked.length > 0) {
    const top = picked[0].memory
    lines.push(
      lang === 'zh'
        ? `我记得你写过：「${cite(top, 'zh').excerpt}」。这条最贴近当前问题。`
        : `I remember you wrote: “${cite(top, 'en').excerpt}”. That is the closest match to this question.`,
    )
  }

  const strongest = PREF_KEYS.map((k) => ({ k, d: Math.abs(doppel.prefs[k] - 0.5) })).sort((a, b) => b.d - a.d)[0]
  if (strongest && strongest.d > 0.12) {
    lines.push(
      lang === 'zh'
        ? `你的决策偏好里，最突出的是「${prefWord(strongest.k, doppel.prefs[strongest.k], 'zh')}」，这会影响我的判断。`
        : `Your sharpest decision bias is “${prefWord(strongest.k, doppel.prefs[strongest.k], 'en')}”, which shapes my read.`,
    )
  }

  lines.push(
    lang === 'zh'
      ? '以上是基于你提供资料的推测，不是你的真实想法；如果你现在的答案不一样，那说明分身还需要更多资料。'
      : 'This is speculation from your own data, not your actual opinion. If your answer differs, the doppel simply needs more data.',
  )

  const base = 0.24 + picked.length * 0.11 + matchedInterests.length * 0.08 + doppel.confidence * 0.28
  const confidence = clamp(thin ? base * 0.6 : base, 0.1, 0.9)

  return { text: lines.join('\n\n'), citations, confidence, insufficient: false }
}

export interface AskResult {
  judgement: LocalizedText
  sources: Citation[]
  reasoning: LocalizedText
  uncertainty: LocalizedText
  confidence: number
}

export function ruleAsk(question: string, doppel: DoppelgangerProfile, memories: Memory[]): AskResult {
  const picked = selectMemories(question, memories, 3)
  const qInterests = interestHits(question)
  const matched = (Object.keys(qInterests) as Interest[]).filter((i) => doppel.interests.some((s) => s.interest === i))
  const risk = doppel.prefs.risk
  const scenarioLike = /should|whether|if |would|该不该|要不要|如果|会怎么/.test(question.toLowerCase())

  const judgeZh =
    picked.length === 0 && matched.length === 0
      ? '我会说：这个问题我现在还猜不准。没有相关的记忆，也没有覆盖到的兴趣信号。'
      : matched.length > 0
        ? `我会更偏向「行动」，并且方向落在 ${matched.join(' / ')} 上——这是你记录里反复出现的东西。`
        : '我会偏向先小范围试一次，再决定要不要 all-in：你留下的资料里，没有一次性押注的先例。'

  const judgeEn =
    picked.length === 0 && matched.length === 0
      ? "Honestly: I can't guess this one yet. There's no matching memory and no interest signal to anchor on."
      : matched.length > 0
        ? `I would lean toward acting, and the direction sits in ${matched.join(' / ')} — that's what keeps showing up in your record.`
        : 'I would lean toward a small trial first, then decide about going all-in: nothing in your record shows a single-shot bet.'

  const reasonZh = picked.length
    ? `参考了 ${picked.length} 条记忆，加上你的 ${prefWord('risk', risk, 'zh')}与${prefWord(
        'horizon',
        doppel.prefs.horizon,
        'zh',
      )}倾向。`
    : `只基于问卷里的 ${prefWord('risk', risk, 'zh')}与${prefWord('certainty', doppel.prefs.certainty, 'zh')}。`
  const reasonEn = picked.length
    ? `Used ${picked.length} memor${picked.length === 1 ? 'y' : 'ies'}, plus your ${prefWord(
        'risk',
        risk,
        'en',
      )} and ${prefWord('horizon', doppel.prefs.horizon, 'en')} bias.`
    : `Based only on the questionnaire: ${prefWord('risk', risk, 'en')} and ${prefWord(
        'certainty',
        doppel.prefs.certainty,
        'en',
      )}.`

  const uncertaintyZh = scenarioLike
    ? '不确定因素：具体金额、时间压力、可承受的损失上限，以及当时你身边人的意见——这些资料里都没有。'
    : '不确定因素：这个情境的具体约束（时间、钱、关系）在资料里没有记载，所以置信度不高。'
  const uncertaintyEn = scenarioLike
    ? 'Open variables: the exact stakes, time pressure, tolerable loss and who else is involved — none of that is recorded.'
    : 'Open variables: the specific constraints (time, money, relationships) are not in your record, so confidence stays low.'

  const confidence = clamp(
    (picked.length === 0 && matched.length === 0 ? 0.14 : 0.3) +
      picked.length * 0.1 +
      matched.length * 0.07 +
      doppel.confidence * 0.3,
    0.08,
    0.88,
  )

  return {
    judgement: { zh: judgeZh, en: judgeEn },
    sources: picked.map((p) => cite(p.memory, 'zh')),
    reasoning: { zh: reasonZh, en: reasonEn },
    uncertainty: { zh: uncertaintyZh, en: uncertaintyEn },
    confidence,
  }
}

export interface Prediction {
  optionId: string
  rationale: LocalizedText
  confidence: number
  citations: Citation[]
}

export function predictOption(
  scenario: Scenario,
  profile: UserProfile,
  doppel: DoppelgangerProfile,
  memories: Memory[],
  lang: Lang,
): Prediction {
  const scored = scenario.options.map((option) => ({ option, score: scoreOption(option, profile, doppel, memories) }))
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  const second = scored[1]
  if (!best) throw new Error('scenario has no options')
  const margin = second ? best.score - second.score : best.score
  const picked = selectMemories(`${scenario.prompt[lang]} ${best.option.label[lang]}`, memories, 2)

  const confidence = clamp(0.3 + margin * 0.5 + doppel.confidence * 0.25, 0.15, 0.9)
  const rationale: LocalizedText = {
    zh: `在这个情境里，我倾向「${best.option.label.zh}」。依据是你的风险取向（${prefWord(
      'risk',
      doppel.prefs.risk,
      'zh',
    )}）与${prefWord('horizon', doppel.prefs.horizon, 'zh')}，${
      picked.length ? `并参考了 ${picked.length} 条相关记忆。` : '目前没有直接相关的记忆，因此置信度有限。'
    }`,
    en: `I lean toward “${best.option.label.en}”. That follows from your risk profile (${prefWord(
      'risk',
      doppel.prefs.risk,
      'en',
    )}) and ${prefWord('horizon', doppel.prefs.horizon, 'en')}, ${
      picked.length
        ? `plus ${picked.length} related memor${picked.length === 1 ? 'y' : 'ies'}.`
        : 'with no directly related memory, so confidence is limited.'
    }`,
  }

  return { optionId: best.option.id, rationale, confidence, citations: picked.map((p) => cite(p.memory, lang)) }
}

export function scoreOption(
  option: ScenarioOption,
  profile: UserProfile,
  doppel: DoppelgangerProfile,
  memories: Memory[],
): number {
  let score = 0
  for (const [key, target] of Object.entries(option.weights) as [PrefKey, number][]) {
    const current = doppel.prefs[key] ?? 0.5
    score += (1 - Math.abs(current - target)) * 1.2
  }
  for (const kw of option.keywords) {
    const weight = doppel.interests.find((i) => i.interest === kw)?.weight ?? 0
    score += weight * 1.6
    if (profile.interests.includes(kw)) score += 0.25
  }
  const optionHits = interestHits(option.label.en + option.label.zh)
  for (const k of Object.keys(optionHits) as Interest[]) {
    const w = doppel.interests.find((i) => i.interest === k)?.weight ?? 0
    score += w * 0.8
  }
  const memSupport = selectMemories(`${option.label.en} ${option.label.zh}`, memories, 2)
  score += memSupport.reduce((sum, m) => sum + m.score, 0) * 0.35
  return score
}
