import { describe, it, expect } from 'vitest'
import { buildElim, advanceElim, readyElimMatches, pairAvoidRematch } from './elim'
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
function play(seeded: (string | null)[], lives: 2 | 3, seedRank?: Map<string, number>) {
  const idx = (id: string) => parseInt(id.slice(1), 10)
  let built = buildElim(seeded, lives)
  let bracket: BracketRound[] = built.bracket
  let matches: Match[] = built.matches
  let adv = advanceElim(bracket, matches, seedRank)
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
    adv = advanceElim(bracket, matches, seedRank)
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

describe('eliminação múltipla — ressorteio evita revanches', () => {
  const key = (a: string, b: string) => [a, b].sort().join('|')

  // Revanches que o ressorteio DEVERIA evitar: quando a rodada tinha ≥2
  // confrontos (havia com quem trocar). Finais de 1 confronto (LB final) são
  // 1v1 forçados — revanche ali é inevitável e aceitável.
  const avoidableRematches = (r: ReturnType<typeof play>): number => {
    // tamanho da rodada de cada partida + ordem cronológica
    const roundSize = new Map<string, number>()
    const isGf = new Map<string, boolean>()
    for (const rd of r.bracket) {
      const size = rd.matches.filter((bm) => bm.matchId).length
      for (const bm of rd.matches) if (bm.matchId) {
        roundSize.set(bm.matchId, size)
        isGf.set(bm.matchId, bm.section === 'gf')
      }
    }
    const played = r.matches.filter((m) => m.played) // ordem de criação ≈ cronológica
    const seen = new Set<string>()
    let bad = 0
    for (const m of played) {
      const k = key(m.homeId, m.awayId)
      const rematch = seen.has(k) // a dupla já se enfrentou ANTES
      if (rematch && !isGf.get(m.id) && (roundSize.get(m.id) ?? 1) >= 2) bad++
      seen.add(k)
    }
    return bad
  }

  it('8 times (dupla): zero revanches evitáveis em 30 sorteios', () => {
    for (let trial = 0; trial < 30; trial++) {
      const r = play(seed(8), 2)
      expect(r.champion).toBeTruthy()
      expect(avoidableRematches(r), `sorteio ${trial}`).toBe(0)
    }
  })

  // Em brackets grandes, o histórico denso pode tornar UMA revanche
  // combinatoriamente inevitável mesmo com pareamento ótimo — mas é raro.
  for (const [n, limit] of [
    [16, 2],
    [32, 3]
  ] as const) {
    it(`${n} times (dupla): revanches evitáveis raras (≤ ${limit}/torneio, 30 sorteios)`, () => {
      let worst = 0
      let total = 0
      for (let trial = 0; trial < 30; trial++) {
        const bad = avoidableRematches(play(seed(n), 2))
        worst = Math.max(worst, bad)
        total += bad
      }
      expect(worst).toBeLessThanOrEqual(limit)
      // na média, quase sempre zero
      expect(total / 30).toBeLessThan(0.5)
    })
  }

  it('tripla 8 times: zero revanches evitáveis', () => {
    for (let trial = 0; trial < 15; trial++) {
      const r = play(seed(8), 3)
      expect(r.champion).toBeTruthy()
      expect(avoidableRematches(r)).toBe(0)
    }
  })
})

describe('eliminação múltipla — byes (não potência de 2)', () => {
  it('6 times (padded p/ 8) completam sem travar', () => {
    const r = play(seed(6), 2)
    expect(r.champion).toBe('t0')
    expect(readyElimMatches(r).length).toBe(0)
  })
})

describe('pairAvoidRematch — prioriza seed quando fornecido', () => {
  it('com mais de uma opção sem revanche, pareia melhor-remanescente com pior-remanescente', () => {
    const seedRank = new Map([
      ['t0', 1],
      ['t1', 2],
      ['t2', 3],
      ['t3', 4]
    ])
    const noRematch = () => false // ninguém jogou ainda — qualquer pareamento é válido
    const pairs = pairAvoidRematch(['t2', 't0', 't3', 't1'], noRematch, seedRank)
    const has = (a: string, b: string) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
    // melhor (t0) com o pior (t3); o segundo par fecha entre os dois do meio
    expect(has('t0', 't3')).toBe(true)
    expect(has('t1', 't2')).toBe(true)
  })

  it('fuga de revanche continua valendo mesmo com seed (critério secundário)', () => {
    const seedRank = new Map([
      ['t0', 1],
      ['t1', 2],
      ['t2', 3],
      ['t3', 4]
    ])
    // t0 já jogou contra t3 (o pareamento "ideal" por seed) — precisa fugir dessa revanche
    const played = (a: string, b: string) => (a === 't0' && b === 't3') || (a === 't3' && b === 't0')
    const pairs = pairAvoidRematch(['t2', 't0', 't3', 't1'], played, seedRank)
    const has = (a: string, b: string) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
    expect(has('t0', 't3')).toBe(false)
  })

  it('sem seedRank, cai no sorteio de sempre (defensivo) e ainda evita revanche', () => {
    const played = (a: string, b: string) => (a === 't0' && b === 't1') || (a === 't1' && b === 't0')
    const pairs = pairAvoidRematch(['t0', 't1', 't2', 't3'], played)
    const has = (a: string, b: string) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
    expect(has('t0', 't1')).toBe(false)
    expect(pairs).toHaveLength(2)
  })
})

describe('eliminação múltipla — ressorteio com seed não muda o resultado, só a justiça', () => {
  for (const n of [8, 16, 32]) {
    it(`${n} times: com seedRank, campeão continua o seed 1 e sem revanches evitáveis`, () => {
      const seeded = seed(n)
      const seedRank = new Map(seeded.map((id, i) => [id!, i + 1]))
      const r = play(seeded, 2, seedRank)
      expect(r.champion).toBe('t0')
      expect(readyElimMatches(r).length).toBe(0)
    })
  }
})
