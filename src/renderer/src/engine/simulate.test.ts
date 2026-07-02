import { describe, it, expect } from 'vitest'
import { createTournament, simulateAll } from './tournament'
import { baseConfig, mkTeams } from '../test/fixtures'

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
          expect(l.kills).toBeLessThanOrEqual(52) // teto folgado p/ dia inspirado em mapa longo
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
