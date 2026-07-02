import { Crosshair, Dice5, Play } from 'lucide-react'
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
  played,
  winner,
  align
}: {
  team?: Team
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
            'truncate text-sm',
            !team
              ? 'text-zinc-600'
              : winner
                ? 'font-bold text-white'
                : played
                  ? 'font-medium text-zinc-500'
                  : 'font-semibold text-zinc-200'
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
  const e = match.esports

  return (
    <div
      className={cx(
        'card group transition',
        played && 'cursor-pointer hover:border-blood-800/40 hover:bg-ink-800/80'
      )}
      onClick={() => played && onOpen?.()}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <Side team={home} played={played} winner={homeWon} align="left" />

        <div className="flex shrink-0 flex-col items-center px-1">
          {played ? (
            <div className="flex items-baseline gap-2">
              <span className={cx('tnum heading text-2xl font-bold', homeWon ? 'text-white' : 'text-zinc-500')}>
                {match.homeScore}
              </span>
              <span className="text-sm text-blood-700">×</span>
              <span className={cx('tnum heading text-2xl font-bold', awayWon ? 'text-white' : 'text-zinc-500')}>
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
          {!played && sport === 'esports' && (
            <span className="mt-0.5 text-[10px] text-zinc-600">série</span>
          )}
        </div>

        <Side team={away} played={played} winner={awayWon} align="right" />

        <div className="ml-1 flex shrink-0 items-center gap-1.5" onClick={(ev) => ev.stopPropagation()}>
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

      {/* e-sports: a história da série sem abrir o modal — mapas + MVP */}
      {played && sport === 'esports' && e && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.05] px-3.5 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {e.maps.map((mp, i) => {
              const hw = mp.home > mp.away
              return (
                <span
                  key={i}
                  title={mp.name}
                  className="tnum rounded-xl bg-ink-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-400"
                >
                  <span className={hw ? 'text-zinc-100' : ''}>{mp.home}</span>
                  <span className="text-zinc-600">–</span>
                  <span className={!hw ? 'text-zinc-100' : ''}>{mp.away}</span>
                </span>
              )
            })}
          </div>
          {e.mvp && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Crosshair size={11} className="text-blood-400" />
              <span className="font-semibold text-zinc-300">{e.mvp.name}</span>
              <span className="tnum">
                {e.mvp.kills}/{e.mvp.deaths}/{e.mvp.assists}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
