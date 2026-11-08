import { useMemo, useState } from 'react'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import { computeSimilarity } from '../lib/similarity'
import { EmptyState, Meter, PageHeader, Panel, SectionLabel, Stat } from '../components/ui'
import { formatDate, pct } from '../lib/cn'

export function Similarity() {
  const { t, lang } = useI18n()
  const profile = useApp((s) => s.profile)
  const doppel = useApp((s) => s.doppel)
  const memories = useApp((s) => s.memories)
  const decisions = useApp((s) => s.decisions)
  const conversations = useApp((s) => s.conversations)
  const similarities = useApp((s) => s.similarities)
  const saveSimilarity = useApp((s) => s.saveSimilarity)
  const setNotice = useApp((s) => s.setNotice)
  const [busy, setBusy] = useState(false)

  const answeredCount = decisions.filter((d) => d.answer).length

  const preview = useMemo(() => {
    if (!profile || !doppel) return null
    const userTexts = conversations.flatMap((c) => c.messages.filter((m) => m.role === 'user').map((m) => m.text))
    return computeSimilarity(decisions, profile, doppel, memories, userTexts)
  }, [profile, doppel, decisions, memories, conversations])

  if (!profile || !doppel) return null

  async function recalc() {
    if (!preview) return
    setBusy(true)
    try {
      await saveSimilarity(preview.result)
      setNotice({ kind: 'ok', text: t('common.saved') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.similarity')}
        title={t('sim.title')}
        subtitle={t('sim.subtitle')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => void recalc()} disabled={busy || answeredCount === 0}>
            {t('sim.recalc')}
          </button>
        }
      />

      {answeredCount === 0 ? (
        <EmptyState title={t('sim.needData')} body={t('sim.disclaimer')} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label={t('sim.overall')} value={pct(preview?.result.overall ?? 0)} />
            <Stat label={t('sim.decision')} value={pct(preview?.result.decisionMatch ?? 0)} />
            <Stat label={t('sim.interest')} value={pct(preview?.result.interestMatch ?? 0)} />
            <Stat label={t('sim.value')} value={pct(preview?.result.valueMatch ?? 0)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <SectionLabel>{t('sim.title')}</SectionLabel>
              <div className="space-y-3.5">
                <Meter value={preview?.result.decisionMatch ?? 0} label={t('sim.decision')} />
                <Meter value={preview?.result.interestMatch ?? 0} label={t('sim.interest')} />
                <Meter value={preview?.result.styleMatch ?? 0} label={t('sim.style')} />
                <Meter value={preview?.result.valueMatch ?? 0} label={t('sim.value')} />
              </div>
              <p className="mt-4 border-t border-[var(--border)] pt-3 text-[0.7rem] leading-relaxed text-[var(--text-faint)]">
                {t('sim.disclaimer')}
              </p>
            </Panel>

            <Panel>
              <SectionLabel right={<span className="mono text-[0.68rem] text-[var(--text-faint)]">{t('sim.samples')} {preview?.result.sampleSize ?? 0}</span>}>
                {t('sim.history')}
              </SectionLabel>
              {similarities.length === 0 ? (
                <p className="text-[0.8rem] text-[var(--text-faint)]">{t('common.empty')}</p>
              ) : (
                <ul className="space-y-2">
                  {similarities.slice(0, 10).map((row) => (
                    <li key={row.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
                      <span className="stat-value !text-[1.05rem]">{pct(row.overall)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="mono text-[0.62rem] text-[var(--text-faint)]">{formatDate(row.createdAt, lang)}</p>
                        <p className="text-[0.7rem] text-[var(--text-dim)]">
                          D {pct(row.decisionMatch)} · I {pct(row.interestMatch)} · V {pct(row.valueMatch)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
