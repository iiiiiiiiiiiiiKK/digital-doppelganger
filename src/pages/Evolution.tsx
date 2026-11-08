import { useMemo, useState } from 'react'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { ConfirmButton, EmptyState, PageHeader, Panel, SectionLabel, Stat } from '../components/ui'
import { formatDate, pct } from '../lib/cn'
import type { ProfileVersion } from '../types'

const REASON_KEY: Record<ProfileVersion['reason'], DictKey> = {
  create: 'evo.reason.create',
  edit: 'evo.reason.edit',
  memory: 'evo.reason.memory',
  restore: 'evo.reason.restore',
  import: 'evo.reason.import',
}

export function Evolution() {
  const { t, lang } = useI18n()
  const versions = useApp((s) => s.versions)
  const memories = useApp((s) => s.memories)
  const restoreVersion = useApp((s) => s.restoreVersion)
  const setNotice = useApp((s) => s.setNotice)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const deltas = useMemo(() => {
    const current = versions[0]
    const previous = versions[1]
    if (!current || !previous) {
      return {
        newMemories: current ? current.snapshot.memories.length : 0,
        newOpinions: current ? current.snapshot.memories.filter((m) => m.category === 'opinion').length : 0,
        interestShift: [] as { interest: string; from: number; to: number }[],
        prefShift: [] as { key: string; from: number; to: number }[],
      }
    }
    const prevIds = new Set(previous.snapshot.memories.map((m) => m.id))
    const newMemories = current.snapshot.memories.filter((m) => !prevIds.has(m.id)).length
    const newOpinions = current.snapshot.memories.filter((m) => !prevIds.has(m.id) && m.category === 'opinion').length

    const interestShift = current.snapshot.doppel.interests
      .map((slice) => {
        const before = previous.snapshot.doppel.interests.find((i) => i.interest === slice.interest)?.weight ?? 0
        return { interest: slice.interest as string, from: before, to: slice.weight }
      })
      .filter((row) => Math.abs(row.to - row.from) > 0.02)
      .slice(0, 4)

    const prefShift = (Object.keys(current.snapshot.doppel.prefs) as (keyof typeof current.snapshot.doppel.prefs)[])
      .map((key) => ({
        key: key as string,
        from: previous.snapshot.doppel.prefs[key],
        to: current.snapshot.doppel.prefs[key],
      }))
      .filter((row) => Math.abs(row.to - row.from) > 0.02)

    return { newMemories, newOpinions, interestShift, prefShift }
  }, [versions])

  async function restore(id: string) {
    await restoreVersion(id)
    setConfirmId(null)
    setNotice({ kind: 'ok', text: t('common.saved') })
  }

  return (
    <div>
      <PageHeader eyebrow={t('nav.evolution')} title={t('evo.title')} subtitle={t('evo.subtitle')} />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={t('evo.newMemories')} value={deltas.newMemories} hint={`${memories.length} ${t('common.items')}`} />
        <Stat label={t('evo.newOpinions')} value={deltas.newOpinions} />
        <Stat label={t('overview.versions')} value={versions.length} />
        <Stat label={t('evo.lastUpdate')} value={versions[0] ? formatDate(versions[0].createdAt, lang).split(' ')[0] : '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <SectionLabel>{t('evo.interestShift')}</SectionLabel>
          {deltas.interestShift.length === 0 ? (
            <p className="text-[0.8rem] text-[var(--text-faint)]">{t('common.empty')}</p>
          ) : (
            <ul className="space-y-1.5">
              {deltas.interestShift.map((row) => (
                <li key={row.interest} className="flex items-center justify-between gap-2 text-[0.8rem]">
                  <span className="truncate text-[var(--text-dim)]">{t(`interest.${row.interest}` as DictKey)}</span>
                  <span className="mono shrink-0 text-[0.72rem]">
                    {pct(row.from)} <span aria-hidden="true">→</span>{' '}
                    <span className={row.to > row.from ? 'text-[var(--accent)]' : 'text-[var(--ember)]'}>{pct(row.to)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <p className="label-xs mb-2">{t('evo.prefShift')}</p>
            {deltas.prefShift.length === 0 ? (
              <p className="text-[0.78rem] text-[var(--text-faint)]">{t('common.empty')}</p>
            ) : (
              <ul className="space-y-1.5">
                {deltas.prefShift.map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-2 text-[0.78rem]">
                    <span className="truncate text-[var(--text-dim)]">{row.key}</span>
                    <span className="mono shrink-0 text-[0.7rem]">
                      {row.from.toFixed(2)} <span aria-hidden="true">→</span>{' '}
                      <span className={row.to > row.from ? 'text-[var(--accent)]' : 'text-[var(--ember)]'}>
                        {row.to.toFixed(2)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionLabel>{t('evo.diff')}</SectionLabel>
          {versions.length < 2 ? (
            <p className="text-[0.8rem] text-[var(--text-faint)]">{t('common.empty')}</p>
          ) : (
            <div className="space-y-2 text-[0.8rem] text-[var(--text-dim)]">
              <p>
                {t('evo.newMemories')}: {deltas.newMemories}
              </p>
              <p>
                {t('overview.memories')}: {versions[1]?.snapshot.memories.length ?? 0} → {versions[0]?.snapshot.memories.length ?? 0}
              </p>
              <p>
                {t('common.confidence')}: {pct(versions[1]?.snapshot.doppel.confidence ?? 0)} →{' '}
                {pct(versions[0]?.snapshot.doppel.confidence ?? 0)}
              </p>
              <p>
                {t('wizard.step.style')}: {t(`style.${versions[1]?.snapshot.profile.style ?? 'concise'}` as DictKey)} →{' '}
                {t(`style.${versions[0]?.snapshot.profile.style ?? 'concise'}` as DictKey)}
              </p>
            </div>
          )}
        </Panel>
      </div>

      <section className="mt-4">
        <SectionLabel right={<span className="mono text-[0.68rem] text-[var(--text-faint)]">{versions.length}</span>}>
          {t('evo.versions')}
        </SectionLabel>
        {versions.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <ul className="space-y-2">
            {versions.map((version, index) => (
              <li key={version.id} className="surface p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip !px-2 !py-0.5 !text-[0.64rem]">{t(REASON_KEY[version.reason])}</span>
                  {index === 0 && <span className="chip chip-active !px-2 !py-0.5 !text-[0.64rem]">{t('evo.current')}</span>}
                  <span className="mono ml-auto text-[0.62rem] text-[var(--text-faint)]">
                    {formatDate(version.createdAt, lang)}
                  </span>
                </div>
                <p className="mt-2 truncate text-[0.82rem]">{version.label}</p>
                <p className="mono mt-1 text-[0.66rem] text-[var(--text-faint)]">
                  {version.snapshot.doppel.codename} · {version.snapshot.memories.length} {t('overview.memories')} ·{' '}
                  {pct(version.snapshot.doppel.confidence)}
                </p>
                {index !== 0 && (
                  <div className="mt-2">
                    {confirmId === version.id ? (
                      <div className="flex items-center gap-2">
                        <p className="text-[0.72rem] leading-snug text-[var(--ember)]">{t('evo.restoreConfirm')}</p>
                        <button type="button" className="btn btn-danger !min-h-8 !px-2 !py-0 text-[0.7rem]" onClick={() => void restore(version.id)}>
                          {t('common.confirm')}
                        </button>
                        <button type="button" className="btn btn-ghost !min-h-8 !px-2 !py-0 text-[0.7rem]" onClick={() => setConfirmId(null)}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost !min-h-8 !px-2 !py-0 text-[0.7rem]"
                          onClick={() => setConfirmId(version.id)}
                        >
                          {t('evo.restore')}
                        </button>
                        <ConfirmButton
                          onConfirm={() => void useApp.getState().deleteVersion(version.id)}
                          className="text-[0.7rem]"
                          ariaLabel={t('common.delete')}
                        >
                          {t('common.delete')}
                        </ConfirmButton>
                      </div>
                    )}
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
