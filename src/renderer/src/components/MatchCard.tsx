import { Dice5, Play } from 'lucide-react'
import type { Match, Sport, Team } from '../types'
import { TeamBadge } from './TeamBadge'
import { cx } from '../lib/cx'

interface Props {
  match: Match
  home?: Team
  away?: Team
  sport: Sport
  onSimulate?: () => void
  onReRoll?: () => void
  onOpen?: () => void
}

function Side({
  team,
  score,
  played,
  winner,
  align
}: {
  team?: Team
  score: number
  played: boolean
  winner: boolean
  align: 'left' | 'right'
}) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-1 items-center gap-2.5',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamBadge team={team} size="md" />
      <div className="min-w-0">
        <p
          className={cx(
            'truncate text-sm font-semibold',
            !team ? 'text-zinc-600' : winner ? 'text-white' : played ? 'text-zinc-500' : 'text-zinc-200'
          )}
        >
          {team?.name ?? 'A definir'}
        </p>
      </div>
    </div>
  )
}

export function MatchCard({ match, home, away, sport, onSimulate, onReRoll, onOpen }: Props) {
  const played = match.played
  const homeWon = played && (match.winnerId ? match.winnerId === match.homeId : match.homeScore > match.awayScore)
  const awayWon = played && (match.winnerId ? match.winnerId === match.awayId : match.awayScore > match.homeScore)
  const canPlay = !played && home && away

  return (
    <div
      className={cx(
        'card group flex items-center gap-3 px-3.5 py-3 transition',
        played && 'cursor-pointer hover:border-white/10 hover:bg-ink-800/80'
      )}
      onClick={() => played && onOpen?.()}
    >
      <Side team={home} score={match.homeScore} played={played} winner={homeWon} align="left" />

      <div className="flex shrink-0 flex-col items-center">
        {played ? (
          <div className="flex items-center gap-1.5">
            <span className={cx('tnum text-xl font-bold heading', homeWon ? 'text-white' : 'text-zinc-400')}>
              {match.homeScore}
            </span>
            <span className="text-zinc-600">:</span>
            <span className={cx('tnum text-xl font-bold heading', awayWon ? 'text-white' : 'text-zinc-400')}>
              {match.awayScore}
            </span>
          </div>
        ) : (
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">vs</span>
        )}
        {played && match.penalties && (
          <span className="text-[10px] font-semibold text-blood-300">
            pên. {match.penalties[0]}-{match.penalties[1]}
          </span>
        )}
        {played && match.extraTime && !match.penalties && (
          <span className="text-[10px] font-semibold text-zinc-500">após prorrog.</span>
        )}
        {!played && sport === 'esports' && match.esports == null && (
          <span className="mt-0.5 text-[10px] text-zinc-600">série</span>
        )}
      </div>

      <Side team={away} score={match.awayScore} played={played} winner={awayWon} align="right" />

      <div className="ml-1 flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {canPlay && onSimulate && (
          <button
            onClick={onSimulate}
            className="no-drag flex h-9 items-center gap-1.5 rounded-lg bg-blood-grad px-3 text-xs font-bold text-white shadow-glow-sm transition hover:brightness-110 active:scale-95"
            title="Simular esta partida"
          >
            <Play size={13} fill="currentColor" />
          </button>
        )}
        {played && onReRoll && (
          <button
            onClick={onReRoll}
            className="no-drag flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-zinc-500 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
            title="Sortear novamente"
          >
            <Dice5 size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
