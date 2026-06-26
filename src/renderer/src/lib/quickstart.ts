// Início rápido: monta um CreateInput pronto (a partir de um modelo ou aleatório)
// para criar o campeonato e cair direto na tela de torneio, sem passar pelo Setup.
import type { BestOf, EsportsGame, Format, Sport, Team, TournamentConfig } from '../types'
import type { CreateInput } from '../engine/tournament'
import type { ChampionshipPreset } from '../data/championships'
import { presetsForSport } from '../data/teams'

function poolFor(
  sport: Sport,
  customTeams: Team[],
  overrides: Record<string, Partial<Team>>
): Team[] {
  return [...presetsForSport(sport), ...customTeams.filter((t) => t.sport === sport)].map((t) =>
    overrides[t.id] ? { ...t, ...overrides[t.id] } : t
  )
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** CreateInput a partir de um modelo de campeonato (mesma lógica do Setup, sem UI). */
export function championshipInput(
  c: ChampionshipPreset,
  customTeams: Team[],
  overrides: Record<string, Partial<Team>>
): CreateInput {
  const byId = new Map(poolFor(c.sport, customTeams, overrides).map((t) => [t.id, t]))
  const teams = c.teamIds.map((id) => byId.get(id)).filter(Boolean) as Team[]
  return {
    name: c.label,
    sport: c.sport,
    format: c.format,
    teams,
    config: {
      pureRandom: false,
      chaos: 0,
      momentum: false,
      homeAndAway: c.config.homeAndAway ?? false,
      bestOf: c.config.bestOf ?? 3,
      game: c.sport === 'esports' ? c.game ?? 'cs2' : undefined,
      groupCount: c.config.groupCount ?? 4,
      qualifiersPerGroup: c.config.qualifiersPerGroup ?? 2,
      swissRounds: c.config.swissRounds ?? 5,
      playoffQualifiers: 8,
      twoLeggedKO: false
    }
  }
}

const RANDOM_NAMES = [
  'Copa Relâmpago',
  'Liga dos Bravos',
  'Torneio Surpresa',
  'Copa do Caos',
  'Desafio Aleatório',
  'Copa da Zebra',
  'Torneio dos Audazes',
  'Copa Improvável',
  'Grande Prêmio'
]

/** CreateInput totalmente aleatório, mas sempre VÁLIDO para o formato sorteado. */
export function randomInput(
  customTeams: Team[],
  overrides: Record<string, Partial<Team>>
): CreateInput {
  const sport: Sport = Math.random() < 0.5 ? 'football' : 'esports'
  const pool = poolFor(sport, customTeams, overrides)
  const format: Format = pick(['league', 'cup', 'groups', 'swiss', 'league-playoffs'])

  const cfg: TournamentConfig = {
    pureRandom: false,
    chaos: pick([0, 0.35, 0.7, 1]),
    momentum: Math.random() < 0.5,
    homeAndAway: false,
    bestOf: (sport === 'esports' ? pick([1, 3, 5]) : 3) as BestOf,
    game: sport === 'esports' ? pick(['cs2', 'valorant'] as EsportsGame[]) : undefined,
    groupCount: 4,
    qualifiersPerGroup: 2,
    swissRounds: 5,
    playoffQualifiers: 8,
    twoLeggedKO: false
  }

  let n: number
  if (format === 'league') {
    n = pick([8, 10, 12, 14, 16, 18, 20])
    cfg.homeAndAway = Math.random() < 0.5
  } else if (format === 'cup') {
    n = pick([8, 16])
    cfg.twoLeggedKO = sport === 'football' && Math.random() < 0.4
  } else if (format === 'swiss') {
    n = pick([8, 12, 16])
    cfg.swissRounds = pick([4, 5])
  } else if (format === 'league-playoffs') {
    n = pick([8, 10, 12])
    cfg.playoffQualifiers = pick([4, 6, 8])
    cfg.homeAndAway = Math.random() < 0.4
  } else {
    const g = pick([2, 4, 8])
    const per = pick([3, 4])
    n = g * per
    cfg.groupCount = g
    cfg.qualifiersPerGroup = 2
  }

  n = Math.min(n, pool.length)
  if (format === 'league-playoffs') cfg.playoffQualifiers = Math.min(cfg.playoffQualifiers ?? 8, n)

  const teams = shuffle(pool).slice(0, n)
  return { name: pick(RANDOM_NAMES), sport, format, teams, config: cfg }
}
