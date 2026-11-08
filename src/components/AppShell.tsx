import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { cn } from '../lib/cn'
import { XLink } from './XLink'
import { IdentityOrb } from './IdentityOrb'

interface NavItem {
  to: string
  key: DictKey
  glyph: string
  primary?: boolean
}

const NAV: NavItem[] = [
  { to: '/overview', key: 'nav.overview', glyph: '◎', primary: true },
  { to: '/memory', key: 'nav.memory', glyph: '▤', primary: true },
  { to: '/chat', key: 'nav.chat', glyph: '◇', primary: true },
  { to: '/decisions', key: 'nav.decisions', glyph: '⇄', primary: true },
  { to: '/ask', key: 'nav.ask', glyph: '?', primary: true },
  { to: '/similarity', key: 'nav.similarity', glyph: '≈' },
  { to: '/evolution', key: 'nav.evolution', glyph: '↑' },
  { to: '/gallery', key: 'nav.gallery', glyph: '▦' },
  { to: '/settings', key: 'nav.settings', glyph: '⚙' },
]

export function AppShell() {
  const { t, lang, setLang } = useI18n()
  const doppel = useApp((s) => s.doppel)
  const profile = useApp((s) => s.profile)
  const theme = useApp((s) => s.settings.theme)
  const setTheme = useApp((s) => s.setTheme)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const primary = NAV.filter((n) => n.primary)

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-[var(--accent-ink)]"
      >
        {t('a11y.skipToContent')}
      </a>

      {/* Top bar — author X link lives here on every page. */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-5">
          <button
            type="button"
            onClick={() => navigate('/overview')}
            className="flex min-w-0 items-center gap-2.5 text-left"
            aria-label={t('app.name')}
          >
            <span className="shrink-0">
              <IdentityOrb
                seed={doppel?.seed ?? 'landing'}
                size={30}
                label={t('app.name')}
                className="[&_circle]:animate-none"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-[0.92rem] font-semibold leading-tight tracking-tight">
                {t('app.name')}
              </span>
              <span className="mono hidden text-[0.6rem] uppercase tracking-[0.18em] text-[var(--text-faint)] sm:block">
                {doppel?.codename ?? t('app.slogan')}
              </span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => void setLang(lang === 'zh' ? 'en' : 'zh')}
              className="btn btn-ghost !min-h-9 !px-2.5 !py-0 text-[0.72rem] font-medium"
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
            <XLink className="!min-h-9" label={`${t('app.author')} · @0xkillcoin`} />
            <button
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              className="btn btn-ghost !min-h-9 !w-9 !px-0 !py-0 lg:hidden"
              aria-expanded={drawerOpen}
              aria-controls="app-drawer"
              aria-label={t('nav.menu')}
            >
              <span aria-hidden="true" className="text-base">
                {drawerOpen ? '✕' : '☰'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-0 lg:gap-6 lg:px-5">
        {/* Desktop sidebar */}
        <aside className="hidden w-[212px] shrink-0 py-6 lg:block">
          <nav className="sticky top-[86px] flex flex-col gap-1" aria-label={t('nav.menu')}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.85rem] transition-colors',
                    isActive
                      ? 'bg-[var(--panel-strong)] text-[var(--text)]'
                      : 'text-[var(--text-dim)] hover:bg-[var(--panel)] hover:text-[var(--text)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mono w-4 text-center text-[0.85rem]',
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]',
                      )}
                    >
                      {item.glyph}
                    </span>
                    <span className="truncate">{t(item.key)}</span>
                  </>
                )}
              </NavLink>
            ))}
            <div className="mt-4 rounded-lg border border-[var(--border)] p-3">
              <p className="label-xs mb-1.5">{t('overview.identity')}</p>
              <p className="mono truncate text-[0.72rem] text-[var(--text-dim)]">
                {profile?.nickname || '—'} · {doppel ? `${Math.round(doppel.confidence * 100)}%` : '—'}
              </p>
            </div>
          </nav>
        </aside>

        <main id="main" className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:pb-16">
          <Outlet />
          <footer className="mt-12 border-t border-[var(--border)] pt-5 text-[0.72rem] leading-relaxed text-[var(--text-faint)]">
            <p className="max-w-3xl">{t('footer.disclaimer')}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="mono uppercase tracking-[0.16em]">{t('footer.local')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('footer.builtBy')}</span>
              <XLink variant="icon" className="!h-6 !w-6 !min-h-0" />
              <span className="mono">@0xkillcoin</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label={t('nav.menu')}
      >
        <div className="flex items-stretch justify-around px-1">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[0.62rem] font-medium transition-colors',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]',
                )
              }
            >
              <span aria-hidden="true" className="mono text-[1.02rem] leading-none">
                {item.glyph}
              </span>
              <span className="w-full truncate text-center leading-tight">{t(item.key)}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile drawer (full nav) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <div
            id="app-drawer"
            className="absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-[var(--border)] bg-[var(--bg-soft)] px-4 pb-6 pt-4 shadow-2xl sm:top-16"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="label-xs">{t('nav.menu')}</p>
              <button type="button" className="btn btn-ghost !min-h-8 !px-2 !py-0" onClick={() => setDrawerOpen(false)}>
                <span className="mono text-[0.72rem]">{t('nav.close')}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-3 text-[0.85rem]',
                      isActive
                        ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-dim)]',
                    )
                  }
                >
                  <span aria-hidden="true" className="mono">
                    {item.glyph}
                  </span>
                  <span className="truncate">{t(item.key)}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5">
              <span className="text-[0.78rem] text-[var(--text-dim)]">{t('app.author')}</span>
              <XLink variant="icon" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
