import { useEffect } from 'react'
import { useApp } from '../store/useApp'
import { cn } from '../lib/cn'

export function Toast() {
  const notice = useApp((s) => s.notice)
  const setNotice = useApp((s) => s.setNotice)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3600)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  if (!notice) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 sm:bottom-6"
    >
      <div
        className={cn(
          'pointer-events-auto flex max-w-lg items-start gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg backdrop-blur',
          notice.kind === 'ok'
            ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg))] text-[var(--text)]'
            : 'border-[rgba(255,120,120,0.45)] bg-[color-mix(in_srgb,#ff6b6b_14%,var(--bg))] text-[var(--text)]',
        )}
      >
        <span aria-hidden="true">{notice.kind === 'ok' ? '✓' : '!'}</span>
        <span className="leading-snug">{notice.text}</span>
      </div>
    </div>
  )
}
