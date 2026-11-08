import { useMemo, useState } from 'react'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { IdentityOrb } from '../components/IdentityOrb'
import { PageHeader, Panel, SectionLabel } from '../components/ui'
import { downloadJson } from '../lib/io'
import { cn, pct } from '../lib/cn'
import type { PublicCard } from '../types'

export function Gallery() {
  const { t, tl } = useI18n()
  const profile = useApp((s) => s.profile)
  const doppel = useApp((s) => s.doppel)
  const memories = useApp((s) => s.memories)
  const similarities = useApp((s) => s.similarities)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const setNotice = useApp((s) => s.setNotice)

  const [selected, setSelected] = useState<string[]>([])
  const [showScore, setShowScore] = useState(false)

  const publicCard: PublicCard | null = useMemo(() => {
    if (!profile || !doppel || !settings.galleryPublic) return null
    return {
      version: 1,
      kind: 'doppelganger-public-card',
      exportedAt: Date.now(),
      name: doppel.name,
      codename: doppel.codename,
      summary: doppel.summary,
      interests: doppel.interests,
      style: doppel.style,
      values: doppel.values,
      publicMemories: memories
        .filter((m) => selected.includes(m.id))
        .slice(0, 5)
        .map((m) => ({ content: m.content, category: m.category })),
      score: showScore ? (similarities[0]?.overall ?? null) : null,
    }
  }, [profile, doppel, settings.galleryPublic, memories, selected, showScore, similarities])

  if (!profile || !doppel) return null

  function toggle(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (cur.length >= 5) return cur
      return [...cur, id]
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.gallery')}
        title={t('gallery.title')}
        subtitle={t('gallery.subtitle')}
        actions={
          <>
            <span className={cn('chip', settings.galleryPublic && 'chip-active')}>
              {settings.galleryPublic ? t('gallery.public') : t('gallery.private')}
            </span>
            <button
              type="button"
              className={cn('btn', !settings.galleryPublic && 'btn-primary')}
              onClick={() => void updateSettings({ galleryPublic: !settings.galleryPublic })}
            >
              {settings.galleryPublic ? t('gallery.revoke') : t('gallery.toggle')}
            </button>
          </>
        }
      />

      <p className="mb-4 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[0.76rem] leading-relaxed text-[var(--text-dim)]">
        {t('gallery.noBackend')}
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel>
          <SectionLabel right={<span className="mono text-[0.68rem] text-[var(--text-faint)]">{selected.length}/5</span>}>
            {t('gallery.pickMemories')}
          </SectionLabel>
          {memories.length === 0 ? (
            <p className="text-[0.8rem] text-[var(--text-faint)]">{t('common.empty')}</p>
          ) : (
            <ul className="scroll-thin max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
              {memories.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    aria-pressed={selected.includes(m.id)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                      selected.includes(m.id)
                        ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                    )}
                  >
                    <span aria-hidden="true" className="mono mt-0.5 text-[0.72rem] text-[var(--accent)]">
                      {selected.includes(m.id) ? '◉' : '○'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mono block text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-faint)]">
                        {t(`memory.category.${m.category}` as DictKey)}
                      </span>
                      <span className="line-clamp-2 text-[0.78rem] leading-snug text-[var(--text-dim)]">{m.content}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[0.78rem] text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={showScore}
              onChange={(e) => setShowScore(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            {t('gallery.score')}
          </label>
        </Panel>

        <Panel>
          <SectionLabel
            right={
              publicCard ? (
                <button
                  type="button"
                  className="btn !min-h-8 !px-2.5 !py-0 text-[0.72rem]"
                  onClick={() => {
                    downloadJson(`doppelganger-${doppel.codename}.json`, publicCard)
                    setNotice({ kind: 'ok', text: t('common.copied') })
                  }}
                >
                  {t('gallery.download')}
                </button>
              ) : undefined
            }
          >
            {t('gallery.card')}
          </SectionLabel>

          {!publicCard ? (
            <div className="grid-fade flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-12 text-center">
              <p className="text-[0.82rem] text-[var(--text-dim)]">{t('gallery.private')}</p>
              <button
                type="button"
                className="btn btn-primary !min-h-9 !px-3 !py-0 text-[0.78rem]"
                onClick={() => void updateSettings({ galleryPublic: true })}
              >
                {t('gallery.toggle')}
              </button>
            </div>
          ) : (
            <div className="surface-strong overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
                <IdentityOrb seed={doppel.seed} interests={doppel.interests} size={54} />
                <div className="min-w-0">
                  <p className="truncate font-display text-[0.95rem] font-semibold">{doppel.name}</p>
                  <p className="mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                    {doppel.codename}
                  </p>
                </div>
                {publicCard.score !== null && (
                  <span className="mono ml-auto text-[0.78rem] text-[var(--accent)]">{pct(publicCard.score)}</span>
                )}
              </div>
              <div className="space-y-3 px-4 py-3.5">
                <p className="text-[0.8rem] leading-relaxed text-[var(--text-dim)]">{tl(publicCard.summary)}</p>
                <div className="flex flex-wrap gap-1">
                  {publicCard.values.map((v) => (
                    <span key={v} className="chip !px-2 !py-0.5 !text-[0.64rem]">
                      {v}
                    </span>
                  ))}
                </div>
                {publicCard.publicMemories.length > 0 && (
                  <div>
                    <p className="label-xs mb-1.5">PUBLIC MEMORIES</p>
                    <ul className="space-y-1">
                      {publicCard.publicMemories.map((m, i) => (
                        <li key={`pm-${i}`} className="text-[0.74rem] leading-snug text-[var(--text-dim)]">
                          · {m.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
