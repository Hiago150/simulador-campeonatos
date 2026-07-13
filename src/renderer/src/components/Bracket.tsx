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
  /** campeão já conhecido (dupla/tripla eliminação: a última rodada pode ficar sem vencedor) */
  champion?: string
  /** selo de seed por time (ex.: "EMEA #2") — opcional, só quando o campeonato tem essa informação */
  seedLabels?: Record<string, string>
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
        'flex items-center gap-1.5 px-2 py-1',
        isWinner && played ? 'bg-blood-600/30' : played ? 'bg-white/[0.02]' : ''
      )}
    >
      <TeamBadge team={team} size="xs" />
      <span
        className={cx(
          'flex-1 truncate text-[11px] font-bold uppercase tracking-wide',
          !team ? 'text-zinc-700' : isWinner ? 'text-white' : played ? 'text-zinc-600' : 'text-zinc-300'
        )}
        title={team?.name}
      >
        {team?.shortName ?? (bye ? '—' : '???')}
      </span>
      {played && score != null && (
        <span className={cx('tnum shrink-0 text-xs font-black', isWinner ? 'text-white' : 'text-zinc-600')}>
          {score}
        </span>
      )}
    </div>
  )
}

function BracketCard({
  bm,
  matches,
  teams,
  onSimulate,
  onOpen
}: Omit<Props, 'bracket' | 'sport' | 'seedLabels'> & { bm: BracketMatch }) {
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
    openMatch = leg2?.played ? leg2 : leg1?.played ? leg1 : (leg1 ?? leg2)
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
        'card w-40 divide-y divide-white/5 overflow-hidden transition',
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
          className="no-drag flex w-full items-center justify-center gap-1 bg-blood-grad/90 py-1 text-[10px] font-bold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          <Play size={9} fill="currentColor" /> Simular{twoLeg ? (leg1 && !leg1.played ? ' ida' : ' volta') : ''}
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

const SECTION_LABEL: Record<string, string> = {
  wb: 'Chave superior',
  lb: 'Chave inferior',
  lcb: 'Última chance',
  gf: 'Grande final'
}

// Alinhamento em funil (só mata-mata simples, sem ressorteio): a rodada
// seguinte fica centralizada no meio do par que a alimenta, dobrando o gap
// horizontal a cada geração — sem medir nada via DOM, só com a largura fixa
// do card (w-40) e o gap base de hoje (gap-3).
const CARD_W = 160
const BASE_GAP = 12

function gapForGen(gen: number): number {
  return (2 ** gen - 1) * CARD_W + 2 ** gen * BASE_GAP
}

/** "Cotovelo" do conector: une um par de cards na rodada de baixo. */
function PairConnector({ gap }: { gap: number }) {
  const leftCenter = CARD_W / 2
  const rightCenter = CARD_W + gap + CARD_W / 2
  const mid = (2 * CARD_W + gap) / 2
  return (
    <div className="relative h-6 shrink-0" style={{ width: 2 * CARD_W + gap }}>
      <span className="absolute top-0 h-1/2 w-px bg-blood-500/60" style={{ left: leftCenter }} />
      <span className="absolute top-0 h-1/2 w-px bg-blood-500/60" style={{ left: rightCenter }} />
      <span
        className="absolute top-1/2 h-px bg-blood-500/60"
        style={{ left: leftCenter, width: rightCenter - leftCenter }}
      />
      <span className="absolute bottom-0 h-1/2 w-px bg-blood-500/60" style={{ left: mid }} />
    </div>
  )
}

export function Bracket({
  bracket,
  matches,
  teams,
  sport,
  onSimulate,
  onOpen,
  champion: championProp,
  seedLabels
}: Props) {
  const champion = championProp ?? bracket[bracket.length - 1]?.matches[0]?.winnerId
  const champTeam = champion ? teams[champion] : undefined

  let lastSection: string | undefined

  // geração do funil por rodada (null = fora do funil): mata-mata simples
  // (sem `section`) com até 4 jogos entra; uma vez que a série de rodadas
  // elegíveis começa, ela vai até o fim (o tamanho só cai pela metade).
  let streak = -1
  const funnelGen = bracket.map((round) => {
    const eligible = !round.section && round.matches.length <= 4
    if (!eligible) {
      streak = -1
      return null
    }
    streak = streak + 1
    return streak
  })

  return (
    <div className="flex flex-col gap-5">
      {bracket.map((round, i) => {
        const section = round.section
        const showSectionHeader = !!section && section !== lastSection
        lastSection = section
        const gen = funnelGen[i]
        const rowGap = gen !== null ? gapForGen(gen) : BASE_GAP
        const showConnector = gen !== null && funnelGen[i + 1] !== null

        return (
          <div key={round.index}>
            {showSectionHeader && (
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-blood-400">
                {SECTION_LABEL[section!] ?? section}
              </p>
            )}
            <div className="mb-2">
              <span className="tag bg-ink-800 text-zinc-400">{round.name}</span>
            </div>
            <div
              className={cx('flex flex-wrap justify-center', gen === null && 'gap-3')}
              style={gen !== null ? { gap: rowGap } : undefined}
            >
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
            {showConnector && (
              <div className="flex justify-center" style={{ gap: rowGap }}>
                {Array.from({ length: round.matches.length / 2 }).map((_, p) => (
                  <PairConnector key={p} gap={rowGap} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {funnelGen[funnelGen.length - 1] !== null && (
        <div className="flex justify-center">
          <div className="h-5 w-px bg-blood-500/60" />
        </div>
      )}

      {/* Campeão */}
      <div className="flex flex-col items-center gap-3 border-t border-white/5 pt-5">
        <span className="tag bg-blood-grad text-white">Campeão</span>
        <div
          className={cx(
            'card flex flex-col items-center gap-3 px-6 py-6 text-center',
            champTeam && 'border-blood-700/50 shadow-glow'
          )}
        >
          <Trophy size={28} className={champTeam ? 'text-blood-400' : 'text-zinc-700'} />
          {champTeam ? (
            <>
              <TeamBadge team={champTeam} size="lg" seedLabel={seedLabels?.[champTeam.id]} />
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
