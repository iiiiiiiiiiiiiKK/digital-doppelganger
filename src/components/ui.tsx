import { useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-xs mb-2">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'li'
}) {
  return <Tag className={cn('surface p-4 sm:p-5', className)}>{children}</Tag>
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <p className="label-xs">{children}</p>
      {right}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="surface px-4 py-3.5">
      <p className="label-xs mb-2 truncate">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="mt-1.5 text-[0.72rem] leading-snug text-[var(--text-faint)]">{hint}</p>}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="surface grid-fade flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span aria-hidden="true" className="mono text-2xl text-[var(--text-faint)]">
        ◌
      </span>
      <p className="font-display text-base font-medium">{title}</p>
      {body && <p className="max-w-md text-[0.82rem] leading-relaxed text-[var(--text-dim)]">{body}</p>}
      {action}
    </div>
  )
}

export function Field({
  label,
  hint,
  required,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[0.78rem] font-medium text-[var(--text-dim)]">
        <span>{label}</span>
        {required && <span className="text-[var(--ember)]">*</span>}
      </label>
      {children}
      {hint && <p className="text-[0.7rem] leading-snug text-[var(--text-faint)]">{hint}</p>}
    </div>
  )
}

export function Meter({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(1, value))
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[0.74rem] text-[var(--text-dim)]">{label}</span>
          <span className="mono text-[0.72rem] text-[var(--text)]">{Math.round(safe * 100)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-strong)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
          style={{ width: `${safe * 100}%` }}
        />
      </div>
    </div>
  )
}

/** Two-step destructive action: first click arms, second confirms. */
export function ConfirmButton({
  onConfirm,
  children,
  className,
  confirmLabel = '✓',
  cancelLabel = '✕',
  ariaLabel,
}: {
  onConfirm: () => void
  children: ReactNode
  className?: string
  confirmLabel?: string
  cancelLabel?: string
  ariaLabel?: string
}) {
  const [armed, setArmed] = useState(false)
  if (armed) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          className="btn btn-danger !min-h-8 !px-2 !py-0 text-[0.72rem]"
          onClick={() => {
            setArmed(false)
            onConfirm()
          }}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className="btn btn-ghost !min-h-8 !px-2 !py-0 text-[0.72rem]"
          onClick={() => setArmed(false)}
        >
          {cancelLabel}
        </button>
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn('btn btn-ghost !min-h-8 !px-2 !py-0 text-[0.72rem]', className)}
      onClick={() => setArmed(true)}
    >
      {children}
    </button>
  )
}
