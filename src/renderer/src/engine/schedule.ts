import type { Match } from '../types'
import { shuffle, uid } from './rng'

interface Pairing {
  round: number
  homeId: string
  awayId: string
}

/**
 * Gera um calendário de pontos corridos (método do círculo).
 * Suporta turno único ou turno e returno (ida e volta).
 */
export function roundRobinPairings(teamIds: string[], doubleRound: boolean): Pairing[] {
  const teams = shuffle(teamIds)
  const hasBye = teams.length % 2 !== 0
  if (hasBye) teams.push('__BYE__')

  const n = teams.length
  const roundsCount = n - 1
  const half = n / 2
  const pairings: Pairing[] = []

  const arr = teams.slice()
  for (let r = 0; r < roundsCount; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a === '__BYE__' || b === '__BYE__') continue
      // alterna mando para distribuir jogos em casa
      const homeFirst = (r + i) % 2 === 0
      pairings.push({
        round: r + 1,
        homeId: homeFirst ? a : b,
        awayId: homeFirst ? b : a
      })
    }
    // rotação: fixa o primeiro, gira o resto
    arr.splice(1, 0, arr.pop() as string)
  }

  if (doubleRound) {
    const second = pairings.map((p) => ({
      round: p.round + roundsCount,
      homeId: p.awayId,
      awayId: p.homeId
    }))
    return [...pairings, ...second]
  }
  return pairings
}

export function buildLeagueMatches(teamIds: string[], doubleRound: boolean): Match[] {
  const pairings = roundRobinPairings(teamIds, doubleRound)
  return pairings.map((p) => ({
    id: uid('m'),
    round: p.round,
    stage: `Rodada ${p.round}`,
    homeId: p.homeId,
    awayId: p.awayId,
    played: false,
    homeScore: 0,
    awayScore: 0
  }))
}
