// Utilidades de teste (não é um arquivo de teste — não casa com *.test.ts).
import type { Sport, Team, TournamentConfig } from '../types'

/** times sintéticos com forças variadas, sem depender da base real. */
export function mkTeams(n: number, sport: Sport = 'football'): Team[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    name: `Time ${i + 1}`,
    shortName: `T${i + 1}`.slice(0, 3),
    strength: 50 + ((i * 7) % 45),
    category: 'custom' as const,
    sport,
    color: '#888888'
  }))
}

/** config válida com todos os campos obrigatórios; sobrescreva o que precisar. */
export function baseConfig(over: Partial<TournamentConfig> = {}): TournamentConfig {
  return {
    pureRandom: false,
    chaos: 0.3,
    homeAndAway: false,
    bestOf: 3,
    groupCount: 4,
    qualifiersPerGroup: 2,
    swissRounds: 5,
    ...over
  }
}
