import { useMemo } from 'react'
import { hash32 } from '../lib/id'
import type { InterestSlice } from '../types'
import { cn } from '../lib/cn'

interface IdentityOrbProps {
  seed: string
  interests?: InterestSlice[]
  size?: number
  className?: string
  label?: string
}

/** Deterministic generative identity mark — no external images, no randomness at render time. */
export function IdentityOrb({ seed, interests = [], size = 168, className, label }: IdentityOrbProps) {
  const h = hash32(seed || 'doppel')

  const rings = useMemo(() => {
    const rnd = (i: number) => ((h >>> (i % 24)) & 0xff) / 255
    return Array.from({ length: 5 }, (_, i) => ({
      r: 22 + i * 7 + rnd(i) * 6,
      dash: 4 + ((h >>> (i * 3)) & 7),
      opacity: 0.18 + rnd(i + 7) * 0.5,
    }))
  }, [h])

  const nodes = useMemo(() => {
    const count = Math.max(3, Math.min(9, interests.length + 3))
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (((h >>> (i * 2)) & 0xff) / 255) * 0.6
      const radius = 44 + (((h >>> (i * 4)) & 0x3f) / 63) * 14
      return {
        cx: 60 + Math.cos(angle) * radius,
        cy: 60 + Math.sin(angle) * radius,
        r: 1.1 + (((h >>> (i * 5)) & 0x7) / 7) * 1.7,
        o: 0.4 + (((h >>> (i * 6)) & 0x1f) / 31) * 0.55,
      }
    })
  }, [h, interests.length])

  const coreGradient = `orb-${h.toString(16)}`

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? 'Digital doppelgänger identity mark'}
      className={cn('overflow-visible', className)}
    >
      <defs>
        <radialGradient id={coreGradient} cx="42%" cy="36%" r="68%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
          <stop offset="58%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {rings.map((ring, i) => (
        <circle
          key={`ring-${i}`}
          cx="60"
          cy="60"
          r={ring.r}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity={ring.opacity}
          strokeWidth="0.55"
          strokeDasharray={`${ring.dash} ${ring.dash * 1.8}`}
          style={{
            animation: `orbit ${26 + i * 7}s linear infinite`,
            transformOrigin: '60px 60px',
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
          }}
        />
      ))}

      <circle cx="60" cy="60" r="34" fill={`url(#${coreGradient})`} />
      <circle cx="60" cy="60" r="13.5" fill="var(--accent)" fillOpacity="0.92" />
      <circle cx="60" cy="60" r="13.5" fill="none" stroke="var(--bg)" strokeOpacity="0.5" strokeWidth="0.6" />
      <circle cx="55.4" cy="54.6" r="3.4" fill="#fff" fillOpacity="0.5" />

      {nodes.map((node, i) => (
        <g key={`node-${i}`}>
          <line
            x1="60"
            y1="60"
            x2={node.cx}
            y2={node.cy}
            stroke="var(--accent)"
            strokeOpacity={node.o * 0.35}
            strokeWidth="0.4"
          />
          <circle cx={node.cx} cy={node.cy} r={node.r} fill="var(--accent)" fillOpacity={node.o} />
        </g>
      ))}
    </svg>
  )
}
