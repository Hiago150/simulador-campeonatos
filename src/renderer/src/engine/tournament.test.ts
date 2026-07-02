import { describe, it, expect } from 'vitest'
import { createTournament, simulateAll, chaosOf } from './tournament'
import { progress } from './selectors'
import type { Format, Sport, TournamentConfig } from '../types'
import { baseConfig, mkTeams } from '../test/fixtures'

describe('engine — todos os formatos simulam até o fim', () => {
  const cases: { format: Format; n: number; sport?: Sport; over?: Partial<TournamentConfig>; label?: string }[] = [
    { format: 'league', n: 8 },
    { format: 'cup', n: 8 },
    { format: 'cup', n: 8, over: { twoLeggedKO: true }, label: 'cup (ida e volta)' },
    { format: 'groups', n: 16 },
    { format: 'swiss', n: 8 },
    { format: 'league-playoffs', n: 8, over: { playoffQualifiers: 4 } },
    { format: 'league', n: 8, sport: 'esports', label: 'league (e-sports)' }
  ]

  for (const c of cases) {
    it(`${c.label ?? c.format} termina com campeão e tudo simulado`, () => {
      const sport = c.sport ?? 'football'
      const t0 = createTournament({
        name: 'Teste',
        sport,
        format: c.format,
        teams: mkTeams(c.n, sport),
        config: baseConfig({ game: sport === 'esports' ? 'cs2' : undefined, ...c.over })
      })
      const t = simulateAll(t0)
      expect(t.phase).toBe('finished')
      expect(t.champion).toBeTruthy()
      const p = progress(t)
      expect(p.total).toBeGreaterThan(0)
      expect(p.played).toBe(p.total)
    })
  }
})

describe('engine — mata-mata ida e volta', () => {
  it('cria pernas (legIds) e decide pelo agregado', () => {
    const t0 = createTournament({
      name: 'IdaVolta',
      sport: 'football',
      format: 'cup',
      teams: mkTeams(8),
      config: baseConfig({ twoLeggedKO: true })
    })
    const hasLegs = (t0.bracket ?? []).some((r) =>
      r.matches.some((bm) => Array.isArray(bm.legIds) && bm.legIds.length === 2)
    )
    expect(hasLegs).toBe(true)
    const t = simulateAll(t0)
    expect(t.champion).toBeTruthy()
  })
})

describe('engine — chaosOf (compatibilidade)', () => {
  it('chaos tem precedência; pureRandom legado vira 1', () => {
    expect(chaosOf({ pureRandom: true, homeAndAway: false, bestOf: 3, groupCount: 4, qualifiersPerGroup: 2, swissRounds: 5 })).toBe(1)
    expect(chaosOf(baseConfig({ chaos: 0.5 }))).toBe(0.5)
    // chaos = 0 não é nulo → tem precedência sobre pureRandom
    expect(chaosOf(baseConfig({ chaos: 0, pureRandom: true }))).toBe(0)
  })
})
