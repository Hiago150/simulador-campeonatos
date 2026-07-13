import type { Team } from '../types'
import { crestFor } from '../data/crests'
import { cx } from '../lib/cx'

export function contrastText(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#fff'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0a0a0b' : '#ffffff'
}

const SIZES = {
  xs: 'h-5 w-5 text-[8px] rounded',
  sm: 'h-7 w-7 text-[10px] rounded-md',
  md: 'h-10 w-10 text-xs rounded-lg',
  lg: 'h-14 w-14 text-base rounded-xl',
  xl: 'h-20 w-20 text-2xl rounded-2xl'
}

/** selo de seed (ex.: "EMEA #2") no canto do badge — só quando `seedLabel` é passado */
function SeedBadge({ label }: { label: string }) {
  return (
    <span
      title={label}
      className="tnum absolute -bottom-1 -right-1 rounded-full border border-white/10 bg-ink-900 px-1 text-[8px] font-bold leading-tight text-zinc-300"
    >
      {label}
    </span>
  )
}

export function TeamBadge({
  team,
  size = 'md',
  className,
  seedLabel
}: {
  team: Team | undefined
  size?: keyof typeof SIZES
  className?: string
  /** selo de seed (ex.: "EMEA #2") — opcional, só aparece quando passado explicitamente */
  seedLabel?: string
}) {
  if (!team) {
    return (
      <div
        className={cx(
          'flex items-center justify-center border border-dashed border-white/15 bg-ink-800 font-bold text-zinc-600',
          SIZES[size],
          className
        )}
      >
        ?
      </div>
    )
  }

  // Escudo original (empacotado), quando existir
  const crest = crestFor(team.id)
  const inner = crest ? (
    <div className={cx('flex shrink-0 items-center justify-center', SIZES[size], className)} title={team.name}>
      <img src={crest} alt={team.name} draggable={false} className="h-full w-full object-contain p-[6%]" />
    </div>
  ) : (
    <div
      className={cx(
        'heading flex shrink-0 items-center justify-center font-bold shadow-sm ring-1 ring-black/30',
        SIZES[size],
        className
      )}
      style={{ backgroundColor: team.color, color: contrastText(team.color) }}
      title={team.name}
    >
      {team.logo ? <span className="text-lg leading-none">{team.logo}</span> : team.shortName}
    </div>
  )

  if (!seedLabel) return inner
  return (
    <div className="relative inline-flex shrink-0">
      {inner}
      <SeedBadge label={seedLabel} />
    </div>
  )
}
