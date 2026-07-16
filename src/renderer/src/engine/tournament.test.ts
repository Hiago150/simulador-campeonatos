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

describe('engine — seed por posição de chegada (arrivals)', () => {
  const strong = { id: 'strong', name: 'Strong', shortName: 'STR', strength: 92, category: 'custom' as const, sport: 'football' as const, color: '#fff' }
  const weak = { id: 'weak', name: 'Weak', shortName: 'WEA', strength: 40, category: 'custom' as const, sport: 'football' as const, color: '#fff' }
  const rest = mkTeams(6).map((t, i) => ({ ...t, id: `r${i}` }))

  it('time fraco com rank:1 semeia à frente do forte sem arrivals (cup)', () => {
    const t = createTournament({
      name: 'Seed',
      sport: 'football',
      format: 'cup',
      teams: [strong, weak, ...rest],
      config: baseConfig(),
      arrivals: { weak: { rank: 1 } }
    })
    expect(t.cupSeed![0]).toBe('weak')
    expect(t.arrivals).toEqual({ weak: { rank: 1 } })
  })

  it('sem arrivals, reproduz exatamente a ordenação por força de hoje (regressão)', () => {
    const t = createTournament({
      name: 'Seed',
      sport: 'football',
      format: 'cup',
      teams: [strong, weak, ...rest],
      config: baseConfig()
    })
    expect(t.cupSeed![0]).toBe('strong')
    expect(t.arrivals).toBeUndefined()
  })

  it('fromSeason fica persistido no Tournament (base da trava contra vazar pro histórico)', () => {
    const season = createTournament({
      name: 'Da Temporada',
      sport: 'football',
      format: 'league',
      teams: mkTeams(4),
      config: baseConfig(),
      fromSeason: true
    })
    expect(season.fromSeason).toBe(true)
    const avulso = createTournament({
      name: 'Avulso',
      sport: 'football',
      format: 'league',
      teams: mkTeams(4),
      config: baseConfig()
    })
    expect(avulso.fromSeason).toBeUndefined()
  })

  it('grupos também respeitam arrivals na distribuição em potes (serpentina)', () => {
    const many = mkTeams(14).map((t, i) => ({ ...t, id: `m${i}` }))
    const t = createTournament({
      name: 'SeedGroups',
      sport: 'football',
      format: 'groups',
      teams: [strong, weak, ...many],
      config: baseConfig({ groupCount: 4 }),
      arrivals: { weak: { rank: 1 } }
    })
    // pote 1 (banda 0) leva os 4 primeiros da ordenação — weak (rank 1) deve estar lá,
    // enquanto "strong" (sem arrivals, vira infinito) cai bem depois na ordenação
    const potOneIds = new Set(t.groups!.map((g) => g.teamIds[0]))
    expect(potOneIds.has('weak')).toBe(true)
  })
})

describe('engine — potes por região só ativam via fromSeason (Valorant, Temporada)', () => {
  const REGIONS = ['americas', 'emea', 'pacific', 'china'] as const
  function vctTeams() {
    const out = []
    for (const region of REGIONS) {
      for (let i = 0; i < 4; i++) {
        out.push({
          id: `${region}${i}`,
          name: `${region}${i}`,
          shortName: region.slice(0, 3).toUpperCase(),
          strength: 70 + i,
          category: 'club' as const,
          sport: 'esports' as const,
          color: '#111',
          region
        })
      }
    }
    return out
  }
  const arrivals = Object.fromEntries(vctTeams().map((t) => [t.id, { rank: parseInt(t.id.slice(-1), 10) + 1 }]))

  it('fromSeason:true ativa os potes por região — nenhum grupo com 2 times da mesma região', () => {
    const t = createTournament({
      name: 'VCT',
      sport: 'esports',
      format: 'groups',
      teams: vctTeams(),
      config: baseConfig({ game: 'valorant', groupCount: 4, qualifiersPerGroup: 2 }),
      arrivals,
      fromSeason: true
    })
    for (const g of t.groups!) {
      const regions = g.teamIds.map((id) => t.teams.find((x) => x.id === id)!.region)
      expect(new Set(regions).size).toBe(regions.length)
    }
    expect(t.seedLabels).toBeTruthy()
  })

  it('sem fromSeason (avulso/Setup), cai no sorteio legado por força — comportamento intocado', () => {
    const t = createTournament({
      name: 'VCT',
      sport: 'esports',
      format: 'groups',
      teams: vctTeams(),
      config: baseConfig({ game: 'valorant', groupCount: 4, qualifiersPerGroup: 2 }),
      arrivals
      // fromSeason omitido de propósito
    })
    // sem a flag, usa buildGroups (serpentina por seed/força) — ainda pode ter
    // 2 times da mesma região juntos, já que a restrição de região não se aplica
    expect(t.groups).toHaveLength(4)
    const totalTeams = t.groups!.reduce((s, g) => s + g.teamIds.length, 0)
    expect(totalTeams).toBe(16)
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
