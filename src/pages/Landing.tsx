import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import { IdentityOrb } from '../components/IdentityOrb'
import { XLink, AUTHOR_HANDLE } from '../components/XLink'

export function Landing() {
  const { t, lang, setLang } = useI18n()
  const profile = useApp((s) => s.profile)
  const theme = useApp((s) => s.settings.theme)
  const setTheme = useApp((s) => s.setTheme)
  const navigate = useNavigate()

  const features = [
    { key: 'landing.feature1Title' as const, body: 'landing.feature1Body' as const, glyph: '◎' },
    { key: 'landing.feature2Title' as const, body: 'landing.feature2Body' as const, glyph: '▤' },
    { key: 'landing.feature3Title' as const, body: 'landing.feature3Body' as const, glyph: '⇄' },
  ]

  return (
    <div className="relative z-10 min-h-screen">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:h-16 sm:px-6">
        <div className="flex items-center gap-2.5">
          <IdentityOrb seed="landing" size={28} label={t('app.name')} className="[&_*]:!animate-none" />
          <span className="font-display text-[0.92rem] font-semibold tracking-tight">{t('app.name')}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void setLang(lang === 'zh' ? 'en' : 'zh')}
            className="btn btn-ghost !min-h-9 !px-2.5 !py-0 text-[0.72rem]"
            aria-label={t('settings.language')}
          >
            <span className="mono">{lang === 'zh' ? '中' : 'EN'}</span>
          </button>
          <button
            type="button"
            onClick={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn btn-ghost !min-h-9 !w-9 !px-0 !py-0"
            aria-label={t('settings.theme')}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
          </button>
          <XLink label={`${t('app.author')} · ${AUTHOR_HANDLE}`} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <section className="grid items-center gap-8 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-14">
          <div className="animate-fade-up">
            <p className="chip mb-4">
              <span aria-hidden="true" className="text-[var(--accent)]">
                ●
              </span>
              {t('landing.badge')}
            </p>
            <h1 className="font-display text-[clamp(2.1rem,1.3rem+4.4vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
              ME, BUT
              <br />
              <span className="text-[var(--accent)]">DIGITAL.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-[var(--text-dim)]">
              {t('landing.ctaSub')}
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => navigate(profile ? '/overview' : '/wizard')}
              >
                {profile ? t('common.enter') : t('common.create')}
                <span aria-hidden="true">→</span>
              </button>
              <span className="mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                {t('landing.stack')}
              </span>
            </div>

            <p className="mt-5 flex items-center gap-1.5 text-[0.72rem] text-[var(--text-faint)]">
              <span aria-hidden="true">{t('footer.builtBy')}</span>
              <XLink variant="icon" className="!h-6 !w-6 !min-h-0" />
              <a
                href="https://x.com/0xkillcoin"
                target="_blank"
                rel="noreferrer noopener"
                className="mono text-[var(--text-dim)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
              >
                {AUTHOR_HANDLE}
              </a>
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full opacity-60 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 62%)',
              }}
            />
            <div className="relative">
              <IdentityOrb seed={profile?.nickname || 'doppelganger'} size={300} className="max-w-full" />
              <div className="absolute -left-2 top-4 hidden rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_75%,transparent)] px-2.5 py-1.5 backdrop-blur sm:block">
                <p className="label-xs">IDENTITY</p>
                <p className="mono text-[0.72rem]">{profile?.field || 'UNSET'}</p>
              </div>
              <div className="absolute -right-2 bottom-6 hidden rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_75%,transparent)] px-2.5 py-1.5 backdrop-blur sm:block">
                <p className="label-xs">MEMORY NODES</p>
                <p className="mono text-[0.72rem]">{useApp.getState().memories.filter((m) => m.enabled).length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-3 sm:mt-20 sm:grid-cols-3">
          {features.map((f) => (
            <article key={f.key} className="surface p-5 transition-colors hover:border-[var(--border-strong)]">
              <span aria-hidden="true" className="mono mb-3 block text-lg text-[var(--accent)]">
                {f.glyph}
              </span>
              <h2 className="font-display text-[1rem] font-semibold">{t(f.key)}</h2>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--text-dim)]">{t(f.body)}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-3 sm:mt-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="surface p-5">
            <p className="label-xs mb-2">{t('landing.disclaimerTitle')}</p>
            <p className="text-[0.85rem] leading-relaxed text-[var(--text-dim)]">{t('landing.disclaimerBody')}</p>
          </div>
          <div className="surface flex flex-col justify-between gap-3 p-5">
            <p className="label-xs">{t('app.localBadge')}</p>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => navigate(profile ? '/overview' : '/wizard')}
            >
              {profile ? t('common.enter') : t('common.create')}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-[0.72rem] text-[var(--text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.disclaimer')}</p>
          <div className="flex items-center gap-2">
            <span>{t('footer.builtBy')}</span>
            <XLink variant="icon" className="!h-6 !w-6 !min-h-0" />
            <span className="mono">@0xkillcoin</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
