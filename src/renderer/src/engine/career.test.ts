import { describe, it, expect } from 'vitest'
import {
  aiTransfers,
  applyConfidence,
  applyRoundMorale,
  askingPrice,
  bestLineup,
  clubTier,
  deriveClubStrength,
  evaluateYear,
  evolvePlayer,
  generateCareerRoster,
  generateEvents,
  generateObjective,
  generateOffers,
  isFired,
  lineupSectors,
  negotiateFee,
  playerSalary,
  playerValue,
  renewPlayer,
  renewalCost,
  seasonRevenue,
  turnoverRoster,
  wageBill,
  willRenew
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
  return { id, name: id, position: pos, age, overall, potential: potential ?? overall, contractYears: 3, salary: 5, value: 20, morale: 65 }
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

// ─── Fase 2: finanças + mercado ──────────────────────────────────────────────

describe('finanças (valuation, salário, receita)', () => {
  it('valor e salário crescem com o OVR', () => {
    expect(playerValue(90, 25, 90, 3)).toBeGreaterThan(playerValue(70, 25, 70, 3))
    expect(playerSalary(90)).toBeGreaterThan(playerSalary(70))
  })

  it('jovem com potencial vale mais que veterano de mesmo OVR', () => {
    const jovem = playerValue(80, 20, 90, 4)
    const veterano = playerValue(80, 34, 80, 4)
    expect(jovem).toBeGreaterThan(veterano)
  })

  it('contrato curto derruba o valor', () => {
    expect(playerValue(80, 25, 80, 1)).toBeLessThan(playerValue(80, 25, 80, 4))
  })

  it('generateCareerRoster preenche campos financeiros', () => {
    const roster = generateCareerRoster(team('x', 80), Array.from({ length: 16 }, (_, i) => ({ id: `x_p${i}`, name: `P${i}`, position: 'MID' as const })))
    for (const p of roster) {
      expect(p.contractYears).toBeGreaterThanOrEqual(1)
      expect(p.salary).toBeGreaterThan(0)
      expect(p.value).toBeGreaterThanOrEqual(1)
    }
    expect(wageBill(roster)).toBeGreaterThan(0)
  })

  it('receita: campeão de time grande fatura mais que lanterna', () => {
    expect(seasonRevenue('grande', 1, 20, true)).toBeGreaterThan(seasonRevenue('grande', 20, 20, false))
  })

  it('evolução decrementa contrato e recalcula valor', () => {
    const p = { ...player('e', 'FWD', 82, 24, 88), contractYears: 3 }
    const after = evolvePlayer(p, 2)
    expect(after.contractYears).toBe(2)
    expect(after.value).not.toBe(p.value)
  })
})

describe('negociação', () => {
  it('titular custa mais que reserva; contrato curto barateia', () => {
    expect(askingPrice(50, true, 3)).toBeGreaterThan(askingPrice(50, false, 3))
    expect(askingPrice(50, true, 1)).toBeLessThan(askingPrice(50, true, 3))
  })

  it('aceita oferta >= pedido, contrapropõe perto, recusa baixa', () => {
    const ask = askingPrice(50, false, 3) // buyer >= seller pra não bater na vontade própria
    expect(negotiateFee(50, false, 3, 'medio', 'grande', ask).status).toBe('accepted')
    expect(negotiateFee(50, false, 3, 'medio', 'grande', Math.round(ask * 0.9)).status).toBe('counter')
    expect(negotiateFee(50, false, 3, 'medio', 'grande', Math.round(ask * 0.5)).status).toBe('refused')
  })

  it('vontade própria: titular de clube maior recusa clube menor', () => {
    const r = negotiateFee(50, true, 3, 'gigante', 'pequeno', 9999)
    expect(r.status).toBe('refused')
  })
})

// ─── Fase 3: moral, contratos (Bosman), eventos, mercado da IA ───────────────

describe('moral', () => {
  it('titular sobe, banco desce; vitória e derrota empurram todo mundo', () => {
    const squad = [player('a', 'FWD', 80), player('b', 'MID', 75)]
    const win = applyRoundMorale(squad, ['a'], 'win')
    expect(win[0].morale).toBe(70) // 65 +2 titular +3 vitória
    expect(win[1].morale).toBe(66) // 65 -2 banco +3 vitória
    const loss = applyRoundMorale(squad, ['a'], 'loss')
    expect(loss[0].morale).toBe(64) // +2 -3
    expect(loss[1].morale).toBe(60) // -2 -3
  })

  it('moral não sai de 0-100', () => {
    const low = applyRoundMorale([{ ...player('x', 'DEF', 70), morale: 1 }], [], 'loss')
    expect(low[0].morale).toBe(0)
    const high = applyRoundMorale([{ ...player('y', 'DEF', 70), morale: 99 }], ['y'], 'win')
    expect(high[0].morale).toBe(100)
  })
})

describe('contrato (Bosman)', () => {
  it('contrato vence de verdade — chega a 0 e não auto-renova', () => {
    let p = { ...player('c', 'MID', 80, 26), contractYears: 2 }
    p = evolvePlayer(p, 1)
    expect(p.contractYears).toBe(1)
    p = evolvePlayer(p, 2)
    expect(p.contractYears).toBe(0)
  })

  it('renovar cedo é mais barato que na iminência', () => {
    const cedo = renewalCost({ ...player('r', 'MID', 80), contractYears: 4 })
    const tarde = renewalCost({ ...player('r', 'MID', 80), contractYears: 1 })
    expect(cedo).toBeLessThan(tarde)
  })

  it('moral baixa faz o jogador recusar renovação', () => {
    expect(willRenew({ ...player('w', 'FWD', 80), morale: 60 })).toBe(true)
    expect(willRenew({ ...player('w', 'FWD', 80), morale: 10 })).toBe(false)
  })

  it('renovação dá 3 anos e reajusta salário', () => {
    const p = renewPlayer({ ...player('n', 'FWD', 80), contractYears: 1, salary: 10 })
    expect(p.contractYears).toBe(3)
    expect(p.salary).toBeGreaterThan(10)
  })
})

describe('turnoverRoster (Bosman + reposição)', () => {
  const squadOf16 = () =>
    Array.from({ length: 16 }, (_, i) => ({
      ...player(`p${i}`, 'MID', 75, 26),
      contractYears: i < 2 ? 1 : 4 // dois vencem neste ano
    }))

  it('quem chega a 0 de contrato SAI do elenco', () => {
    const { kept, left } = turnoverRoster(squadOf16(), 1, 16, () => [])
    expect(left.map((p) => p.id).sort()).toEqual(['p0', 'p1'])
    expect(kept.some((p) => p.id === 'p0' || p.id === 'p1')).toBe(false)
  })

  it('REGRESSÃO: a reposição não pode ressuscitar quem acabou de sair', () => {
    // fillers "preguiçosos" que devolvem o próprio elenco canônico (o bug real)
    const lazyFillers = (need: number) => squadOf16().slice(0, need)
    const { kept, left } = turnoverRoster(squadOf16(), 1, 16, lazyFillers)
    for (const gone of left) {
      expect(kept.some((p) => p.id === gone.id)).toBe(false)
    }
  })

  it('repõe até o mínimo com jogadores inéditos', () => {
    const fresh = (need: number) =>
      Array.from({ length: need }, (_, i) => player(`novo-y1-${i}`, 'DEF', 70, 20))
    const { kept } = turnoverRoster(squadOf16(), 1, 16, fresh)
    expect(kept).toHaveLength(16)
    expect(kept.filter((p) => p.id.startsWith('novo-')).length).toBe(2)
  })
})

describe('generateEvents', () => {
  const teams = [team('meu', 75), team('rico', 90), team('pobre', 50)]
  const baseCtx = (over: Partial<Parameters<typeof generateEvents>[0]> = {}) => ({
    year: 1,
    players: [player('s1', 'FWD', 84, 26), player('b1', 'MID', 70, 24)],
    starterIds: ['s1'],
    teams,
    clubId: 'meu',
    rostersByClub: {},
    budget: 50,
    wageBill: 10,
    wageBudget: 100,
    existingIds: new Set<string>(),
    ...over
  })

  it('rival faz proposta por titular de contrato curto', () => {
    const evs = generateEvents(baseCtx({ players: [{ ...player('s1', 'FWD', 84), contractYears: 1 }], starterIds: ['s1'] }))
    const bid = evs.find((e) => e.kind === 'rival-bid')
    expect(bid).toBeTruthy()
    expect(bid!.amount).toBeGreaterThan(0)
    expect(bid!.options).toHaveLength(2)
  })

  it('reserva com moral baixa vira evento', () => {
    const evs = generateEvents(baseCtx({ players: [player('s1', 'FWD', 84), { ...player('b1', 'MID', 70), morale: 20 }] }))
    expect(evs.some((e) => e.kind === 'bench-unhappy')).toBe(true)
  })

  it('contrato vencendo de titular vira evento com custo', () => {
    const evs = generateEvents(baseCtx({ players: [{ ...player('s1', 'FWD', 84), contractYears: 1 }], starterIds: ['s1'] }))
    const ct = evs.find((e) => e.kind === 'contract-expiring')
    expect(ct).toBeTruthy()
    expect(ct!.amount).toBeGreaterThan(0)
  })

  it('diretoria cobra caixa quando aperta', () => {
    const evs = generateEvents(baseCtx({ budget: 2, wageBill: 95, wageBudget: 100 }))
    expect(evs.some((e) => e.kind === 'board-sell-demand')).toBe(true)
  })

  it('não repete evento já existente', () => {
    const ctx = baseCtx({ players: [{ ...player('s1', 'FWD', 84), contractYears: 1 }], starterIds: ['s1'] })
    const first = generateEvents(ctx)
    const again = generateEvents({ ...ctx, existingIds: new Set(first.map((e) => e.id)) })
    expect(again).toHaveLength(0)
  })
})

describe('aiTransfers', () => {
  it('move jogadores entre clubes da IA sem tocar no clube do usuário', () => {
    const teams = [team('meu', 75), team('a', 80), team('b', 78), team('c', 76)]
    const roster = (id: string) =>
      generateCareerRoster(team(id, 78), Array.from({ length: 18 }, (_, i) => ({ id: `${id}_p${i}`, name: `${id}${i}`, position: 'MID' as const })))
    const rosters = { a: roster('a'), b: roster('b'), c: roster('c') }
    const before = Object.fromEntries(Object.entries(rosters).map(([k, v]) => [k, v.length]))
    const res = aiTransfers(teams, rosters, 'meu', 'seed1', 14)
    expect(res.moves.length).toBeGreaterThan(0)
    // total de jogadores se conserva entre os clubes da IA
    const afterTotal = Object.values(res.rostersByClub).reduce((s, r) => s + r.length, 0)
    const beforeTotal = Object.values(before).reduce((s, n) => s + n, 0)
    expect(afterTotal).toBe(beforeTotal)
    expect(res.rostersByClub['meu']).toBeUndefined()
  })

  it('é determinístico pelo seed', () => {
    const teams = [team('meu', 75), team('a', 80), team('b', 78)]
    const roster = (id: string) =>
      generateCareerRoster(team(id, 78), Array.from({ length: 18 }, (_, i) => ({ id: `${id}_p${i}`, name: `${id}${i}`, position: 'MID' as const })))
    const mk = () => ({ a: roster('a'), b: roster('b') })
    const r1 = aiTransfers(teams, mk(), 'meu', 'same', 14)
    const r2 = aiTransfers(teams, mk(), 'meu', 'same', 14)
    expect(r1.moves.map((m) => m.player.id)).toEqual(r2.moves.map((m) => m.player.id))
  })
})

describe('deriveClubStrength', () => {
  it('força do clube deriva do melhor XI do elenco', () => {
    const strong = generateCareerRoster(team('a', 88), Array.from({ length: 18 }, (_, i) => ({ id: `a_p${i}`, name: `A${i}`, position: (['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'] as const)[i % 11] })))
    const weak = generateCareerRoster(team('b', 55), Array.from({ length: 18 }, (_, i) => ({ id: `b_p${i}`, name: `B${i}`, position: (['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'] as const)[i % 11] })))
    expect(deriveClubStrength(strong).strength).toBeGreaterThan(deriveClubStrength(weak).strength)
  })
})
