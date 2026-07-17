import { describe, it, expect } from 'vitest'
import { createTournament, simulateAll } from './tournament'
import { baseConfig, mkTeams } from '../test/fixtures'
import type { EsportsGame, Team } from '../types'

// Simula um mata-mata e-sports e devolve todas as séries jogadas
function playedSeries(bestOf: 1 | 3 | 5) {
  const t = simulateAll(
    createTournament({
      name: 'KDA',
      sport: 'esports',
      format: 'cup',
      teams: mkTeams(8, 'esports'),
      config: baseConfig({ bestOf, game: 'cs2' })
    })
  )
  return t.matches.filter((m) => m.played && m.esports)
}

/** roda N confrontos BO1 entre dois times fixos e devolve todos os mapas jogados */
function playedMaps(n: number, teams: [Team, Team], game: EsportsGame) {
  const maps = []
  for (let i = 0; i < n; i++) {
    const t = simulateAll(
      createTournament({
        name: 'OT',
        sport: 'esports',
        format: 'cup',
        teams,
        config: baseConfig({ bestOf: 1, game })
      })
    )
    for (const m of t.matches) if (m.played && m.esports) maps.push(...m.esports.maps)
  }
  return maps
}

const EVEN: [Team, Team] = [
  { id: 'a', name: 'A', shortName: 'A', strength: 75, category: 'custom', sport: 'esports', color: '#fff' },
  { id: 'b', name: 'B', shortName: 'B', strength: 75, category: 'custom', sport: 'esports', color: '#fff' }
]
const BLOWOUT: [Team, Team] = [
  { id: 'a', name: 'A', shortName: 'A', strength: 95, category: 'custom', sport: 'esports', color: '#fff' },
  { id: 'b', name: 'B', shortName: 'B', strength: 40, category: 'custom', sport: 'esports', color: '#fff' }
]

describe('e-sports — KDA coerente com a realidade', () => {
  it('cada mapa tem lines e as mortes de um time = abates do outro', () => {
    for (const m of playedSeries(3)) {
      for (const mp of m.esports!.maps) {
        expect(mp.lines, 'mapa sem lines').toBeTruthy()
        const homeL = mp.lines!.filter((l) => l.teamId === m.homeId)
        const awayL = mp.lines!.filter((l) => l.teamId === m.awayId)
        expect(homeL.length).toBe(5)
        expect(awayL.length).toBe(5)
        const kills = (ls: typeof homeL) => ls.reduce((s, l) => s + l.kills, 0)
        const deaths = (ls: typeof homeL) => ls.reduce((s, l) => s + l.deaths, 0)
        // toda morte é o abate de alguém do outro lado
        expect(deaths(homeL)).toBe(kills(awayL))
        expect(deaths(awayL)).toBe(kills(homeL))
        // volume realista: ~7-8 mortes por round disputado
        const rounds = mp.home + mp.away
        const total = kills(homeL) + kills(awayL)
        expect(total).toBeGreaterThanOrEqual(rounds * 6.5)
        expect(total).toBeLessThanOrEqual(rounds * 8.5)
      }
    }
  })

  it('a série é a soma exata dos mapas (por jogador) e totalKills bate', () => {
    for (const m of playedSeries(5)) {
      const e = m.esports!
      const sum = new Map<string, { kills: number; deaths: number; assists: number }>()
      for (const mp of e.maps) {
        for (const l of mp.lines ?? []) {
          const cur = sum.get(l.playerId) ?? { kills: 0, deaths: 0, assists: 0 }
          cur.kills += l.kills
          cur.deaths += l.deaths
          cur.assists += l.assists
          sum.set(l.playerId, cur)
        }
      }
      for (const l of e.lines) {
        const s = sum.get(l.playerId)!
        expect(l.kills).toBe(s.kills)
        expect(l.deaths).toBe(s.deaths)
        expect(l.assists).toBe(s.assists)
      }
      expect(e.totalKills[0]).toBe(
        e.lines.filter((l) => l.teamId === m.homeId).reduce((s, l) => s + l.kills, 0)
      )
      expect(e.totalKills[1]).toBe(
        e.lines.filter((l) => l.teamId === m.awayId).reduce((s, l) => s + l.kills, 0)
      )
    }
  })

  it('faixas por jogador plausíveis (sem 0 geral nem números absurdos)', () => {
    for (const m of playedSeries(3)) {
      for (const mp of m.esports!.maps) {
        for (const l of mp.lines!) {
          expect(l.kills).toBeGreaterThanOrEqual(0)
          expect(l.kills).toBeLessThanOrEqual(85) // teto folgado p/ dia inspirado em mapa de prorrogação longa
          expect(l.deaths).toBeGreaterThanOrEqual(0)
          expect(l.assists).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('saldos variados: tem jogador que carrega (+) e jogador que afunda (−)', () => {
    // num torneio inteiro, a "forma do dia" deve produzir destaques reais
    const diffs: number[] = []
    for (const m of playedSeries(5)) {
      for (const l of m.esports!.lines) diffs.push(l.kills - l.deaths)
    }
    expect(Math.max(...diffs)).toBeGreaterThanOrEqual(8)
    expect(Math.min(...diffs)).toBeLessThanOrEqual(-8)
    // e não pode ser tudo comprimido perto de zero
    const spread = Math.max(...diffs) - Math.min(...diffs)
    expect(spread).toBeGreaterThanOrEqual(20)
  })
})

describe('e-sports — prorrogação', () => {
  it('mapas sem prorrogação preservam o placar de sempre (vencedor 13, perdedor ≤ 11)', () => {
    for (const mp of playedMaps(40, EVEN, 'cs2')) {
      if (mp.overtime) continue
      expect(Math.max(mp.home, mp.away)).toBe(13)
      expect(Math.min(mp.home, mp.away)).toBeLessThanOrEqual(11)
    }
  })

  it('empate em 12-12 é possível e mais frequente entre times parelhos que em goleadas', () => {
    const evenMaps = playedMaps(300, EVEN, 'valorant')
    const blowoutMaps = playedMaps(300, BLOWOUT, 'valorant')
    const rate = (maps: typeof evenMaps) => maps.filter((m) => m.overtime).length / maps.length
    const evenRate = rate(evenMaps)
    const blowoutRate = rate(blowoutMaps)
    expect(evenRate).toBeGreaterThan(0) // empate precisa acontecer de fato
    expect(evenRate).toBeGreaterThan(blowoutRate)
  })

  it('prorrogação do Valorant sempre fecha com vantagem de exatamente 2 rounds', () => {
    const maps = playedMaps(150, EVEN, 'valorant')
    const otMaps = maps.filter((m) => m.overtime)
    expect(otMaps.length).toBeGreaterThan(0)
    for (const mp of otMaps) {
      expect(Math.min(mp.home, mp.away)).toBeGreaterThanOrEqual(12)
      expect(Math.abs(mp.home - mp.away)).toBe(2)
    }
  })

  it('prorrogação do CS2 sempre fecha com margem par entre 2 e 6 (parciais de 6 rounds)', () => {
    const maps = playedMaps(150, EVEN, 'cs2')
    const otMaps = maps.filter((m) => m.overtime)
    expect(otMaps.length).toBeGreaterThan(0)
    for (const mp of otMaps) {
      expect(Math.min(mp.home, mp.away)).toBeGreaterThanOrEqual(12)
      const margin = Math.abs(mp.home - mp.away)
      expect([2, 4, 6]).toContain(margin)
    }
  })

  it('mapa de prorrogação soma corretamente no KDA (mais rounds, mais abates, sem quebrar a paridade)', () => {
    const maps = playedMaps(80, EVEN, 'cs2').filter((m) => m.overtime)
    expect(maps.length).toBeGreaterThan(0)
    for (const mp of maps) {
      const kills = (teamId: string) => mp.lines!.filter((l) => l.teamId === teamId).reduce((s, l) => s + l.kills, 0)
      const deaths = (teamId: string) => mp.lines!.filter((l) => l.teamId === teamId).reduce((s, l) => s + l.deaths, 0)
      expect(deaths('a')).toBe(kills('b'))
      expect(deaths('b')).toBe(kills('a'))
    }
  })
})

describe('futebol — assistências', () => {
  function playedFootballGoals() {
    const t = simulateAll(
      createTournament({
        name: 'Liga',
        sport: 'football',
        format: 'league',
        teams: mkTeams(10, 'football'),
        config: baseConfig({ homeAndAway: true })
      })
    )
    return t.matches.filter((m) => m.played && m.football).flatMap((m) => m.football!.goals)
  }

  it('gol contra nunca tem assistência', () => {
    const goals = playedFootballGoals()
    for (const g of goals.filter((g) => g.ownGoal)) {
      expect(g.assistPlayerId).toBeUndefined()
    }
  })

  it('assistência, quando existe, é de um companheiro (mesmo time, jogador diferente do artilheiro)', () => {
    const goals = playedFootballGoals()
    const withAssist = goals.filter((g) => g.assistPlayerId)
    expect(withAssist.length).toBeGreaterThan(0)
    for (const g of withAssist) {
      expect(g.assistPlayerId).not.toBe(g.playerId)
      expect(g.assistPlayerName).toBeTruthy()
    }
  })

  it('proporção de gols com assistência fica perto de ~75% (numa amostra grande)', () => {
    const goals = playedFootballGoals().filter((g) => !g.ownGoal)
    expect(goals.length).toBeGreaterThan(50)
    const rate = goals.filter((g) => g.assistPlayerId).length / goals.length
    expect(rate).toBeGreaterThan(0.6)
    expect(rate).toBeLessThan(0.9)
  })
})
