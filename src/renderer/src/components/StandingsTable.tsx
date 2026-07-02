import type { Sport, StandingRow, Team } from '../types'
import { TeamBadge } from './TeamBadge'
import { cx } from '../lib/cx'

export function StandingsTable({
  rows,
  teams,
  sport,
  qualifyCount = 0,
  compact = false,
  form
}: {
  rows: StandingRow[]
  teams: Record<string, Team>
  sport: Sport
  qualifyCount?: number
  compact?: boolean
  /** forma por time (🔥 embalado / ❄️ má fase) — opcional */
  form?: Record<string, 'hot' | 'cold' | null>
}) {
  const isEsports = sport === 'esports'
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
            <th className="w-8 py-2 text-center font-medium">#</th>
            <th className="py-2 text-left font-medium">Time</th>
            <th className="tnum w-9 py-2 text-center font-bold text-zinc-300">P</th>
            <th className="tnum w-8 py-2 text-center font-medium">J</th>
            <th className="tnum w-8 py-2 text-center font-medium">V</th>
            {!isEsports && <th className="tnum w-8 py-2 text-center font-medium">E</th>}
            <th className="tnum w-8 py-2 text-center font-medium">D</th>
            {!compact && (
              <>
                <th className="tnum hidden w-9 py-2 text-center font-medium sm:table-cell">{isEsports ? 'MV' : 'GP'}</th>
                <th className="tnum hidden w-9 py-2 text-center font-medium sm:table-cell">{isEsports ? 'MS' : 'GC'}</th>
              </>
            )}
            <th className="tnum w-9 py-2 text-center font-medium">SG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const team = teams[r.teamId]
            const qualifies = qualifyCount > 0 && r.rank <= qualifyCount
            // antes do time estrear, a linha fica "em repouso" (traços discretos
            // em vez de um mar de zeros) — a tabela ganha vida conforme se joga
            const idle = r.played === 0
            const num = (v: number) =>
              idle ? <span className="text-zinc-700">–</span> : <>{v}</>
            return (
              <tr
                key={r.teamId}
                className={cx(
                  'border-t border-white/[0.04] transition hover:bg-white/[0.02]',
                  qualifies && 'bg-blood-950/15'
                )}
              >
                <td className="relative py-2 text-center">
                  {qualifies && <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-blood-grad" />}
                  <span className={cx('tnum text-xs font-bold', qualifies ? 'text-blood-300' : 'text-zinc-500')}>
                    {r.rank}
                  </span>
                </td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2.5">
                    <TeamBadge team={team} size="sm" />
                    <span className={cx('truncate font-semibold', idle ? 'text-zinc-400' : 'text-zinc-100')}>
                      {team?.name ?? '—'}
                    </span>
                    {form?.[r.teamId] === 'hot' && <span title="Embalado">🔥</span>}
                    {form?.[r.teamId] === 'cold' && <span title="Má fase">❄️</span>}
                  </div>
                </td>
                <td className={cx('tnum py-2 text-center text-base font-bold', idle ? 'text-zinc-700' : 'text-white')}>
                  {idle ? '–' : r.points}
                </td>
                <td className="tnum py-2 text-center text-zinc-300">{num(r.played)}</td>
                <td className="tnum py-2 text-center text-zinc-300">{num(r.won)}</td>
                {!isEsports && <td className="tnum py-2 text-center text-zinc-300">{num(r.drawn)}</td>}
                <td className="tnum py-2 text-center text-zinc-300">{num(r.lost)}</td>
                {!compact && (
                  <>
                    <td className="tnum hidden py-2 text-center text-zinc-300 sm:table-cell">{num(r.goalsFor)}</td>
                    <td className="tnum hidden py-2 text-center text-zinc-300 sm:table-cell">{num(r.goalsAgainst)}</td>
                  </>
                )}
                <td
                  className={cx(
                    'tnum py-2 text-center font-semibold',
                    idle
                      ? 'text-zinc-700'
                      : r.goalDiff > 0
                        ? 'text-win-400/80'
                        : r.goalDiff < 0
                          ? 'text-blood-400/80'
                          : 'text-zinc-500'
                  )}
                >
                  {idle ? '–' : (r.goalDiff > 0 ? '+' : '') + r.goalDiff}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
