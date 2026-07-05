import { describe, it, expect } from 'vitest'
import { buildElim, advanceElim, readyElimMatches } from './elim'
import { standardSeedOrder, nextPowerOf2 } from './bracket'
import type { BracketRound, Match } from '../types'

// semeia N times ('t0' o mais forte) no padrão, com byes se N não for potência de 2
function seed(n: number): (string | null)[] {
  const size = nextPowerOf2(n)
  const order = standardSeedOrder(size)
  const ids = Array.from({ length: n }, (_, i) => `t${i}`)
  return order.map((s) => ids[s - 1] ?? null)
}

// joga a chave até o fim; o time de índice menor (mais forte) sempre vence
function play(seeded: (string | null)[], lives: 2 | 3) {
  const idx = (id: string) => parseInt(id.slice(1), 10)
  let built = buildElim(seeded, lives)
  let bracket: BracketRound[] = built.bracket
  let matches: Match[] = built.matches
  let adv = advanceElim(bracket, matches)
  bracket = adv.bracket
  matches = adv.matches
  let champion: string | undefined = adv.champion
  let guard = 0
  let played = 0
  while (!champion && guard++ < 1000) {
    const ready = readyElimMatches({ bracket, matches })
    if (ready.length === 0) break
    for (const id of ready) {
      const m = matches.find((x) => x.id === id)!
      const winner = idx(m.homeId) <= idx(m.awayId) ? m.homeId : m.awayId
      Object.assign(m, {
        played: true,
        winnerId: winner,
        homeScore: winner === m.homeId ? 1 : 0,
        awayScore: winner === m.awayId ? 1 : 0
      })
      played++
    }
    adv = advanceElim(bracket, matches)
    bracket = adv.bracket
    matches = adv.matches
    champion = adv.champion
  }
  return { champion, bracket, matches, played }
}

describe('eliminação múltipla — dupla', () => {
  for (const n of [8, 16, 32]) {
    it(`${n} times chega a um campeão (top seed vence)`, () => {
      const r = play(seed(n), 2)
      expect(r.champion).toBe('t0')
      // nenhuma partida ficou pronta e não jogada
      expect(readyElimMatches(r).length).toBe(0)
      // mais partidas que uma eliminação simples (dupla ~ 2N)
      expect(r.played).toBeGreaterThan(n)
    })
  }

  it('grande final tem reset: se o desafiante vence a 1ª, joga-se a 2ª', () => {
    // força o desafiante (t1) a vencer a primeira grande final e o campeão dos
    // winners (t0) a vencer o reset → campeão final = t0
    let { bracket, matches } = buildElim(seed(8), 2)
    ;({ bracket, matches } = advanceElim(bracket, matches))
    const idx = (id: string) => parseInt(id.slice(1), 10)
    let champion: string | undefined
    let guard = 0
    let gf1Done = false
    while (!champion && guard++ < 1000) {
      const ready = readyElimMatches({ bracket, matches })
      if (ready.length === 0) break
      for (const id of ready) {
        const m = matches.find((x) => x.id === id)!
        const bm = bracket.flatMap((r) => r.matches).find((b) => b.matchId === id)!
        const isGf = bm.section === 'gf' && !bm.resetOf
        // na 1ª grande final o desafiante (visitante) vence; no resto o mais forte vence
        let winner: string
        if (isGf && !gf1Done) {
          winner = m.awayId
          gf1Done = true
        } else {
          winner = idx(m.homeId) <= idx(m.awayId) ? m.homeId : m.awayId
        }
        Object.assign(m, {
          played: true,
          winnerId: winner,
          homeScore: winner === m.homeId ? 1 : 0,
          awayScore: winner === m.awayId ? 1 : 0
        })
      }
      const adv = advanceElim(bracket, matches)
      bracket = adv.bracket
      matches = adv.matches
      champion = adv.champion
    }
    expect(gf1Done).toBe(true)
    expect(champion).toBe('t0') // t0 perdeu a 1ª GF mas venceu o reset
  })
})

describe('eliminação múltipla — tripla', () => {
  for (const n of [8, 16]) {
    it(`${n} times: 3 chaves (winners/losers/última chance) chegam a um campeão`, () => {
      const r = play(seed(n), 3)
      expect(r.champion).toBe('t0')
      expect(readyElimMatches(r).length).toBe(0)
      // tem seção de última chance
      const hasLcb = r.bracket.some((rd) => rd.section === 'lcb')
      expect(hasLcb).toBe(true)
    })
  }
})

describe('eliminação múltipla — byes (não potência de 2)', () => {
  it('6 times (padded p/ 8) completam sem travar', () => {
    const r = play(seed(6), 2)
    expect(r.champion).toBe('t0')
    expect(readyElimMatches(r).length).toBe(0)
  })
})
