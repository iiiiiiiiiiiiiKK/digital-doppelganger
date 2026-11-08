import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { IdentityOrb } from '../components/IdentityOrb'
import { PageHeader, Panel, SectionLabel, Stat, Field, Meter } from '../components/ui'
import { DEFAULT_PREFS, INTERESTS, PREF_KEYS, STYLES } from '../lib/profile'
import { cn, formatDate, pct } from '../lib/cn'
import type { Interest, Prefs, Style } from '../types'

const PREF_LABEL: Record<keyof Prefs, DictKey> = {
  risk: 'pref.risk',
  horizon: 'pref.horizon',
  autonomy: 'pref.autonomy',
  efficiency: 'pref.efficiency',
  certainty: 'pref.certainty',
}

export function Overview() {
  const { t, lang, tl } = useI18n()
  const profile = useApp((s) => s.profile)
  const doppel = useApp((s) => s.doppel)
  const memories = useApp((s) => s.memories)
  const decisions = useApp((s) => s.decisions)
  const similarities = useApp((s) => s.similarities)
  const versions = useApp((s) => s.versions)
  const saveProfile = useApp((s) => s.saveProfile)
  const setNotice = useApp((s) => s.setNotice)

  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [field, setField] = useState(profile?.field ?? '')
  const [occupation, setOccupation] = useState(profile?.occupation ?? '')
  const [interests, setInterests] = useState<Interest[]>(profile?.interests ?? [])
  const [style, setStyle] = useState<Style>(profile?.style ?? 'concise')
  const [prefs, setPrefs] = useState<Prefs>(profile?.prefs ?? { ...DEFAULT_PREFS })
  const [saving, setSaving] = useState(false)

  const enabledMemories = useMemo(() => memories.filter((m) => m.enabled), [memories])
  const latestScore = similarities[0]?.overall ?? null
  const answered = decisions.filter((d) => d.answer).length

  if (!profile || !doppel) return null

  function startEdit() {
    if (!profile) return
    setNickname(profile.nickname)
    setBio(profile.bio)
    setField(profile.field)
    setOccupation(profile.occupation)
    setInterests(profile.interests)
    setStyle(profile.style)
    setPrefs(profile.prefs)
    setEditing(true)
  }

  async function save() {
    if (nickname.trim().length === 0) return
    setSaving(true)
    try {
      await saveProfile(
        {
          nickname: nickname.trim(),
          bio: bio.trim(),
          field: field.trim(),
          occupation: occupation.trim(),
          interests,
          style,
          prefs,
        },
        'edit',
        lang === 'zh' ? '编辑资料' : 'Profile edit',
      )
      setEditing(false)
      setNotice({ kind: 'ok', text: t('common.saved') })
    } finally {
      setSaving(false)
    }
  }

  function toggleInterest(i: Interest) {
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${t('nav.overview')} · ${doppel.codename}`}
        title={doppel.name}
        subtitle={tl(doppel.summary)}
        actions={
          editing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
                {t('common.save')}
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={startEdit}>
              {t('overview.edit')}
            </button>
          )
        }
      />

      {editing ? (
        <Panel className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('wizard.nickname')} required htmlFor="ov-nick">
              <input
                id="ov-nick"
                className="input"
                value={nickname}
                maxLength={60}
                onChange={(e) => setNickname(e.target.value)}
              />
            </Field>
            <Field label={t('wizard.field')} htmlFor="ov-field">
              <input
                id="ov-field"
                className="input"
                value={field}
                maxLength={80}
                onChange={(e) => setField(e.target.value)}
              />
            </Field>
            <Field label={t('wizard.occupation')} htmlFor="ov-occ">
              <input
                id="ov-occ"
                className="input"
                value={occupation}
                maxLength={80}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </Field>
            <Field label={t('wizard.step.style')} htmlFor="ov-style">
              <select id="ov-style" className="input" value={style} onChange={(e) => setStyle(e.target.value as Style)}>
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {t(`style.${s}` as DictKey)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('wizard.bio')} htmlFor="ov-bio">
                <textarea
                  id="ov-bio"
                  className="input min-h-[88px] resize-y"
                  value={bio}
                  maxLength={600}
                  onChange={(e) => setBio(e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-[0.78rem] font-medium text-[var(--text-dim)]">{t('wizard.step.interests')}</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    aria-pressed={interests.includes(i)}
                    className={cn('chip !px-3 !py-1.5', interests.includes(i) && 'chip-active')}
                  >
                    {t(`interest.${i}` as DictKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 space-y-3">
              <p className="text-[0.78rem] font-medium text-[var(--text-dim)]">{t('wizard.step.prefs')}</p>
              {PREF_KEYS.map((key) => (
                <div key={key}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[0.76rem] text-[var(--text-dim)]">{t(PREF_LABEL[key])}</span>
                    <span className="mono text-[0.68rem] text-[var(--text-faint)]">{prefs[key].toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={prefs[key]}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: Number(e.target.value) }))}
                    className="w-full accent-[var(--accent)]"
                    aria-label={t(PREF_LABEL[key])}
                  />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Panel className="flex flex-col items-center gap-3 text-center">
          <IdentityOrb seed={doppel.seed} interests={doppel.interests} size={190} />
          <div>
            <p className="font-display text-[1.05rem] font-semibold">{doppel.name}</p>
            <p className="mono mt-0.5 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-faint)]">
              {doppel.codename} · SEED {doppel.seed}
            </p>
          </div>
          <div className="w-full">
            <Meter value={doppel.confidence} label={t('common.confidence')} />
          </div>
          <div className="flex w-full flex-wrap justify-center gap-1.5">
            {doppel.values.map((v) => (
              <span key={v} className="chip">
                {v}
              </span>
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 pt-1">
            <Link to="/memory" className="btn !min-h-9 !px-2 !py-0 text-[0.76rem]">
              {t('nav.memory')}
            </Link>
            <Link to="/chat" className="btn btn-primary !min-h-9 !px-2 !py-0 text-[0.76rem]">
              {t('nav.chat')}
            </Link>
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label={t('overview.memories')} value={enabledMemories.length} hint={`${memories.length} ${t('common.items')}`} />
            <Stat label={t('overview.decisions')} value={answered} hint={`${decisions.length} ${t('common.items')}`} />
            <Stat label={t('overview.score')} value={latestScore === null ? '—' : pct(latestScore)} />
            <Stat label={t('overview.versions')} value={versions.length} />
          </div>

          <Panel>
            <SectionLabel>{t('overview.interests')}</SectionLabel>
            {doppel.interests.length === 0 ? (
              <p className="text-[0.8rem] text-[var(--text-faint)]">{t('common.empty')}</p>
            ) : (
              <ul className="space-y-2.5">
                {doppel.interests.slice(0, 6).map((slice) => (
                  <li key={slice.interest}>
                    <Meter value={slice.weight * 2.4} label={t(`interest.${slice.interest}` as DictKey)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <SectionLabel>{t('overview.prefs')}</SectionLabel>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PREF_KEYS.map((key) => (
                <Meter key={key} value={doppel.prefs[key]} label={t(PREF_LABEL[key])} />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionLabel>{t('overview.known')}</SectionLabel>
          {doppel.known.length === 0 ? (
            <p className="text-[0.8rem] text-[var(--text-faint)]">{t('common.empty')}</p>
          ) : (
            <ul className="space-y-1.5">
              {doppel.known.map((k, i) => (
                <li key={`k-${i}`} className="flex gap-2 text-[0.8rem] leading-relaxed text-[var(--text-dim)]">
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    +
                  </span>
                  <span>{tl(k)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <SectionLabel>{t('overview.unknown')}</SectionLabel>
          {doppel.unknown.length === 0 ? (
            <p className="text-[0.8rem] text-[var(--text-faint)]">
              {lang === 'zh' ? '当前没有明显的资料缺口。' : 'No obvious data gaps right now.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {doppel.unknown.map((k, i) => (
                <li key={`u-${i}`} className="flex gap-2 text-[0.8rem] leading-relaxed text-[var(--text-dim)]">
                  <span aria-hidden="true" className="text-[var(--ember)]">
                    −
                  </span>
                  <span>{tl(k)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-4">
        <SectionLabel right={<span className="mono text-[0.68rem] text-[var(--text-faint)]">{formatDate(doppel.derivedAt, lang)}</span>}>
          {t('overview.stats')}
        </SectionLabel>
        <div className="grid gap-3 text-[0.8rem] text-[var(--text-dim)] sm:grid-cols-3">
          <p>
            {t('wizard.step.interests')}: {profile.interests.length} ·{' '}
            {profile.interests.map((i) => t(`interest.${i}` as DictKey)).join(' / ') || '—'}
          </p>
          <p>
            {t('wizard.step.style')}: {t(`style.${profile.style}` as DictKey)}
          </p>
          <p>
            {t('evo.lastUpdate')}: {formatDate(profile.updatedAt, lang)}
          </p>
        </div>
      </Panel>
    </div>
  )
}
