import type { BracketMatch, BracketRound, Match } from '../types'
import { uid } from './rng'

export function roundName(numTeamsInRound: number): string {
  switch (numTeamsInRound) {
    case 2:
      return 'Final'
    case 4:
      return 'Semifinal'
    case 8:
      return 'Quartas de final'
    case 16:
      return 'Oitavas de final'
    case 32:
      return 'Décimo-sextas'
    case 64:
      return 'Trigésima-segundas'
    default:
      return `Fase de ${numTeamsInRound}`
  }
}

export function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/** Ordem padrão de cabeças-de-chave (1-based) nas posições do chaveamento. */
export function standardSeedOrder(size: number): number[] {
  let pls = [1, 2]
  while (pls.length < size) {
    const sum = pls.length * 2 + 1
    const next: number[] = []
    for (const p of pls) {
      next.push(p)
      next.push(sum - p)
    }
    pls = next
  }
  return pls
}

function makeLeg(homeId: string, awayId: string, roundIndex: number, stage: string): Match {
  return {
    id: uid('m'),
    round: roundIndex,
    stage,
    homeId,
    awayId,
    played: false,
    homeScore: 0,
    awayScore: 0
  }
}

/**
 * Atribui as partidas de um confronto a um `BracketMatch`. Em ida e volta cria
 * dois jogos (mando invertido); senão, um jogo único.
 */
function assignTie(
  bm: BracketMatch,
  home: string,
  away: string,
  stage: string,
  twoLegged: boolean | undefined,
  roundIndex: number,
  out: Match[]
): void {
  if (twoLegged) {
    const ida = makeLeg(home, away, roundIndex, `${stage} · Ida`)
    const volta = makeLeg(away, home, roundIndex, `${stage} · Volta`)
    bm.legIds = [ida.id, volta.id]
    out.push(ida, volta)
  } else {
    const m = makeLeg(home, away, roundIndex, stage)
    bm.matchId = m.id
    out.push(m)
  }
}

/**
 * Constrói o chaveamento a partir de uma lista já ordenada por posição
 * (comprimento = potência de 2; null representa "bye"). Quando `twoLeggedExceptFinal`,
 * todos os confrontos são ida e volta, menos a final.
 */
export function buildBracket(
  seeded: (string | null)[],
  twoLeggedExceptFinal = false
): { bracket: BracketRound[]; matches: Match[] } {
  const size = seeded.length
  const numRounds = Math.round(Math.log2(size))
  const bracket: BracketRound[] = []

  for (let r = 0; r < numRounds; r++) {
    const teamsInRound = size / Math.pow(2, r)
    const matchesInRound = teamsInRound / 2
    const isFinal = r === numRounds - 1
    const twoLegged = twoLeggedExceptFinal && !isFinal
    const rMatches: BracketMatch[] = []
    for (let s = 0; s < matchesInRound; s++) {
      rMatches.push({
        id: uid('bm'),
        roundIndex: r,
        slot: s,
        homeId: null,
        awayId: null,
        matchId: null,
        winnerId: null
      })
    }
    bracket.push({ index: r, name: roundName(teamsInRound), matches: rMatches, twoLegged })
  }

  const matches: Match[] = []
  const r0 = bracket[0]
  for (let s = 0; s < r0.matches.length; s++) {
    const home = seeded[2 * s] ?? null
    const away = seeded[2 * s + 1] ?? null
    const bm = r0.matches[s]
    bm.homeId = home
    bm.awayId = away
    if (home && away) {
      assignTie(bm, home, away, r0.name, r0.twoLegged, 0, matches)
    } else if (home && !away) {
      bm.winnerId = home // bye
    } else if (!home && away) {
      bm.winnerId = away // bye
    }
  }

  return { bracket, matches }
}

/** vencedor de um confronto (agregado quando ida e volta) já decidido */
function tieWinner(bm: BracketMatch, find: (id: string) => Match | undefined): string | null {
  if (bm.legIds && bm.legIds.length === 2) {
    const volta = find(bm.legIds[1])
    // o vencedor do agregado é gravado no jogo de volta (decisivo)
    return volta?.played ? (volta.winnerId ?? null) : null
  }
  if (bm.matchId) {
    const m = find(bm.matchId)
    return m?.winnerId ?? null
  }
  return null
}

/**
 * Propaga vencedores das partidas jogadas para as rodadas seguintes,
 * criando novos confrontos quando ambos os lados são conhecidos.
 */
export function advanceBracket(
  bracketIn: BracketRound[],
  matchesIn: Match[]
): { bracket: BracketRound[]; matches: Match[]; champion?: string } {
  const bracket = bracketIn.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m })) }))
  const matches = matchesIn.slice()
  const findMatch = (id: string): Match | undefined => matches.find((m) => m.id === id)

  // 1) registra vencedores dos confrontos já decididos
  for (const round of bracket) {
    for (const bm of round.matches) {
      if (!bm.winnerId) {
        const w = tieWinner(bm, findMatch)
        if (w) bm.winnerId = w
      }
    }
  }

  // 2) propaga para a próxima rodada e cria confrontos
  for (let r = 0; r < bracket.length - 1; r++) {
    const cur = bracket[r]
    const next = bracket[r + 1]
    for (let s = 0; s < next.matches.length; s++) {
      const bm = next.matches[s]
      const feedA = cur.matches[2 * s]
      const feedB = cur.matches[2 * s + 1]
      if (bm.homeId == null && feedA.winnerId) bm.homeId = feedA.winnerId
      if (bm.awayId == null && feedB.winnerId) bm.awayId = feedB.winnerId
      const hasMatch = !!bm.matchId || (bm.legIds && bm.legIds.length > 0)
      if (bm.homeId && bm.awayId && !hasMatch) {
        assignTie(bm, bm.homeId, bm.awayId, next.name, next.twoLegged, r + 1, matches)
      }
    }
  }

  const final = bracket[bracket.length - 1]?.matches[0]
  const champion = final?.winnerId ?? undefined
  return { bracket, matches, champion }
}
