import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Landing } from './pages/Landing'
import { Wizard } from './pages/Wizard'
import { Overview } from './pages/Overview'
import { MemoryLab } from './pages/MemoryLab'
import { Chat } from './pages/Chat'
import { Ask } from './pages/Ask'
import { Decisions } from './pages/Decisions'
import { Similarity } from './pages/Similarity'
import { Evolution } from './pages/Evolution'
import { Gallery } from './pages/Gallery'
import { Settings } from './pages/Settings'
import { useApp } from './store/useApp'
import { Toast } from './components/Toast'

function ThemeSync() {
  const theme = useApp((s) => s.settings.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#05070c' : '#f6f7f9')
  }, [theme])
  return null
}

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

/** Redirects to the wizard when no profile exists yet. */
function RequireProfile({ children }: { children: React.ReactNode }) {
  const profile = useApp((s) => s.profile)
  const loaded = useApp((s) => s.loaded)
  if (!loaded) return null
  if (!profile) return <Navigate to="/wizard" replace />
  return <>{children}</>
}

export default function App() {
  const hydrate = useApp((s) => s.hydrate)
  const loaded = useApp((s) => s.loaded)
  const lang = useApp((s) => s.settings.lang)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  return (
    <>
      <ThemeSync />
      <ScrollReset />
      <Toast />
      {!loaded ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
            <p className="label-xs">BOOTING LOCAL DB…</p>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/wizard" element={<Wizard />} />
          <Route element={<AppShell />}>
            <Route
              path="/overview"
              element={
                <RequireProfile>
                  <Overview />
                </RequireProfile>
              }
            />
            <Route
              path="/memory"
              element={
                <RequireProfile>
                  <MemoryLab />
                </RequireProfile>
              }
            />
            <Route
              path="/chat"
              element={
                <RequireProfile>
                  <Chat />
                </RequireProfile>
              }
            />
            <Route
              path="/ask"
              element={
                <RequireProfile>
                  <Ask />
                </RequireProfile>
              }
            />
            <Route
              path="/decisions"
              element={
                <RequireProfile>
                  <Decisions />
                </RequireProfile>
              }
            />
            <Route
              path="/similarity"
              element={
                <RequireProfile>
                  <Similarity />
                </RequireProfile>
              }
            />
            <Route
              path="/evolution"
              element={
                <RequireProfile>
                  <Evolution />
                </RequireProfile>
              }
            />
            <Route
              path="/gallery"
              element={
                <RequireProfile>
                  <Gallery />
                </RequireProfile>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  )
}
