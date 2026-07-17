import { describe, it, expect } from 'vitest'
import { yearArcs, yearAwards, eraIdols, eraHeadToHead, clubProfile, eraStrengthSeries } from './season-insights'
import type { Match, Season, SeasonYearEntry, Team, Tournament } from '../types'

// ─── fixtures sintéticas mínimas ─────────────────────────────────────────────

function team(id: string, strength: number): Team {
  return { id, name: id.toUpperCase(), shortName: id.slice(0, 3).toUpperCase(), strength, category: 'custom', sport: 'football', color: '#fff' }
}

function match(homeId: string, awayId: string, hs: number, as: number): Match {
  return {
    id: `m_${homeId}_${awayId}_${hs}${as}`,
    round: 1,
    stage: 'Rodada 1',
    homeId,
    awayId,
    played: true,
    homeScore: hs,
    awayScore: as,
    football: { goals: [], possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0] }
  }
}

function tournament(name: string, teams: Team[], matches: Match[], champion: string): Tournament {
  return {
    id: `t_${name}`,
    name,
    sport: 'football',
    format: 'league',
    createdAt: 0,
    updatedAt: 0,
    config: {} as Tournament['config'],
    teams,
    matches,
    phase: 'finished',
    champion
  }
}

const POOL = [team('alpha', 90), team('beta', 85), team('gamma', 70), team('zeta', 45)]

function yearEntry(year: number, over: Partial<SeasonYearEntry>): SeasonYearEntry {
  return { year, champions: [], scorers: [], completed: true, ...over }
}

function season(over: Partial<Season>): Season {
  return {
    id: 's1',
    name: 'Era Teste',
    sport: 'football',
    period: 10,
    slots: [{ id: 'liga', name: 'Liga', format: 'league', config: {} as Season['slots'][0]['config'] }],
    teamPool: POOL,
    currentYear: 3,
    currentSlotIndex: 0,
    years: [],
    allTimeScorers: [],
    allTimeWins: {},
    baseStats: {},
    teamForm: {},
    records: {},
    status: 'playing',
    createdAt: 0,
    updatedAt: 0,
    ...over
  }
}

// ─── arcos ───────────────────────────────────────────────────────────────────

describe('yearArcs — retrospecto derivado do ano', () => {
  it('detecta dinastia (mesmo campeão no mesmo slot em anos seguidos)', () => {
    const champ = { slotId: 'liga', slotName: 'Liga', teamId: 'alpha', teamName: 'ALPHA' }
    const s = season({
      years: [yearEntry(1, { champions: [champ] }), yearEntry(2, { champions: [champ] })]
    })
    const arcs = yearArcs(s, s.years[1])
    const dyn = arcs.find((a) => a.kind === 'dynasty')
    expect(dyn).toBeTruthy()
    expect(dyn!.text).toContain('2ª vez seguida')
  })

  it('detecta azarão campeão (força no fundo do elenco) e campanha invicta', () => {
    const teams = [team('a', 95), team('b', 90), team('c', 88), team('d', 85), team('e', 80), team('zeta', 40)]
    const ms = teams.filter((t) => t.id !== 'zeta').map((t) => match('zeta', t.id, 2, 0))
    const t = tournament('Liga', teams, ms, 'zeta')
    const entry = yearEntry(1, {
      champions: [{ slotId: 'liga', slotName: 'Liga', teamId: 'zeta', teamName: 'ZETA' }],
      tournaments: { liga: t }
    })
    const s = season({ years: [entry] })
    const arcs = yearArcs(s, entry)
    expect(arcs.some((a) => a.kind === 'upset-champion')).toBe(true)
    expect(arcs.some((a) => a.kind === 'invincible')).toBe(true)
  })

  it('detecta queda do gigante (campeão anterior fora do top 4 num slot de 8+)', () => {
    const ids = ['alpha', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const s = season({
      years: [
        yearEntry(1, { champions: [{ slotId: 'liga', slotName: 'Liga', teamId: 'alpha', teamName: 'ALPHA' }] }),
        yearEntry(2, {
          champions: [{ slotId: 'liga', slotName: 'Liga', teamId: 'b', teamName: 'B' }],
          slotRankings: { liga: ['b', 'c', 'd', 'e', 'f', 'alpha', 'g', 'h'].map((x) => x) ?? ids }
        })
      ]
    })
    const arcs = yearArcs(s, s.years[1])
    const fall = arcs.find((a) => a.kind === 'giant-fall')
    expect(fall).toBeTruthy()
    expect(fall!.text).toContain('ALPHA')
  })

  it('detecta artilheiro dominante (1.5x o segundo)', () => {
    const entry = yearEntry(1, {
      scorers: [
        { playerId: 'p1', name: 'Craque', teamId: 'alpha', teamName: 'ALPHA', goals: 30, kills: 0 },
        { playerId: 'p2', name: 'Coadjuvante', teamId: 'beta', teamName: 'BETA', goals: 12, kills: 0 }
      ]
    })
    const s = season({ years: [entry] })
    expect(yearArcs(s, entry).some((a) => a.kind === 'dominant-scorer')).toBe(true)
  })
})

// ─── prêmios ─────────────────────────────────────────────────────────────────

describe('yearAwards — prêmios do ano', () => {
  it('futebol: jogador do ano = artilheiro; empate desempatado por título do time', () => {
    const entry = yearEntry(1, {
      champions: [{ slotId: 'liga', slotName: 'Liga', teamId: 'beta', teamName: 'BETA' }],
      scorers: [
        { playerId: 'p1', name: 'SemTitulo', teamId: 'alpha', teamName: 'ALPHA', goals: 20, kills: 0 },
        { playerId: 'p2', name: 'ComTitulo', teamId: 'beta', teamName: 'BETA', goals: 20, kills: 0 }
      ]
    })
    const s = season({ years: [entry] })
    const aw = yearAwards(s, entry)
    expect(aw.playerOfYear?.name).toBe('ComTitulo')
    expect(aw.teamOfYear?.teamId).toBe('beta')
    expect(aw.topScorer?.value).toBe(20)
  })

  it('zebra e jogo do ano vêm do mais extremo entre os campeonatos', () => {
    const teamsA = [team('forte', 95), team('fraco', 50)]
    const tA = tournament('Copa A', teamsA, [match('fraco', 'forte', 1, 0)], 'fraco')
    const teamsB = [team('x', 80), team('y', 78)]
    const tB = tournament('Copa B', teamsB, [match('x', 'y', 4, 3)], 'x')
    const entry = yearEntry(1, {
      champions: [
        { slotId: 'a', slotName: 'Copa A', teamId: 'fraco', teamName: 'FRACO' },
        { slotId: 'b', slotName: 'Copa B', teamId: 'x', teamName: 'X' }
      ],
      tournaments: { a: tA, b: tB }
    })
    const s = season({ years: [entry] })
    const aw = yearAwards(s, entry)
    expect(aw.upsetOfYear?.winner).toBe('FRACO')
    expect(aw.upsetOfYear?.slotName).toBe('Copa A')
    expect(aw.gameOfYear?.slotName).toBe('Copa B') // 7 gols > jogo da Copa A
  })
})

// ─── ídolos / h2h / clube / evolução ─────────────────────────────────────────

describe('eraIdols — lendas da era', () => {
  it('agrega era + histórico por ano + melhor temporada + títulos do time', () => {
    const s = season({
      allTimeScorers: [{ playerId: 'p1', name: 'Lenda', teamId: 'alpha', teamName: 'ALPHA', goals: 45, kills: 0 }],
      allTimeWins: { alpha: 3 },
      years: [
        yearEntry(1, { scorers: [{ playerId: 'p1', name: 'Lenda', teamId: 'alpha', teamName: 'ALPHA', goals: 30, kills: 0 }] }),
        yearEntry(2, { scorers: [{ playerId: 'p1', name: 'Lenda', teamId: 'alpha', teamName: 'ALPHA', goals: 15, kills: 0 }] })
      ]
    })
    const [idol] = eraIdols(s)
    expect(idol.goals).toBe(45)
    expect(idol.titles).toBe(3)
    expect(idol.bestYear).toEqual({ year: 1, value: 30 })
    expect(idol.perYear).toHaveLength(2)
  })

  it('futebol: ranking da era soma gols+assistências (um artilheiro puro pode perder pra um mais completo)', () => {
    const s = season({
      allTimeScorers: [
        { playerId: 'artilheiro', name: 'Artilheiro', teamId: 'alpha', teamName: 'ALPHA', goals: 20, kills: 0, assists: 0 },
        { playerId: 'completo', name: 'Completo', teamId: 'beta', teamName: 'BETA', goals: 15, kills: 0, assists: 10 }
      ],
      allTimeWins: {}
    })
    const idols = eraIdols(s)
    expect(idols.map((i) => i.playerId)).toEqual(['completo', 'artilheiro'])
  })
})

describe('eraHeadToHead — confrontos acumulados dos torneios salvos', () => {
  it('acumula jogos, vitórias e placar agregado por par', () => {
    const teams = [team('alpha', 90), team('beta', 85)]
    const t1 = tournament('Liga', teams, [match('alpha', 'beta', 2, 1), match('beta', 'alpha', 0, 3)], 'alpha')
    const t2 = tournament('Copa', teams, [match('alpha', 'beta', 1, 1)], 'alpha')
    const s = season({
      years: [yearEntry(1, { tournaments: { liga: t1 } }), yearEntry(2, { tournaments: { copa: t2 } })]
    })
    const [h2h] = eraHeadToHead(s)
    expect(h2h.games).toBe(3)
    const alphaWins = h2h.aId === 'alpha' ? h2h.aWins : h2h.bWins
    const alphaScore = h2h.aId === 'alpha' ? h2h.aScore : h2h.bScore
    expect(alphaWins).toBe(2)
    expect(h2h.draws).toBe(1)
    expect(alphaScore).toBe(6) // 2 + 3 + 1
  })
})

describe('clubProfile + eraStrengthSeries', () => {
  it('perfil traz títulos agrupados, campanhas e histórico de força', () => {
    const s = season({
      allTimeWins: { alpha: 2 },
      years: [
        yearEntry(1, {
          champions: [{ slotId: 'liga', slotName: 'Liga', teamId: 'alpha', teamName: 'ALPHA' }],
          slotRankings: { liga: ['alpha', 'beta', 'gamma', 'zeta'] },
          teamStrengths: { alpha: 90, beta: 85 }
        }),
        yearEntry(2, {
          champions: [{ slotId: 'liga', slotName: 'Liga', teamId: 'alpha', teamName: 'ALPHA' }],
          slotRankings: { liga: ['alpha', 'gamma', 'beta', 'zeta'] },
          teamStrengths: { alpha: 93, beta: 82 }
        })
      ]
    })
    const p = clubProfile(s, 'alpha')
    expect(p.titles).toEqual([{ slotName: 'Liga', count: 2, years: [1, 2] }])
    expect(p.campaigns[0].entries[0]).toEqual({ slotName: 'Liga', pos: 1, of: 4 })
    expect(p.strengthHistory).toEqual([
      { year: 1, strength: 90 },
      { year: 2, strength: 93 }
    ])

    const series = eraStrengthSeries(s, 2)
    expect(series.years).toEqual([1, 2])
    const alpha = series.series.find((x) => x.teamId === 'alpha')
    expect(alpha?.values).toEqual([90, 93])
  })

  it('anos sem foto de força ficam fora da série (retroativo não existe)', () => {
    const s = season({
      years: [yearEntry(1, {}), yearEntry(2, { teamStrengths: { alpha: 88 } })]
    })
    const series = eraStrengthSeries(s, 4)
    expect(series.years).toEqual([2])
  })
})
