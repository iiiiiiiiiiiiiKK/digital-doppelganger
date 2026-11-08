import { describe, expect, it } from 'vitest'
import { deriveDoppelganger, emptyProfile } from '../lib/profile'
import { ruleAnswer, ruleAsk, predictOption, selectMemories } from '../lib/brain'
import { SCENARIOS } from '../data/scenarios'
import type { Memory, UserProfile } from '../types'

function makeProfile(patch: Partial<UserProfile> = {}): UserProfile {
  return {
    ...emptyProfile(),
    nickname: 'Kai',
    bio: '独立开发者，做交易工具。',
    field: 'software',
    occupation: 'indie hacker',
    interests: ['technology', 'finance'],
    style: 'rational',
    prefs: { risk: 0.78, horizon: 0.72, autonomy: 0.8, efficiency: 0.75, certainty: 0.3 },
    ...patch,
  }
}

function makeMemory(content: string, patch: Partial<Memory> = {}): Memory {
  return {
    id: `m_${content.slice(0, 6)}_${Math.random().toString(36).slice(2, 7)}`,
    content,
    category: 'experience',
    source: 'manual',
    importance: 4,
    enabled: true,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...patch,
  }
}

describe('profile derivation', () => {
  it('builds interests and bounded confidence from questionnaire data', () => {
    const profile = makeProfile()
    const doppel = deriveDoppelganger(profile, [], 'zh')
    expect(doppel.interests.length).toBeGreaterThan(0)
    expect(doppel.confidence).toBeGreaterThan(0)
    expect(doppel.confidence).toBeLessThanOrEqual(0.95)
    expect(doppel.summary.zh).toContain('Kai')
    expect(doppel.unknown.length).toBeGreaterThan(0)
  })

  it('raises confidence when memories are added', () => {
    const profile = makeProfile()
    const low = deriveDoppelganger(profile, [], 'zh').confidence
    const memories = [
      makeMemory('我在 2023 年辞职做独立产品，主要做加密交易工具。'),
      makeMemory('我的目标是一年内做到月收入稳定覆盖生活成本。', { category: 'goal' }),
    ]
    const high = deriveDoppelganger(profile, memories, 'zh').confidence
    expect(high).toBeGreaterThan(low)
  })
})

describe('rule engine', () => {
  it('admits it does not know when there is no evidence', () => {
    const profile = makeProfile({ interests: [], bio: '', field: '' })
    const doppel = deriveDoppelganger(profile, [], 'zh')
    const answer = ruleAnswer('量子色动力学里的渐近自由是怎么推导的？', profile, doppel, [], 'zh')
    expect(answer.insufficient).toBe(true)
    expect(answer.citations).toHaveLength(0)
    expect(answer.text).toContain('还不了解')
  })

  it('cites memories and never invents new ones', () => {
    const profile = makeProfile()
    const memories = [makeMemory('我拒绝了那份低薪股权的创业邀请，因为需要稳定现金流。', { category: 'decision' })]
    const doppel = deriveDoppelganger(profile, memories, 'zh')
    const answer = ruleAnswer('有个创业邀请，薪水很低但有股份，我该去吗？', profile, doppel, memories, 'zh')
    expect(answer.citations).toHaveLength(1)
    expect(answer.citations[0].memoryId).toBe(memories[0].id)
    expect(answer.insufficient).toBe(false)
  })

  it('ignores disabled memories entirely', () => {
    const profile = makeProfile()
    const active = makeMemory('我喜欢用 Rust 写交易系统。')
    const paused = makeMemory('我在考虑搬到里斯本生活。', { enabled: false })
    const doppel = deriveDoppelganger(profile, [active, paused], 'zh')
    const picked = selectMemories('里斯本生活怎么样？', [active, paused], 4)
    expect(picked.map((p) => p.memory.id)).not.toContain(paused.id)
    const answer = ruleAsk('我要不要搬到里斯本？', doppel, [active, paused])
    expect(answer.sources.map((s) => s.memoryId)).not.toContain(paused.id)
  })

  it('deleted memories stop being cited', () => {
    const profile = makeProfile()
    const keep = makeMemory('我每天跑步 5 公里。', { category: 'habit' })
    const drop = makeMemory('我最近在读《反脆弱》。', { category: 'interest' })
    const doppel = deriveDoppelganger(profile, [keep, drop], 'zh')
    const before = ruleAsk('我最近在读什么书？', doppel, [keep, drop])
    const after = ruleAsk('我最近在读什么书？', doppel, [keep])
    expect(before.sources.some((s) => s.memoryId === drop.id)).toBe(true)
    expect(after.sources.some((s) => s.memoryId === drop.id)).toBe(false)
  })
})

describe('decision prediction', () => {
  it('produces a stable prediction that does not depend on any user answer', () => {
    const profile = makeProfile()
    const doppel = deriveDoppelganger(profile, [], 'zh')
    const scenario = SCENARIOS.find((s) => s.id === 'sc_startup_offer')
    expect(scenario).toBeDefined()
    if (!scenario) return
    const first = predictOption(scenario, profile, doppel, [], 'zh')
    const second = predictOption(scenario, profile, doppel, [], 'zh')
    expect(first.optionId).toBe(second.optionId)
    expect(scenario.options.some((o) => o.id === first.optionId)).toBe(true)
    expect(first.confidence).toBeGreaterThan(0)
    expect(first.confidence).toBeLessThanOrEqual(0.9)
  })

  it('a risk-tolerant profile and a cautious profile disagree on the all-in bet', () => {
    const bold = makeProfile({ prefs: { risk: 0.95, horizon: 0.5, autonomy: 0.8, efficiency: 0.8, certainty: 0.1 } })
    const safe = makeProfile({ prefs: { risk: 0.05, horizon: 0.5, autonomy: 0.3, efficiency: 0.4, certainty: 0.95 } })
    const scenario = SCENARIOS.find((s) => s.id === 'sc_risk_all_in')
    expect(scenario).toBeDefined()
    if (!scenario) return
    const boldPick = predictOption(scenario, bold, deriveDoppelganger(bold, [], 'zh'), [], 'zh')
    const safePick = predictOption(scenario, safe, deriveDoppelganger(safe, [], 'zh'), [], 'zh')
    expect(boldPick.optionId).not.toBe(safePick.optionId)
  })
})
