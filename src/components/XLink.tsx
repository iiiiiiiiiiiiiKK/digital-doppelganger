import { cn } from '../lib/cn'

export const AUTHOR_X_URL = 'https://x.com/0xkillcoin'
export const AUTHOR_HANDLE = '@0xkillcoin'

interface XLinkProps {
  variant?: 'icon' | 'full'
  className?: string
  label?: string
}

/**
 * Author link to X. Rendered in the top bar of every page.
 * Uses the blackboard-bold X glyph (𝕏) so it reads as the platform mark in both themes.
 */
export function XLink({ variant = 'full', className, label }: XLinkProps) {
  return (
    <a
      href={AUTHOR_X_URL}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label ?? `Author on X: ${AUTHOR_HANDLE}`}
      title={label ?? AUTHOR_HANDLE}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full border transition-all',
        'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)] hover:bg-[var(--panel-strong)]',
        variant === 'icon' ? 'h-9 w-9 justify-center' : 'h-9 px-3',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="text-[1rem] leading-none text-[var(--text)] transition-colors group-hover:text-[var(--accent)]"
      >
        𝕏
      </span>
      {variant === 'full' && (
        <span className="mono hidden text-[0.72rem] tracking-tight text-[var(--text-dim)] transition-colors group-hover:text-[var(--text)] sm:inline">
          {AUTHOR_HANDLE}
        </span>
      )}
    </a>
  )
}
