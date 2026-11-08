import type {
  DoppelgangerProfile,
  Interest,
  InterestSlice,
  Lang,
  LocalizedText,
  Memory,
  MemoryCategory,
  Prefs,
  PrefKey,
  Style,
  UserProfile,
} from '../types'
import { hash32 } from './id'
import { clamp } from './cn'

export const INTERESTS: Interest[] = [
  'technology',
  'business',
  'finance',
  'art',
  'sports',
  'gaming',
  'reading',
  'travel',
  'other',
]

export const STYLES: Style[] = ['concise', 'humorous', 'rational', 'emotional', 'sharp', 'gentle']

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'experience',
  'interest',
  'work',
  'opinion',
  'goal',
  'habit',
  'decision',
  'other',
]

export const PREF_KEYS: PrefKey[] = ['risk', 'horizon', 'autonomy', 'efficiency', 'certainty']

export const DEFAULT_PREFS: Prefs = {
  risk: 0.5,
  horizon: 0.5,
  autonomy: 0.5,
  efficiency: 0.5,
  certainty: 0.5,
}

export function emptyProfile(): UserProfile {
  return {
    id: 'me',
    nickname: '',
    bio: '',
    field: '',
    occupation: '',
    interests: [],
    style: 'concise',
    prefs: { ...DEFAULT_PREFS },
    updatedAt: Date.now(),
  }
}

/** Keyword → interest mapping used to score memories and free text. */
export const INTEREST_KEYWORDS: Record<Interest, string[]> = {
  technology: [
    'tech', 'code', 'coding', 'program', 'engineer', 'software', 'ai', 'gpu', 'server', '开发', '编程', '技术',
    '代码', '工程', '模型', '算法', '开源',
  ],
  business: [
    'business', 'startup', 'product', 'market', 'growth', 'company', '商业', '创业', '产品', '市场', '公司', '增长',
    '生意',
  ],
  finance: [
    'money', 'invest', 'trading', 'stock', 'crypto', 'fund', 'money', '金融', '投资', '交易', '股票', '加密', '资金',
    '理财', '收入',
  ],
  art: ['art', 'design', 'music', 'film', 'photo', 'write', '艺术', '设计', '音乐', '电影', '摄影', '写作', '创作'],
  sports: ['sport', 'run', 'gym', 'fitness', 'bike', 'swim', '运动', '跑步', '健身', '骑行', '游泳', '球'],
  gaming: ['game', 'gaming', 'steam', 'console', '游戏', '电竞', '主机'],
  reading: ['read', 'book', 'novel', 'essay', '阅读', '读书', '书', '小说', '文章'],
  travel: ['travel', 'trip', 'flight', 'country', 'city', '旅行', '旅游', '出差', '国家', '城市', '签证'],
  other: [],
}

const PREF_KEYWORDS: Record<PrefKey, { high: string[]; low: string[] }> = {
  risk: {
    high: ['risk', 'bet', 'adventure', 'bold', 'gamble', '风险', '冒险', '赌', '激进', '大胆'],
    low: ['safe', 'stable', 'secure', 'steady', '稳', '安全', '保守', '稳定', '确定'],
  },
  horizon: {
    high: ['long-term', 'years', 'plan', 'compound', '长期', '规划', '十年', '积累', '复利'],
    low: ['now', 'today', 'immediate', 'quick', '立刻', '马上', '当下', '短期', '快速'],
  },
  autonomy: {
    high: ['alone', 'myself', 'independent', 'solo', '独立', '自己', '独自', '拍板'],
    low: ['team', 'discuss', 'advice', 'together', '团队', '讨论', '商量', '一起', '建议'],
  },
  efficiency: {
    high: ['efficient', 'result', 'output', 'fast', '效率', '结果', '产出', '快速', '直接'],
    low: ['experience', 'craft', 'enjoy', 'process', '体验', '打磨', '享受', '过程', '细节'],
  },
  certainty: {
    high: ['certain', 'clear', 'known', 'predictable', '确定', '明确', '可控', '计划好'],
    low: ['explore', 'unknown', 'curious', 'try', '探索', '未知', '好奇', '尝试', '新鲜'],
  },
}

export function tokenize(text: string): string[] {
  const lowered = text.toLowerCase()
  const latin = lowered.match(/[a-z][a-z0-9+#.-]{1,}/g) ?? []
  const cjkSeq = lowered.match(/[\u4e00-\u9fff]+/g) ?? []
  const cjkGrams: string[] = []
  for (const seq of cjkSeq) {
    for (let i = 0; i < seq.length; i += 1) {
      cjkGrams.push(seq[i])
      if (i + 1 < seq.length) cjkGrams.push(seq.slice(i, i + 2))
    }
  }
  return [...latin, ...cjkGrams]
}

/** Counts interest keyword hits in free text (question or memory body). */
export function interestHits(text: string): Partial<Record<Interest, number>> {
  const lowered = text.toLowerCase()
  const hits: Partial<Record<Interest, number>> = {}
  for (const interest of INTERESTS) {
    let n = 0
    for (const kw of INTEREST_KEYWORDS[interest]) {
      if (lowered.includes(kw)) n += 1
    }
    if (n > 0) hits[interest] = n
  }
  return hits
}

export function prefHits(text: string): Partial<Record<PrefKey, number>> {
  const lowered = text.toLowerCase()
  const out: Partial<Record<PrefKey, number>> = {}
  for (const key of PREF_KEYS) {
    let n = 0
    for (const kw of PREF_KEYWORDS[key].high) if (lowered.includes(kw)) n += 0.5
    for (const kw of PREF_KEYWORDS[key].low) if (lowered.includes(kw)) n -= 0.5
    if (n !== 0) out[key] = n
  }
  return out
}

const CODENAME_A = ['ORBIT', 'ECHO', 'VECTOR', 'PRISM', 'NOCTIS', 'HELIX', 'LUMEN', 'CIPHER', 'AXIOM', 'QUARTZ']
const CODENAME_B = ['ARCHIVE', 'SIGNAL', 'TRACE', 'MIRROR', 'INDEX', 'PROXY', 'SHARD', 'WITNESS', 'TETHER', 'BLOOM']

export function buildCodename(seedText: string): string {
  const h = hash32(seedText || 'doppel')
  return `${CODENAME_A[h % CODENAME_A.length]}-${CODENAME_B[(h >>> 5) % CODENAME_B.length]}`
}

export function deriveValues(prefs: Prefs, style: Style, lang: Lang): string[] {
  const out: string[] = []
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en)
  if (prefs.risk >= 0.62) out.push(t('机会优先', 'Upside-first'))
  else if (prefs.risk <= 0.38) out.push(t('下行保护', 'Downside protection'))
  if (prefs.horizon >= 0.62) out.push(t('长期主义', 'Long-horizon'))
  else if (prefs.horizon <= 0.38) out.push(t('当下兑现', 'Present payoff'))
  if (prefs.autonomy >= 0.62) out.push(t('独立判断', 'Independent judgment'))
  else if (prefs.autonomy <= 0.38) out.push(t('共识决策', 'Consensus'))
  if (prefs.efficiency >= 0.62) out.push(t('结果导向', 'Outcome-driven'))
  else if (prefs.efficiency <= 0.38) out.push(t('过程/体验', 'Process & craft'))
  if (prefs.certainty >= 0.62) out.push(t('秩序与确定', 'Order & certainty'))
  else if (prefs.certainty <= 0.38) out.push(t('探索未知', 'Exploration'))
  out.push(t(`表达：${style}`, `Voice: ${style}`))
  return out.slice(0, 6)
}

function interestWeights(profile: UserProfile, memories: Memory[]): InterestSlice[] {
  const scores: Partial<Record<Interest, number>> = {}
  for (const i of profile.interests) scores[i] = (scores[i] ?? 0) + 3
  const fieldHits = interestHits(`${profile.field} ${profile.bio}`)
  for (const [k, v] of Object.entries(fieldHits) as [Interest, number][]) {
    scores[k] = (scores[k] ?? 0) + v
  }
  for (const m of memories) {
    if (!m.enabled) continue
    const hits = interestHits(`${m.content} ${m.tags.join(' ')}`)
    const weight = m.importance * 0.4
    for (const [k, v] of Object.entries(hits) as [Interest, number][]) {
      scores[k] = (scores[k] ?? 0) + v * weight
    }
    if (m.category === 'interest') {
      const guessed = INTERESTS.find((i) => i !== 'other' && interestHits(m.content)[i])
      if (guessed) scores[guessed] = (scores[guessed] ?? 0) + 1.5
    }
  }
  const entries = Object.entries(scores) as [Interest, number][]
  if (entries.length === 0) return []
  const total = entries.reduce((sum, [, v]) => sum + v, 0)
  return entries
    .map(([interest, v]) => ({ interest, weight: Number((v / total).toFixed(3)) }))
    .sort((a, b) => b.weight - a.weight)
}

function summarize(profile: UserProfile, memories: Memory[], lang: Lang): LocalizedText {
  const enabled = memories.filter((m) => m.enabled)
  const field = profile.field || (lang === 'zh' ? '未填写领域' : 'unspecified field')
  const occupation = profile.occupation ? (lang === 'zh' ? `，${profile.occupation}` : `, ${profile.occupation}`) : ''
  const interestList = profile.interests.length
    ? profile.interests.slice(0, 3).join(' / ')
    : lang === 'zh'
      ? '尚未标注兴趣'
      : 'no interests tagged'
  const zh = `${profile.nickname || '未命名'}，来自${field}${occupation}。倾向 ${interestList}，表达风格偏 ${
    profile.style
  }。目前持有 ${enabled.length} 条可引用记忆，分身据此推断你的取向，并明确标注推测性质。`
  const en = `${profile.nickname || 'Unnamed'}, working in ${field}${occupation}. Leans toward ${interestList}, with a ${
    profile.style
  } voice. Currently holds ${enabled.length} citable memories, and labels every inference as speculation.`
  return { zh, en }
}

export function deriveDoppelganger(profile: UserProfile, memories: Memory[], lang: Lang): DoppelgangerProfile {
  const enabled = memories.filter((m) => m.enabled)
  const interests = interestWeights(profile, memories)
  const fills = [profile.nickname, profile.bio, profile.field, profile.occupation].filter(Boolean).length
  const known: LocalizedText[] = []
  const unknown: LocalizedText[] = []

  const addKnown = (zh: string, en: string) => known.push({ zh, en })
  const addUnknown = (zh: string, en: string) => unknown.push({ zh, en })

  if (profile.field) addKnown(`领域：${profile.field}`, `Field: ${profile.field}`)
  else addUnknown('所在领域未填写', 'Field not provided')
  if (profile.occupation) addKnown(`身份：${profile.occupation}`, `Role: ${profile.occupation}`)
  if (profile.interests.length) {
    addKnown(`兴趣标签：${profile.interests.join(' / ')}`, `Interest tags: ${profile.interests.join(' / ')}`)
  } else addUnknown('没有任何兴趣标签', 'No interest tags')
  if (profile.bio) addKnown('已填写自我介绍', 'Self introduction provided')
  else addUnknown('缺少自我介绍', 'No self introduction')

  const categories = new Set(enabled.map((m) => m.category))
  if (categories.has('goal')) addKnown('记录了明确目标', 'Explicit goals recorded')
  else addUnknown('没有记录任何目标', 'No goals recorded')
  if (categories.has('decision')) addKnown('记录了过往重要决定', 'Past decisions recorded')
  else addUnknown('没有记录过往重要决定', 'No past decisions recorded')
  if (enabled.length === 0) addUnknown('记忆库为空，所有回答只能基于问卷', 'Memory library empty — answers rely on the questionnaire only')

  const confidence = clamp(
    0.18 +
      fills * 0.06 +
      Math.min(profile.interests.length, 5) * 0.05 +
      Math.min(enabled.length, 8) * 0.055 +
      (categories.size / 8) * 0.12,
    0.1,
    0.95,
  )

  return {
    name: profile.nickname ? `${profile.nickname} · Doppel` : 'Doppelgänger',
    codename: buildCodename(`${profile.nickname}|${profile.field}|${profile.style}`),
    seed: hash32(`${profile.nickname}${profile.bio}${profile.field}`).toString(16),
    summary: summarize(profile, memories, lang),
    interests,
    style: profile.style,
    prefs: profile.prefs,
    values: deriveValues(profile.prefs, profile.style, lang),
    known: known.slice(0, 8),
    unknown: unknown.slice(0, 6),
    confidence,
    derivedAt: Date.now(),
  }
}
