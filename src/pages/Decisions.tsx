import { useMemo, useState } from 'react'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { CATEGORY_ORDER, SCENARIOS, labelFor } from '../data/scenarios'
import { predictOption } from '../lib/brain'
import { uid } from '../lib/id'
import { cn, formatDate, pct } from '../lib/cn'
import { ConfirmButton, EmptyState, Field, PageHeader, Panel, SectionLabel } from '../components/ui'
import type { DecisionCategory, DecisionRecord, LocalizedText, Scenario } from '../types'

export function Decisions() {
  const { t, lang, tl } = useI18n()
  const profile = useApp((s) => s.profile)
  const doppel = useApp((s) => s.doppel)
  const memories = useApp((s) => s.memories)
  const decisions = useApp((s) => s.decisions)
  const versions = useApp((s) => s.versions)
  const saveDecision = useApp((s) => s.saveDecision)
  const answerDecision = useApp((s) => s.answerDecision)
  const setNotice = useApp((s) => s.setNotice)

  const [category, setCategory] = useState<DecisionCategory | 'all'>('all')
  const [active, setActive] = useState<DecisionRecord | null>(null)
  const [choice, setChoice] = useState('')
  const [note, setNote] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState({ prompt: '', a: '', b: '' })

  const list = useMemo(
    () => (category === 'all' ? SCENARIOS : SCENARIOS.filter((s) => s.category === category)),
    [category],
  )

  if (!profile || !doppel) return null

  const me = profile
  const dg = doppel

  /** Locks the prediction and stores it BEFORE the user selects anything. */
  async function startScenario(scenario: Scenario) {
    const prediction = predictOption(scenario, me, dg, memories, lang)
    const record: DecisionRecord = {
      id: uid('dec'),
      scenarioId: scenario.id,
      category: scenario.category,
      prompt: scenario.prompt,
      optionIds: scenario.options.map((o) => o.id),
      optionLabels: scenario.options.map((o) => o.label),
      prediction: {
        optionId: prediction.optionId,
        rationale: prediction.rationale,
        confidence: prediction.confidence,
        citations: prediction.citations,
        profileVersionId: versions[0]?.id ?? null,
        memoryCount: memories.filter((m) => m.enabled).length,
        createdAt: Date.now(),
      },
      answer: null,
      matched: null,
    }
    await saveDecision(record)
    setActive(record)
    setChoice('')
    setNote('')
  }

  async function startCustom() {
    const prompt = custom.prompt.trim()
    const a = custom.a.trim()
    const b = custom.b.trim()
    if (!prompt || !a || !b) return
    const scenario: Scenario = {
      id: uid('custom'),
      category: 'future',
      builtin: false,
      prompt: { zh: prompt, en: prompt },
      options: [
        {
          id: 'a',
          label: { zh: a, en: a },
          weights: { risk: 0.4, horizon: 0.6 },
          keywords: [],
        },
        {
          id: 'b',
          label: { zh: b, en: b },
          weights: { risk: 0.7, horizon: 0.4 },
          keywords: [],
        },
      ],
    }
    setCustomOpen(false)
    setCustom({ prompt: '', a: '', b: '' })
    await startScenario(scenario)
  }

  async function submitAnswer() {
    if (!active || !choice) return
    await answerDecision(active.id, choice, note.trim())
    const refreshed = useApp.getState().decisions.find((d) => d.id === active.id) ?? null
    setActive(refreshed)
    setNotice({ kind: 'ok', text: t('common.saved') })
  }

  function optionLabel(record: DecisionRecord, id: string): string {
    if (record.optionLabels) {
      const idx = record.optionIds.indexOf(id)
      const label = record.optionLabels[idx] as LocalizedText | undefined
      if (label) return lang === 'zh' ? label.zh : label.en
    }
    const builtin = SCENARIOS.find((s) => s.id === record.scenarioId)
    if (builtin) return labelFor(builtin, id, lang)
    return id
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.decisions')}
        title={t('decision.title')}
        subtitle={t('decision.subtitle')}
        actions={
          <button type="button" className="btn" onClick={() => setCustomOpen((v) => !v)}>
            {t('decision.custom')}
          </button>
        }
      />

      {customOpen && (
        <Panel className="mb-4">
          <SectionLabel>{t('decision.addCustom')}</SectionLabel>
          <div className="space-y-3">
            <Field label={t('decision.custom')} required htmlFor="dc-prompt">
              <input
                id="dc-prompt"
                className="input"
                value={custom.prompt}
                onChange={(e) => setCustom((c) => ({ ...c, prompt: e.target.value }))}
                placeholder={t('decision.customPh')}
                maxLength={200}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('decision.optionA')} required htmlFor="dc-a">
                <input
                  id="dc-a"
                  className="input"
                  value={custom.a}
                  onChange={(e) => setCustom((c) => ({ ...c, a: e.target.value }))}
                  maxLength={160}
                />
              </Field>
              <Field label={t('decision.optionB')} required htmlFor="dc-b">
                <input
                  id="dc-b"
                  className="input"
                  value={custom.b}
                  onChange={(e) => setCustom((c) => ({ ...c, b: e.target.value }))}
                  maxLength={160}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setCustomOpen(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void startCustom()}
                disabled={!custom.prompt.trim() || !custom.a.trim() || !custom.b.trim()}
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {active ? (
        <Panel className="mb-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="chip chip-active">{t('decision.locked')}</span>
            <span className="mono text-[0.64rem] uppercase tracking-[0.12em] text-[var(--text-faint)]">
              {t('common.confidence')} {pct(active.prediction.confidence)} · {formatDate(active.prediction.createdAt, lang)}
            </span>
          </div>
          <h2 className="mb-1 font-display text-[1.05rem] font-semibold leading-snug">{tl(active.prompt)}</h2>
          <p className="mb-4 text-[0.74rem] text-[var(--text-faint)]">{t('decision.lockedHint')}</p>

          {!active.answer ? (
            <div className="space-y-3">
              <p className="label-xs">{t('decision.yourAnswer')}</p>
              <div className="space-y-1.5">
                {active.optionIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setChoice(id)}
                    aria-pressed={choice === id}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-[0.85rem] leading-relaxed transition-colors',
                      choice === id
                        ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mono mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0.6rem]',
                        choice === id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border-strong)] text-transparent',
                      )}
                    >
                      {choice === id ? '●' : ''}
                    </span>
                    <span>{optionLabel(active, id)}</span>
                  </button>
                ))}
              </div>
              <Field label={t('decision.note')} htmlFor="dc-note">
                <input
                  id="dc-note"
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setActive(null)}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void submitAnswer()} disabled={!choice}>
                  {t('decision.submit')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={cn(
                  'rounded-xl border px-4 py-3',
                  active.matched
                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
                    : 'border-[var(--ember)] bg-[color-mix(in_srgb,var(--ember)_10%,transparent)]',
                )}
              >
                <p className="font-display text-[1rem] font-semibold">
                  {active.matched ? `✓ ${t('decision.match')}` : `✕ ${t('decision.mismatch')}`}
                </p>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                  <dt className="label-xs mb-1">{t('decision.yourAnswer')}</dt>
                  <dd className="text-[0.82rem] leading-relaxed">{optionLabel(active, active.answer.optionId)}</dd>
                </div>
                <div className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                  <dt className="label-xs mb-1">{t('decision.locked')}</dt>
                  <dd className="text-[0.82rem] leading-relaxed">{optionLabel(active, active.prediction.optionId)}</dd>
                </div>
              </dl>
              {active.answer.note && (
                <p className="text-[0.76rem] text-[var(--text-faint)]">“{active.answer.note}”</p>
              )}
              <div className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                <p className="label-xs mb-1">{t('decision.rationale')}</p>
                <p className="text-[0.8rem] leading-relaxed text-[var(--text-dim)]">{tl(active.prediction.rationale)}</p>
                {active.prediction.citations.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {active.prediction.citations.map((c) => (
                      <li key={c.memoryId} className="text-[0.72rem] leading-snug text-[var(--text-faint)]">
                        · {c.excerpt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn" onClick={() => setActive(null)}>
                  {t('decision.newRound')}
                </button>
              </div>
            </div>
          )}
        </Panel>
      ) : null}

      <Panel className="mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={cn('chip whitespace-nowrap', category === 'all' && 'chip-active')}
          >
            {t('common.all')}
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn('chip whitespace-nowrap', category === c && 'chip-active')}
            >
              {t(`decision.category.${c}` as DictKey)}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {list.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => void startScenario(scenario)}
            className="surface group p-4 text-left transition-colors hover:border-[var(--accent)]"
          >
            <span className="chip !px-2 !py-0.5 !text-[0.64rem]">{t(`decision.category.${scenario.category}` as DictKey)}</span>
            <p className="mt-2 text-[0.88rem] font-medium leading-snug">{tl(scenario.prompt)}</p>
            <p className="mt-1.5 text-[0.72rem] text-[var(--text-faint)]">
              {scenario.options.length} {t('common.items')} · {t('common.confidence')} →
            </p>
          </button>
        ))}
      </div>

      <section className="mt-6">
        <SectionLabel right={<span className="mono text-[0.68rem] text-[var(--text-faint)]">{decisions.length}</span>}>
          {t('decision.history')}
        </SectionLabel>
        {decisions.length === 0 ? (
          <EmptyState title={t('decision.noHistory')} />
        ) : (
          <ul className="space-y-2">
            {decisions.map((record) => (
              <li key={record.id} className="surface p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip !px-2 !py-0.5 !text-[0.64rem]">
                    {t(`decision.category.${record.category}` as DictKey)}
                  </span>
                  {record.answer ? (
                    <span
                      className={cn(
                        'mono text-[0.64rem] uppercase tracking-[0.12em]',
                        record.matched ? 'text-[var(--accent)]' : 'text-[var(--ember)]',
                      )}
                    >
                      {record.matched ? t('decision.match') : t('decision.mismatch')}
                    </span>
                  ) : (
                    <span className="mono text-[0.64rem] uppercase tracking-[0.12em] text-[var(--text-faint)]">
                      {t('decision.locked')}
                    </span>
                  )}
                  <span className="mono ml-auto text-[0.62rem] text-[var(--text-faint)]">
                    {formatDate(record.prediction.createdAt, lang)}
                  </span>
                  <ConfirmButton
                    onConfirm={async () => {
                      await useApp.getState().saveDecision({ ...record })
                      setActive(record)
                    }}
                    className="!min-h-7 text-[0.68rem]"
                    ariaLabel={t('common.edit')}
                  >
                    ↻
                  </ConfirmButton>
                </div>
                <p className="mt-2 text-[0.84rem] leading-relaxed">{tl(record.prompt)}</p>
                {record.answer && (
                  <div className="mt-2 grid gap-1.5 text-[0.74rem] text-[var(--text-dim)] sm:grid-cols-2">
                    <p>
                      <span className="text-[var(--text-faint)]">{t('decision.yourAnswer')}: </span>
                      {optionLabel(record, record.answer.optionId)}
                    </p>
                    <p>
                      <span className="text-[var(--text-faint)]">{t('decision.locked')}: </span>
                      {optionLabel(record, record.prediction.optionId)}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
