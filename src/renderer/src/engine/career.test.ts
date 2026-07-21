import { describe, it, expect } from 'vitest'
import {
  applyConfidence,
  bestLineup,
  clubTier,
  evaluateYear,
  evolvePlayer,
  generateCareerRoster,
  generateObjective,
  generateOffers,
  isFired,
  lineupSectors
} from './career'
import type { Position, Team } from '../types'
import type { CareerPlayer } from '../types-career'

function team(id: string, strength: number): Team {
  return { id, name: id.toUpperCase(), shortName: id.slice(0, 3).toUpperCase(), strength, category: 'club', sport: 'football', color: '#fff' }
}

function squadOf(teamId: string, layout: Position[]): { id: string; name: string; position: Position }[] {
  return layout.map((pos, i) => ({ id: `${teamId}_p${i}`, name: `Jogador ${i}`, position: pos }))
}

const FULL_LAYOUT: Position[] = [
  'GK', 'GK',
  'DEF', 'DEF', 'DEF', 'DEF', 'DEF',
  'MID', 'MID', 'MID', 'MID', 'MID',
  'FWD', 'FWD', 'FWD', 'FWD'
]

function player(id: string, pos: Position, overall: number, age = 26, potential?: number): CareerPlayer {
  return { id, name: id, position: pos, age, overall, potential: potential ?? overall }
}

describe('generateCareerRoster', () => {
  it('é determinístico e ancora o OVR na força do clube', () => {
    const t = team('fla', 85)
    const squad = squadOf('fla', FULL_LAYOUT)
    const a = generateCareerRoster(t, squad)
    const b = generateCareerRoster(t, squad)
    expect(a).toEqual(b)
    const avg = a.reduce((s, p) => s + p.overall, 0) / a.length
    expect(avg).toBeGreaterThan(70)
    expect(avg).toBeLessThan(95)
    for (const p of a) {
      expect(p.overall).toBeGreaterThanOrEqual(40)
      expect(p.overall).toBeLessThanOrEqual(99)
      expect(p.potential).toBeGreaterThanOrEqual(p.overall)
      expect(p.age).toBeGreaterThanOrEqual(17)
      expect(p.age).toBeLessThanOrEqual(36)
    }
  })
})

describe('bestLineup + lineupSectors', () => {
  it('escala 11 respeitando a formação', () => {
    const roster = generateCareerRoster(team('pal', 80), squadOf('pal', FULL_LAYOUT))
    const lineup = bestLineup(roster, '4-3-3')
    expect(lineup.starterIds).toHaveLength(11)
    const starters = lineup.starterIds.map((id) => roster.find((p) => p.id === id)!)
    expect(starters.filter((p) => p.position === 'GK')).toHaveLength(1)
    expect(starters.filter((p) => p.position === 'DEF')).toHaveLength(4)
    expect(starters.filter((p) => p.position === 'MID')).toHaveLength(3)
    expect(starters.filter((p) => p.position === 'FWD')).toHaveLength(3)
  })

  it('completa com sobras quando o elenco não tem a posição suficiente', () => {
    const thin: Position[] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'MID']
    const roster = generateCareerRoster(team('x', 70), squadOf('x', thin))
    const lineup = bestLineup(roster, '4-2-4') // pede 4 FWD, só há 2
    expect(lineup.starterIds).toHaveLength(11)
  })

  it('setores refletem a força das linhas escaladas', () => {
    const roster = [
      player('gk', 'GK', 80),
      player('d1', 'DEF', 80), player('d2', 'DEF', 80), player('d3', 'DEF', 80), player('d4', 'DEF', 80),
      player('m1', 'MID', 60), player('m2', 'MID', 60), player('m3', 'MID', 60),
      player('f1', 'FWD', 90), player('f2', 'FWD', 90), player('f3', 'FWD', 90)
    ]
    const lineup = bestLineup(roster, '4-3-3')
    const s = lineupSectors(roster, lineup)
    expect(s.defense).toBe(80)
    expect(s.midfield).toBe(60)
    expect(s.attack).toBe(90)
    expect(s.strength).toBe(Math.round((80 + 60 + 90) / 3))
  })
})

describe('clubTier + generateObjective', () => {
  it('faixas de porte pelo strength', () => {
    expect(clubTier(90)).toBe('gigante')
    expect(clubTier(75)).toBe('grande')
    expect(clubTier(60)).toBe('medio')
    expect(clubTier(50)).toBe('pequeno')
  })

  it('gigante com reputação cobra título; sem reputação cobra vice', () => {
    expect(generateObjective(team('real', 92), 20, 70).kind).toBe('win-title')
    expect(generateObjective(team('real', 92), 20, 30).kind).toBe('top-n')
  })

  it('pequeno cobra não cair; médio vindo de campanha ruim ganha objetivo relativo', () => {
    expect(generateObjective(team('xv', 48), 20, 50).kind).toBe('avoid-relegation')
    const rel = generateObjective(team('mid', 60), 20, 50, 15)
    expect(rel.kind).toBe('relative-to-last-year')
    expect(rel.target).toBe(15)
  })
})

describe('evaluateYear', () => {
  it('campeão supera objetivos que não eram o título', () => {
    const r = evaluateYear({ kind: 'top-n', target: 4, label: '' }, 1, 20, true)
    expect(r.outcome).toBe('superou')
    expect(r.confidenceDelta).toBeGreaterThan(0)
  })

  it('título cobrado e entregue = cumpriu; não entregue pune proporcional', () => {
    expect(evaluateYear({ kind: 'win-title', label: '' }, 1, 20, true).outcome).toBe('cumpriu')
    const far = evaluateYear({ kind: 'win-title', label: '' }, 10, 20, false)
    const near = evaluateYear({ kind: 'win-title', label: '' }, 2, 20, false)
    expect(far.outcome).toBe('falhou')
    expect(far.confidenceDelta).toBeLessThan(near.confidenceDelta)
  })

  it('top-n cumpre dentro da meta e falha fora', () => {
    expect(evaluateYear({ kind: 'top-n', target: 4, label: '' }, 4, 20, false).outcome).toBe('cumpriu')
    expect(evaluateYear({ kind: 'top-n', target: 4, label: '' }, 7, 20, false).outcome).toBe('falhou')
  })

  it('não cair: fora da zona cumpre, dentro falha', () => {
    const obj = { kind: 'avoid-relegation' as const, target: 4, label: '' }
    expect(evaluateYear(obj, 15, 20, false).outcome).toBe('cumpriu')
    expect(evaluateYear(obj, 18, 20, false).outcome).toBe('falhou')
  })

  it('relativo ao ano anterior: melhorar 3+ posições supera', () => {
    const obj = { kind: 'relative-to-last-year' as const, target: 12, label: '' }
    expect(evaluateYear(obj, 8, 20, false).outcome).toBe('superou')
    expect(evaluateYear(obj, 12, 20, false).outcome).toBe('cumpriu')
    expect(evaluateYear(obj, 14, 20, false).outcome).toBe('falhou')
  })
})

describe('confiança + demissão', () => {
  it('clamp 0-100 e demissão no zero', () => {
    expect(applyConfidence(10, -30)).toBe(0)
    expect(applyConfidence(95, 20)).toBe(100)
    expect(isFired(0)).toBe(true)
    expect(isFired(1)).toBe(false)
  })
})

describe('evolvePlayer', () => {
  it('jovem sobe (limitado pelo potencial), veterano cai', () => {
    const young = evolvePlayer(player('y', 'MID', 70, 19, 88), 2)
    expect(young.age).toBe(20)
    expect(young.overall).toBeGreaterThan(70)
    const capped = evolvePlayer(player('c', 'MID', 87, 21, 88), 2)
    expect(capped.overall).toBeLessThanOrEqual(88)
    const old = evolvePlayer(player('o', 'FWD', 85, 34), 2)
    expect(old.overall).toBeLessThan(85)
  })

  it('é determinístico por (id, ano)', () => {
    const a = evolvePlayer(player('p', 'DEF', 75, 22, 84), 3)
    const b = evolvePlayer(player('p', 'DEF', 75, 22, 84), 3)
    expect(a).toEqual(b)
  })
})

describe('generateOffers', () => {
  const league = [
    team('big1', 90), team('big2', 88),
    team('g1', 78), team('g2', 72),
    team('m1', 62), team('m2', 58),
    team('s1', 50), team('s2', 45)
  ]

  it('sempre gera pelo menos 1 oferta', () => {
    expect(generateOffers(league, 5, 'big1', 'seed').length).toBeGreaterThanOrEqual(1)
  })

  it('reputação baixa só recebe clube pequeno; alta destrava gigante', () => {
    const low = generateOffers(league, 20, 'none', 'seed')
    expect(low.every((o) => o.tier === 'pequeno')).toBe(true)
    const high = generateOffers(league, 90, 'none', 'seed2')
    expect(high.length).toBeGreaterThan(low.length)
  })

  it('nunca oferece o clube atual', () => {
    for (let i = 0; i < 5; i++) {
      const offers = generateOffers(league, 50, 'm1', 'seed' + i)
      expect(offers.every((o) => o.clubId !== 'm1')).toBe(true)
    }
  })
})
