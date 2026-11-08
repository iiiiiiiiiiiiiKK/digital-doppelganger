import type { DecisionCategory, Lang, LocalizedText, Scenario } from '../types'

const t = (zh: string, en: string): LocalizedText => ({ zh, en })

/** Built-in decision scenarios. Predictions are computed against the profile, never against the answer. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'sc_money_three_years',
    category: 'money',
    builtin: true,
    prompt: t(
      '如果现在有一笔够你生活三年的资金，你会怎么做？',
      'If you had enough money to live on for three years, what would you do?',
    ),
    options: [
      {
        id: 'a',
        label: t(
          '把它当作安全垫，继续现在的工作，慢慢试新方向',
          'Use it as a runway, keep the current job, test new directions slowly',
        ),
        weights: { risk: 0.25, horizon: 0.7, certainty: 0.75 },
        keywords: ['business'],
      },
      {
        id: 'b',
        label: t('立刻辞职，全职做一个自己的项目', 'Quit immediately and go full-time on my own project'),
        weights: { risk: 0.85, horizon: 0.75, autonomy: 0.8 },
        keywords: ['business', 'technology'],
      },
      {
        id: 'c',
        label: t('大部分投入市场，用收益换取更多自由', 'Put most of it into markets and buy freedom with the returns'),
        weights: { risk: 0.8, horizon: 0.35, efficiency: 0.8 },
        keywords: ['finance'],
      },
      {
        id: 'd',
        label: t('先不动它，把生活成本压到最低，延长跑道', 'Leave it untouched, cut living costs and extend the runway'),
        weights: { risk: 0.2, horizon: 0.85, certainty: 0.8 },
        keywords: ['finance'],
      },
    ],
  },
  {
    id: 'sc_work_quit',
    category: 'work',
    builtin: true,
    prompt: t('当前的工作让你持续消耗，但收入稳定。你会？', 'Your job drains you but pays reliably. What do you do?'),
    options: [
      {
        id: 'a',
        label: t('先找到下家再走', 'Line up the next job before leaving'),
        weights: { risk: 0.25, certainty: 0.8 },
        keywords: ['business'],
      },
      {
        id: 'b',
        label: t('直接裸辞，休息一段时间', 'Quit with nothing lined up and take a break'),
        weights: { risk: 0.8, horizon: 0.3 },
        keywords: ['other'],
      },
      {
        id: 'c',
        label: t('留下，但把精力转移到副业', 'Stay, but redirect energy into a side project'),
        weights: { risk: 0.5, horizon: 0.7, efficiency: 0.7 },
        keywords: ['business', 'technology'],
      },
    ],
  },
  {
    id: 'sc_startup_offer',
    category: 'startup',
    builtin: true,
    prompt: t(
      '有人邀请你加入一个早期创业项目，给股份但薪水很低。',
      'Someone invites you to join an early startup: equity, low salary.',
    ),
    options: [
      {
        id: 'a',
        label: t('接受，赌一次上行空间', 'Accept — bet on the upside'),
        weights: { risk: 0.9, horizon: 0.85, autonomy: 0.7 },
        keywords: ['business', 'technology'],
      },
      {
        id: 'b',
        label: t('拒绝，稳定收入更重要', 'Decline — stable income matters more'),
        weights: { risk: 0.2, certainty: 0.85 },
        keywords: ['other'],
      },
      {
        id: 'c',
        label: t('兼职参与，先观察三个月', 'Join part-time and watch for three months'),
        weights: { risk: 0.45, horizon: 0.6, efficiency: 0.7 },
        keywords: ['business'],
      },
    ],
  },
  {
    id: 'sc_relationship_borrow',
    category: 'relationship',
    builtin: true,
    prompt: t('一个关系不错的朋友向你借一笔不小的钱。', 'A good friend asks to borrow a significant amount.'),
    options: [
      {
        id: 'a',
        label: t('借，朋友比钱重要', 'Lend it — the friendship outranks the money'),
        weights: { risk: 0.7, efficiency: 0.25 },
        keywords: ['other'],
      },
      {
        id: 'b',
        label: t('不借，但用其他方式帮忙', 'Decline the loan, help another way'),
        weights: { risk: 0.35, certainty: 0.7, efficiency: 0.6 },
        keywords: ['other'],
      },
      {
        id: 'c',
        label: t('借一小部分，说清楚这是上限', 'Lend a fraction and state it is the ceiling'),
        weights: { risk: 0.45, certainty: 0.65, efficiency: 0.7 },
        keywords: ['other'],
      },
    ],
  },
  {
    id: 'sc_time_free_year',
    category: 'time',
    builtin: true,
    prompt: t('如果有一整年的自由时间，你会怎么安排？', 'If you had a whole free year, how would you use it?'),
    options: [
      {
        id: 'a',
        label: t('专注打磨一个作品或产品', 'Focus on shipping one work or product'),
        weights: { risk: 0.6, horizon: 0.85, efficiency: 0.8 },
        keywords: ['business', 'technology', 'art'],
      },
      {
        id: 'b',
        label: t('大量阅读、旅行和体验', 'Read, travel and experience a lot'),
        weights: { risk: 0.55, horizon: 0.4, efficiency: 0.2 },
        keywords: ['reading', 'travel'],
      },
      {
        id: 'c',
        label: t('系统地学习一项硬技能，准备转型', 'Systematically learn a hard skill and pivot'),
        weights: { risk: 0.4, horizon: 0.9, certainty: 0.7 },
        keywords: ['technology', 'reading'],
      },
    ],
  },
  {
    id: 'sc_risk_all_in',
    category: 'risk',
    builtin: true,
    prompt: t(
      '一个机会：七成概率赚三倍，三成概率全部亏光。你投入多少？',
      'A bet: 70% chance to triple, 30% chance to lose it all. How much?',
    ),
    options: [
      {
        id: 'a',
        label: t('全部投入', 'Everything'),
        weights: { risk: 0.95, horizon: 0.5 },
        keywords: ['finance'],
      },
      {
        id: 'b',
        label: t('投一部分可承受损失的钱', 'A slice I can afford to lose'),
        weights: { risk: 0.55, certainty: 0.6, efficiency: 0.7 },
        keywords: ['finance'],
      },
      {
        id: 'c',
        label: t('不参与', 'Pass'),
        weights: { risk: 0.15, certainty: 0.9 },
        keywords: ['finance'],
      },
    ],
  },
  {
    id: 'sc_lifestyle_country',
    category: 'lifestyle',
    builtin: true,
    prompt: t('如果可以选择一个国家长期生活，你会优先考虑什么？', 'Choosing a country to live in long term, what wins?'),
    options: [
      {
        id: 'a',
        label: t('机会与赚钱效率', 'Opportunity and earning power'),
        weights: { risk: 0.65, efficiency: 0.9, horizon: 0.55 },
        keywords: ['business', 'finance'],
      },
      {
        id: 'b',
        label: t('生活节奏与环境质量', 'Pace of life and environment quality'),
        weights: { risk: 0.35, efficiency: 0.25, certainty: 0.6 },
        keywords: ['travel', 'other'],
      },
      {
        id: 'c',
        label: t('文化与创作的氛围', 'Culture and creative atmosphere'),
        weights: { risk: 0.6, efficiency: 0.3 },
        keywords: ['art', 'travel'],
      },
    ],
  },
  {
    id: 'sc_future_ten_years',
    category: 'future',
    builtin: true,
    prompt: t('未来十年只能专注一件事，你会选？', 'If you could focus on only one thing for ten years, what?'),
    options: [
      {
        id: 'a',
        label: t('把自己的专业做到极深', 'Go extremely deep in my craft'),
        weights: { horizon: 0.9, efficiency: 0.8, certainty: 0.6 },
        keywords: ['technology', 'reading'],
      },
      {
        id: 'b',
        label: t('建立一个可持续的生意/资产', 'Build a durable business or asset'),
        weights: { horizon: 0.9, risk: 0.7, autonomy: 0.8 },
        keywords: ['business', 'finance'],
      },
      {
        id: 'c',
        label: t('探索尽可能多的可能，保持开放', 'Stay open and explore as many paths as possible'),
        weights: { horizon: 0.25, risk: 0.75, certainty: 0.2 },
        keywords: ['art', 'travel', 'reading'],
      },
    ],
  },
]

export function scenariosByCategory(category: DecisionCategory | 'all'): Scenario[] {
  return category === 'all' ? SCENARIOS : SCENARIOS.filter((s) => s.category === category)
}

export const CATEGORY_ORDER: DecisionCategory[] = [
  'money',
  'work',
  'startup',
  'relationship',
  'time',
  'risk',
  'lifestyle',
  'future',
]

export function labelFor(scenario: Scenario, id: string, lang: Lang): string {
  return scenario.options.find((o) => o.id === id)?.label[lang] ?? id
}
