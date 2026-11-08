import { useState } from 'react'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { ruleAsk, type AskResult } from '../lib/brain'
import { buildSystemPrompt, callAi } from '../lib/ai'
import { cn, pct } from '../lib/cn'
import { Field, PageHeader, Panel, SectionLabel } from '../components/ui'

const EXAMPLES = [
  { zh: '我应该辞职创业吗？', en: 'Should I quit and start a company?' },
  { zh: '如果朋友向我借钱，我会怎么处理？', en: 'If a friend asked me for a loan, what would I do?' },
  { zh: '如果我有一年的自由时间，我会做什么？', en: 'If I had a free year, what would I do?' },
  { zh: '如果让我选择一个国家长期生活，我会选哪里？', en: 'Which country would I choose to live in?' },
]

interface AiAsk {
  judgement: string
  reasoning: string
  uncertainty: string
}

export function Ask() {
  const { t, lang } = useI18n()
  const profile = useApp((s) => s.profile)
  const doppel = useApp((s) => s.doppel)
  const memories = useApp((s) => s.memories)
  const settings = useApp((s) => s.settings)

  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskResult | null>(null)
  const [aiExtra, setAiExtra] = useState<AiAsk | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'rules' | 'ai'>('rules')

  const aiReady = settings.ai.enabled && settings.ai.baseUrl.trim() !== '' && settings.ai.apiKey.trim() !== ''

  async function run() {
    const q = question.trim()
    if (!q || !profile || !doppel) return
    setBusy(true)
    setError('')
    setAiExtra(null)
    const rules = ruleAsk(q, doppel, memories)
    setResult(rules)
    setMode('rules')

    if (aiReady) {
      const system = buildSystemPrompt(profile, doppel, memories, lang)
      const response = await callAi(settings.ai, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            `SITUATION: ${q}`,
            '',
            'Answer in this exact JSON shape and nothing else:',
            '{"judgement":"...","reasoning":"...","uncertainty":"..."}',
          ].join('\n'),
        },
      ])
      if (response.ok) {
        const parsed = tryParse(response.text)
        if (parsed) {
          setAiExtra(parsed)
          setMode('ai')
        } else {
          setError(lang === 'zh' ? 'AI 返回格式无法解析，已保留本地规则结果。' : 'Could not parse the AI reply; keeping the local result.')
        }
      } else {
        setError(lang === 'zh' ? `AI 请求失败：${response.error}` : `AI request failed: ${response.error}`)
      }
    }
    setBusy(false)
  }

  function tryParse(text: string): AiAsk | null {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      const raw = JSON.parse(match[0]) as Partial<AiAsk>
      if (typeof raw.judgement === 'string' && typeof raw.reasoning === 'string' && typeof raw.uncertainty === 'string') {
        return { judgement: raw.judgement, reasoning: raw.reasoning, uncertainty: raw.uncertainty }
      }
      return null
    } catch {
      return null
    }
  }

  if (!profile || !doppel) return null

  const judgement = aiExtra?.judgement ?? result?.judgement[lang] ?? ''
  const reasoning = aiExtra?.reasoning ?? result?.reasoning[lang] ?? ''
  const uncertainty = aiExtra?.uncertainty ?? result?.uncertainty[lang] ?? ''

  return (
    <div>
      <PageHeader eyebrow={t('nav.ask')} title={t('ask.title')} subtitle={t('ask.subtitle')} />

      <Panel className="mb-4">
        <Field label={t('ask.title')} htmlFor="ask-input">
          <textarea
            id="ask-input"
            className="input min-h-[92px] resize-y"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('ask.placeholder')}
            maxLength={1200}
          />
        </Field>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={busy || question.trim().length < 2}>
            {busy ? t('common.loading') : t('ask.run')}
          </button>
          <span className={cn('chip', mode === 'ai' && result ? 'chip-active' : '')}>
            {mode === 'ai' && result ? t('common.ai') : aiReady ? t('chat.modeAi') : t('common.rules')}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.en}
              type="button"
              className="chip !py-1.5"
              onClick={() => setQuestion(lang === 'zh' ? ex.zh : ex.en)}
            >
              {lang === 'zh' ? ex.zh : ex.en}
            </button>
          ))}
        </div>
      </Panel>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-[rgba(255,120,120,0.4)] px-3 py-2 text-[0.78rem] text-[#ff9c9c]">
          {error}
        </p>
      )}

      {result && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel>
              <SectionLabel right={<span className="mono text-[0.68rem] text-[var(--text-faint)]">{t('common.confidence')} {pct(result.confidence)}</span>}>
                {t('ask.judgement')}
              </SectionLabel>
              <p className="whitespace-pre-wrap text-[0.9rem] leading-relaxed">{judgement}</p>
            </Panel>
            <Panel>
              <SectionLabel>{t('ask.reasoning')}</SectionLabel>
              <p className="whitespace-pre-wrap text-[0.86rem] leading-relaxed text-[var(--text-dim)]">{reasoning}</p>
            </Panel>
            <Panel>
              <SectionLabel>{t('ask.uncertainty')}</SectionLabel>
              <p className="whitespace-pre-wrap text-[0.86rem] leading-relaxed text-[var(--text-dim)]">{uncertainty}</p>
            </Panel>
          </div>
          <Panel>
            <SectionLabel>{t('ask.sources')}</SectionLabel>
            {result.sources.length === 0 ? (
              <p className="text-[0.8rem] text-[var(--text-faint)]">{t('chat.noBasis')}</p>
            ) : (
              <ul className="space-y-2">
                {result.sources.map((c) => (
                  <li key={c.memoryId} className="rounded-lg border border-[var(--border)] px-3 py-2">
                    <p className="mono mb-1 text-[0.62rem] uppercase tracking-[0.12em] text-[var(--accent)]">
                      {t(`memory.category.${c.category}` as DictKey)}
                    </p>
                    <p className="text-[0.78rem] leading-relaxed text-[var(--text-dim)]">{c.excerpt}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
