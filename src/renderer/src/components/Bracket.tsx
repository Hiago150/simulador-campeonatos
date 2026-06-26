import { Play, Trophy } from 'lucide-react'
import type { BracketMatch, BracketRound, Match, Sport, Team } from '../types'
import { TeamBadge } from './TeamBadge'
import { cx } from '../lib/cx'

interface Props {
  bracket: BracketRound[]
  matches: Match[]
  teams: Record<string, Team>
  sport: Sport
  onSimulate: (matchId: string) => void
  onOpen: (match: Match) => void
}

function Row({
  team,
  score,
  isWinner,
  played,
  bye
}: {
  team?: Team
  score?: number
  isWinner: boolean
  played: boolean
  bye?: boolean
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-2 px-2.5 py-1.5',
        isWinner && played ? 'bg-blood-950/25' : ''
      )}
    >
      <TeamBadge team={team} size="sm" />
      <span
        className={cx(
          'flex-1 truncate text-xs font-semibold',
          !team ? 'text-zinc-600' : isWinner ? 'text-white' : played ? 'text-zinc-500' : 'text-zinc-300'
        )}
      >
        {team?.name ?? (bye ? '—' : 'A definir')}
      </span>
      {played && score != null && (
        <span className={cx('tnum text-sm font-bold', isWinner ? 'text-white' : 'text-zinc-500')}>{score}</span>
      )}
    </div>
  )
}

function BracketCard({ bm, matches, teams, onSimulate, onOpen }: Omit<Props, 'bracket' | 'sport'> & { bm: BracketMatch }) {
  const find = (id: string): Match | undefined => matches.find((m) => m.id === id)
  const twoLeg = !!(bm.legIds && bm.legIds.length === 2)
  const leg1 = twoLeg ? find(bm.legIds![0]) : undefined
  const leg2 = twoLeg ? find(bm.legIds![1]) : undefined
  const single = !twoLeg && bm.matchId ? find(bm.matchId) : undefined

  const home = bm.homeId ? teams[bm.homeId] : undefined
  const away = bm.awayId ? teams[bm.awayId] : undefined
  const isBye = !single && !twoLeg && !!bm.winnerId

  // placar exibido: agregado (ida e volta) ou o jogo único
  let played = false
  let homeScore: number | undefined
  let awayScore: number | undefined
  let legsLabel: string | undefined
  let penalties: [number, number] | undefined
  let openMatch: Match | undefined
  let nextToSim: string | undefined

  if (twoLeg) {
    played = !!(leg1?.played && leg2?.played)
    if (leg1?.played && leg2?.played) {
      // home(A) jogou em casa na ida e fora na volta
      homeScore = leg1.homeScore + leg2.awayScore
      awayScore = leg1.awayScore + leg2.homeScore
    }
    const idaTxt = leg1?.played ? `${leg1.homeScore}-${leg1.awayScore}` : '–'
    const voltaTxt = leg2?.played ? `${leg2.homeScore}-${leg2.awayScore}` : '–'
    if (leg1?.played || leg2?.played) legsLabel = `Ida ${idaTxt} · Volta ${voltaTxt}`
    penalties = leg2?.penalties
    openMatch = leg2?.played ? leg2 : leg1?.played ? leg1 : undefined
    nextToSim = leg1 && !leg1.played ? leg1.id : leg2 && !leg2.played ? leg2.id : undefined
  } else {
    played = !!single?.played
    homeScore = single?.homeScore
    awayScore = single?.awayScore
    penalties = single?.penalties
    openMatch = single
    nextToSim = single && !single.played ? single.id : undefined
  }

  const winnerId = bm.winnerId
  const homeWin = played && (winnerId ? winnerId === bm.homeId : (homeScore ?? 0) > (awayScore ?? 0))
  const awayWin = played && (winnerId ? winnerId === bm.awayId : (awayScore ?? 0) > (homeScore ?? 0))

  return (
    <div
      className={cx(
        'card w-56 divide-y divide-white/5 overflow-hidden transition',
        openMatch && 'cursor-pointer hover:border-white/15'
      )}
      onClick={() => openMatch && onOpen(openMatch)}
    >
      <Row team={home} score={homeScore} isWinner={homeWin} played={played} bye={isBye} />
      <Row team={away} score={awayScore} isWinner={awayWin} played={played} bye={isBye} />
      {nextToSim && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSimulate(nextToSim!)
          }}
          className="no-drag flex w-full items-center justify-center gap-1.5 bg-blood-grad/90 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          <Play size={11} fill="currentColor" /> Simular{twoLeg ? (leg1 && !leg1.played ? ' ida' : ' volta') : ''}
        </button>
      )}
      {legsLabel && (
        <div className="bg-ink-900 py-1 text-center text-[10px] font-semibold text-zinc-500">{legsLabel}</div>
      )}
      {played && penalties && (
        <div className="bg-ink-900 py-1 text-center text-[10px] font-semibold text-blood-300">
          Pênaltis {penalties[0]}-{penalties[1]}
        </div>
      )}
      {isBye && (
        <div className="bg-ink-900 py-1 text-center text-[10px] font-semibold text-zinc-500">classificado (bye)</div>
      )}
    </div>
  )
}

export function Bracket({ bracket, matches, teams, sport, onSimulate, onOpen }: Props) {
  const champion = bracket[bracket.length - 1]?.matches[0]?.winnerId
  const champTeam = champion ? teams[champion] : undefined

  return (
    <div className="flex w-max gap-6 pb-2">
      {bracket.map((round) => (
        <div key={round.index} className="flex min-w-[14rem] flex-col">
          <div className="mb-3 text-center">
            <span className="tag bg-ink-800 text-zinc-400">{round.name}</span>
          </div>
          <div className="flex flex-1 flex-col justify-around gap-4">
            {round.matches.map((bm) => (
              <BracketCard
                key={bm.id}
                bm={bm}
                matches={matches}
                teams={teams}
                onSimulate={onSimulate}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Coluna do campeão */}
      <div className="flex min-w-[14rem] flex-col justify-center">
        <div className="mb-3 text-center">
          <span className="tag bg-blood-grad text-white">Campeão</span>
        </div>
        <div
          className={cx(
            'card flex flex-col items-center gap-3 px-4 py-6 text-center',
            champTeam && 'border-blood-700/50 shadow-glow'
          )}
        >
          <Trophy size={28} className={champTeam ? 'text-blood-400' : 'text-zinc-700'} />
          {champTeam ? (
            <>
              <TeamBadge team={champTeam} size="lg" />
              <span className="heading text-base font-bold text-white">{champTeam.name}</span>
            </>
          ) : (
            <span className="text-sm text-zinc-600">A decidir</span>
          )}
        </div>
      </div>
    </div>
  )
}
