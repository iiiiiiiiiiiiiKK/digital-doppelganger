import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { DEFAULT_PREFS, INTERESTS, STYLES } from '../lib/profile'
import type { Interest, Prefs, Style, UserProfile } from '../types'
import { cn } from '../lib/cn'
import { Field } from '../components/ui'
import { XLink, AUTHOR_HANDLE } from '../components/XLink'
import { IdentityOrb } from '../components/IdentityOrb'
import { PREF_KEYS } from '../lib/profile'

const STEPS = ['basics', 'interests', 'prefs', 'style', 'memories', 'review'] as const
type Step = (typeof STEPS)[number]

const STEP_LABEL: Record<Step, DictKey> = {
  basics: 'wizard.step.basics',
  interests: 'wizard.step.interests',
  prefs: 'wizard.step.prefs',
  style: 'wizard.step.style',
  memories: 'wizard.step.memories',
  review: 'wizard.step.review',
}

const PREF_LABEL: Record<keyof Prefs, { label: DictKey; low: DictKey; high: DictKey }> = {
  risk: { label: 'pref.risk', low: 'pref.risk.low', high: 'pref.risk.high' },
  horizon: { label: 'pref.horizon', low: 'pref.horizon.low', high: 'pref.horizon.high' },
  autonomy: { label: 'pref.autonomy', low: 'pref.autonomy.low', high: 'pref.autonomy.high' },
  efficiency: { label: 'pref.efficiency', low: 'pref.efficiency.low', high: 'pref.efficiency.high' },
  certainty: { label: 'pref.certainty', low: 'pref.certainty.low', high: 'pref.certainty.high' },
}

export function Wizard() {
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()
  const saveProfile = useApp((s) => s.saveProfile)
  const addMemory = useApp((s) => s.addMemory)
  const setNotice = useApp((s) => s.setNotice)
  const existing = useApp((s) => s.profile)

  const [step, setStep] = useState<Step>('basics')
  const [nickname, setNickname] = useState(existing?.nickname ?? '')
  const [bio, setBio] = useState(existing?.bio ?? '')
  const [field, setField] = useState(existing?.field ?? '')
  const [occupation, setOccupation] = useState(existing?.occupation ?? '')
  const [interests, setInterests] = useState<Interest[]>(existing?.interests ?? [])
  const [prefs, setPrefs] = useState<Prefs>(existing?.prefs ?? { ...DEFAULT_PREFS })
  const [style, setStyle] = useState<Style>(existing?.style ?? 'concise')
  const [seed, setSeed] = useState('')
  const [seeds, setSeeds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stepIndex = STEPS.indexOf(step)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  const canAdvance = useMemo(() => {
    if (step === 'basics') return nickname.trim().length > 0
    if (step === 'interests') return interests.length > 0
    return true
  }, [step, nickname, interests.length])

  function goNext() {
    setError('')
    if (!canAdvance) {
      setError(t('wizard.needNickname'))
      return
    }
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next)
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev)
  }

  function toggleInterest(i: Interest) {
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))
  }

  function addSeed() {
    const value = seed.trim()
    if (value.length < 4) return
    setSeeds((cur) => [...cur, value].slice(0, 5))
    setSeed('')
  }

  async function finish() {
    if (nickname.trim().length === 0) {
      setError(t('wizard.needNickname'))
      setStep('basics')
      return
    }
    setBusy(true)
    setError('')
    try {
      const patch: Omit<UserProfile, 'id' | 'updatedAt'> = {
        nickname: nickname.trim(),
        bio: bio.trim(),
        field: field.trim(),
        occupation: occupation.trim(),
        interests,
        style,
        prefs,
      }
      await saveProfile(patch, 'create', lang === 'zh' ? '创建分身' : 'Created doppelgänger')
      for (const content of seeds) {
        await addMemory({
          content,
          category: 'experience',
          source: 'seed',
          importance: 4,
          enabled: true,
          tags: [],
        })
      }
      setNotice({ kind: 'ok', text: lang === 'zh' ? '数字分身已创建' : 'Doppelgänger created' })
      navigate('/overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-4 sm:h-16 sm:px-6">
          <button type="button" className="btn btn-ghost !min-h-9 !px-2 !py-0" onClick={() => navigate('/')}>
            <span aria-hidden="true">←</span>
            <span className="mono text-[0.7rem]">HOME</span>
          </button>
          <p className="ml-auto mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-faint)]">
            {stepIndex + 1} / {STEPS.length}
          </p>
          <button
            type="button"
            onClick={() => void setLang(lang === 'zh' ? 'en' : 'zh')}
            className="btn btn-ghost !min-h-9 !px-2.5 !py-0 text-[0.72rem]"
            aria-label={t('settings.language')}
          >
            <span className="mono">{lang === 'zh' ? '中' : 'EN'}</span>
          </button>
          <XLink label={`${t('app.author')} · ${AUTHOR_HANDLE}`} />
        </div>
        <div className="h-0.5 w-full bg-[var(--panel-strong)]">
          <div className="h-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-5 flex gap-1.5 overflow-x-auto no-scrollbar">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => i <= stepIndex && setStep(s)}
              disabled={i > stepIndex}
              className={cn(
                'chip whitespace-nowrap transition-colors',
                s === step && 'chip-active',
                i > stepIndex && 'opacity-40',
              )}
            >
              <span className="mono text-[0.62rem]">{String(i + 1).padStart(2, '0')}</span>
              {t(STEP_LABEL[s])}
            </button>
          ))}
        </div>

        <h1 className="page-title mb-4">{t('wizard.title')}</h1>

        <div className="surface p-4 sm:p-6">
          {step === 'basics' && (
            <div className="space-y-4">
              <Field label={t('wizard.nickname')} required htmlFor="wz-nick">
                <input
                  id="wz-nick"
                  className="input"
                  value={nickname}
                  maxLength={60}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('wizard.nicknamePh')}
                  autoComplete="off"
                />
              </Field>
              <Field label={t('wizard.bio')} htmlFor="wz-bio" hint={`${bio.length}/600`}>
                <textarea
                  id="wz-bio"
                  className="input min-h-[96px] resize-y"
                  value={bio}
                  maxLength={600}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('wizard.bioPh')}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('wizard.field')} htmlFor="wz-field">
                  <input
                    id="wz-field"
                    className="input"
                    value={field}
                    maxLength={80}
                    onChange={(e) => setField(e.target.value)}
                    placeholder={t('wizard.fieldPh')}
                  />
                </Field>
                <Field label={t('wizard.occupation')} htmlFor="wz-occ" hint={t('common.optional')}>
                  <input
                    id="wz-occ"
                    className="input"
                    value={occupation}
                    maxLength={80}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder={t('wizard.occupationPh')}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 'interests' && (
            <div>
              <p className="mb-4 text-[0.82rem] text-[var(--text-dim)]">{t('wizard.interestsHint')}</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    aria-pressed={interests.includes(i)}
                    className={cn('chip !px-3.5 !py-2 text-[0.82rem]', interests.includes(i) && 'chip-active')}
                  >
                    {t(`interest.${i}` as DictKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'prefs' && (
            <div>
              <p className="mb-4 text-[0.82rem] text-[var(--text-dim)]">{t('wizard.prefsHint')}</p>
              <div className="space-y-5">
                {PREF_KEYS.map((key) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-[0.82rem] font-medium">{t(PREF_LABEL[key].label)}</span>
                      <span className="mono text-[0.7rem] text-[var(--text-faint)]">{prefs[key].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={prefs[key]}
                      onChange={(e) => setPrefs((p) => ({ ...p, [key]: Number(e.target.value) }))}
                      className="w-full accent-[var(--accent)]"
                      aria-label={t(PREF_LABEL[key].label)}
                    />
                    <div className="mt-1 flex justify-between text-[0.66rem] text-[var(--text-faint)]">
                      <span>{t(PREF_LABEL[key].low)}</span>
                      <span>{t(PREF_LABEL[key].high)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'style' && (
            <div>
              <p className="mb-4 text-[0.82rem] text-[var(--text-dim)]">{t('wizard.styleHint')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    aria-pressed={style === s}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[0.86rem] transition-colors',
                      style === s
                        ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-strong)]',
                    )}
                  >
                    <span>{t(`style.${s}` as DictKey)}</span>
                    {style === s && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'memories' && (
            <div className="space-y-4">
              <p className="text-[0.82rem] leading-relaxed text-[var(--text-dim)]">{t('wizard.seedHint')}</p>
              <Field label={t('memory.content')} htmlFor="wz-seed">
                <textarea
                  id="wz-seed"
                  className="input min-h-[88px] resize-y"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder={t('wizard.seedPh')}
                />
              </Field>
              <div className="flex items-center gap-2">
                <button type="button" className="btn" onClick={addSeed} disabled={seed.trim().length < 4}>
                  {t('wizard.addSeed')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={goNext}>
                  {t('common.skip')}
                </button>
              </div>
              {seeds.length > 0 && (
                <ul className="space-y-2">
                  {seeds.map((s, i) => (
                    <li key={`${s}-${i}`} className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-3">
                      <span className="mono text-[0.7rem] text-[var(--text-faint)]">{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex-1 text-[0.82rem] leading-relaxed">{s}</span>
                      <button
                        type="button"
                        className="btn btn-ghost !min-h-7 !px-1.5 !py-0"
                        onClick={() => setSeeds((cur) => cur.filter((_, idx) => idx !== i))}
                        aria-label={t('common.delete')}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="grid gap-5 sm:grid-cols-[168px_1fr] sm:items-start">
              <div className="flex flex-col items-center gap-2">
                <IdentityOrb seed={`${nickname}|${field}|${style}`} size={140} />
                <p className="mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  PREVIEW
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[0.85rem] leading-relaxed text-[var(--text-dim)]">{t('wizard.reviewHint')}</p>
                <dl className="grid grid-cols-2 gap-2 text-[0.78rem]">
                  <div className="rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="label-xs mb-1">{t('wizard.nickname')}</dt>
                    <dd className="truncate">{nickname || '—'}</dd>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="label-xs mb-1">{t('wizard.field')}</dt>
                    <dd className="truncate">{field || '—'}</dd>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="label-xs mb-1">{t('wizard.step.interests')}</dt>
                    <dd className="truncate">
                      {interests.length ? interests.map((i) => t(`interest.${i}` as DictKey)).join(' / ') : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="label-xs mb-1">{t('wizard.step.style')}</dt>
                    <dd className="truncate">{t(`style.${style}` as DictKey)}</dd>
                  </div>
                  <div className="col-span-2 rounded-lg border border-[var(--border)] px-3 py-2">
                    <dt className="label-xs mb-1">{t('wizard.step.memories')}</dt>
                    <dd>{seeds.length} {t('common.items')}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-[rgba(255,120,120,0.4)] px-3 py-2 text-[0.78rem] text-[#ff9c9c]">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={goBack}
              disabled={stepIndex === 0}
            >
              {t('common.back')}
            </button>
            {step === 'review' ? (
              <button type="button" className="btn btn-primary" onClick={() => void finish()} disabled={busy}>
                {busy ? t('wizard.generating') : t('common.create')}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={goNext} disabled={!canAdvance}>
                {t('common.next')}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
