import { describe, it, expect } from 'vitest'
import {
  clubTier,
  TIER_LABEL,
  playerSalary,
  ageValueFactor,
  playerValue,
  withMarketFinance,
  evolvePlayer,
  turnoverRoster,
  startingBudget,
  wageBill,
  wageCapFor,
  seasonRevenue,
  isStarter,
  askingPrice,
  negotiateFee,
  evaluateTrade,
  simulateMarketActivity
} from './market'
import { playerValue as careerPlayerValue, evolvePlayer as careerEvolvePlayer } from './career'
import type { MarketPlayer, TradeProposal } from '../types-market'
import type { CareerPlayer } from '../types-career'
import type { Team } from '../types'

function mp(over: Partial<MarketPlayer> = {}): MarketPlayer {
  return {
    id: 'p1',
    name: 'Jogador',
    sport: 'football',
    role: 'MID',
    age: 25,
    overall: 75,
    potential: 80,
    contractYears: 3,
    salary: 5,
    value: 30,
    ...over
  }
}

function team(id: string, strength: number, name = id.toUpperCase()): Team {
  return {
    id,
    name,
    shortName: id.slice(0, 3).toUpperCase(),
    strength,
    category: 'custom',
    sport: 'football',
    color: '#fff'
  }
}

// ─── paridade com a Carreira (regressão — Q1: generalizar sem alterar) ───────

describe('market — paridade com engine/career.ts (regressão)', () => {
  it('playerValue(football) bate exatamente com career.playerValue pros mesmos insumos', () => {
    const cases: Array<[number, number, number, number]> = [
      [80, 22, 88, 3],
      [65, 30, 70, 1],
      [90, 35, 90, 4],
      [50, 19, 85, 2]
    ]
    for (const [overall, age, potential, contractYears] of cases) {
      expect(playerValue('football', overall, age, potential, contractYears)).toBe(
        careerPlayerValue(overall, age, potential, contractYears)
      )
    }
  })

  it('evolvePlayer(football) bate exatamente com career.evolvePlayer (mesma idade/OVR/potencial/contrato/valor)', () => {
    const marketBase = mp({ id: 'x1', age: 22, overall: 70, potential: 82, contractYears: 3 })
    const careerBase: CareerPlayer = {
      id: 'x1',
      name: 'Jogador',
      position: 'MID',
      age: 22,
      overall: 70,
      potential: 82,
      contractYears: 3,
      salary: 5,
      value: 30,
      morale: 70
    }
    const a = evolvePlayer('football', marketBase, 2027)
    const b = careerEvolvePlayer(careerBase, 2027)
    expect({ age: a.age, overall: a.overall, potential: a.potential, contractYears: a.contractYears, value: a.value }).toEqual({
      age: b.age,
      overall: b.overall,
      potential: b.potential,
      contractYears: b.contractYears,
      value: b.value
    })
  })
})

// ─── curva própria de e-sports (Q3) ──────────────────────────────────────────

describe('ageValueFactor — curva própria de e-sports', () => {
  it('pico de e-sports (20-23) vale mais que o futebol na mesma idade jovem', () => {
    expect(ageValueFactor('esports', 22)).toBeGreaterThan(ageValueFactor('football', 22))
  })

  it('e-sports já caiu bem mais que futebol aos 28 (declínio precoce)', () => {
    expect(ageValueFactor('esports', 28)).toBeLessThan(ageValueFactor('football', 28))
  })
})

describe('evolvePlayer — e-sports declina mais cedo que futebol', () => {
  it('aos 27, e-sports já está em queda acentuada enquanto futebol ainda cresce/mantém', () => {
    const esp = mp({ sport: 'esports', age: 26, overall: 85, potential: 90 })
    const fut = mp({ sport: 'football', age: 26, overall: 85, potential: 90 })
    const espNext = evolvePlayer('esports', esp, 1)
    const futNext = evolvePlayer('football', fut, 1)
    expect(espNext.overall).toBeLessThan(esp.overall)
    expect(futNext.overall).toBeGreaterThanOrEqual(fut.overall)
  })

  it('contrato conta 1 ano e nunca fica negativo', () => {
    const p = mp({ contractYears: 0 })
    expect(evolvePlayer('football', p, 1).contractYears).toBe(0)
  })
})

describe('turnoverRoster — reposição respeita contrato vencido (Bosman) e usa fillers só se faltar gente', () => {
  it('mantém acima do mínimo sem chamar fillers', () => {
    const roster = [mp({ id: 'a', contractYears: 2 }), mp({ id: 'b', contractYears: 3 })]
    const { kept, left } = turnoverRoster('esports', roster, 1, 1, () => {
      throw new Error('não deveria precisar de fillers')
    })
    expect(kept.map((p) => p.id).sort()).toEqual(['a', 'b'])
    expect(left).toHaveLength(0)
  })

  it('quem chega a contrato 0 sai; fillers completam se cair abaixo do mínimo', () => {
    const roster = [mp({ id: 'a', contractYears: 1 }), mp({ id: 'b', contractYears: 5 })]
    const { kept, left } = turnoverRoster('esports', roster, 1, 2, (need) =>
      Array.from({ length: need }, (_, i) => mp({ id: `filler${i}` }))
    )
    expect(left.map((p) => p.id)).toEqual(['a'])
    expect(kept.map((p) => p.id)).toEqual(['b', 'filler0'])
  })
})

// ─── finanças do clube (idênticas à Carreira, só generalizadas de tipo) ──────

describe('finanças do clube', () => {
  it('clubTier/TIER_LABEL/startingBudget/wageBill/wageCapFor/seasonRevenue', () => {
    expect(clubTier(90)).toBe('gigante')
    expect(clubTier(72)).toBe('grande')
    expect(clubTier(60)).toBe('medio')
    expect(clubTier(40)).toBe('pequeno')
    expect(TIER_LABEL.gigante).toBe('Gigante')
    expect(startingBudget('gigante')).toBe(180)
    const roster = [mp({ salary: 5 }), mp({ id: 'p2', salary: 3 })]
    expect(wageBill(roster)).toBe(8)
    expect(wageCapFor(roster)).toBe(10)
    expect(seasonRevenue('medio', 1, 10, true)).toBeGreaterThan(seasonRevenue('medio', 10, 10, false))
  })

  it('withMarketFinance preenche contrato/salário/valor consistentes', () => {
    const p = withMarketFinance({ id: 'z', name: 'Z', sport: 'football', role: 'FWD', age: 24, overall: 82, potential: 85 })
    expect(p.contractYears).toBeGreaterThanOrEqual(1)
    expect(p.contractYears).toBeLessThanOrEqual(4)
    expect(p.salary).toBe(playerSalary(82))
  })

  it('isStarter — os N de maior OVR contam como titulares', () => {
    const roster = [mp({ id: 'a', overall: 90 }), mp({ id: 'b', overall: 70 }), mp({ id: 'c', overall: 50 })]
    expect(isStarter(roster, 'a', 2)).toBe(true)
    expect(isStarter(roster, 'b', 2)).toBe(true)
    expect(isStarter(roster, 'c', 2)).toBe(false)
  })
})

// ─── venda em dinheiro ────────────────────────────────────────────────────────

describe('negotiateFee — venda em dinheiro', () => {
  it('aceita oferta que cobre o pedido', () => {
    const ask = askingPrice(30, true, 3)
    expect(negotiateFee(30, true, 3, 'medio', 'grande', ask).status).toBe('accepted')
  })

  it('contrapropõe oferta perto do pedido', () => {
    const ask = askingPrice(30, true, 3)
    const r = negotiateFee(30, true, 3, 'medio', 'grande', Math.round(ask * 0.9))
    expect(r.status).toBe('counter')
    expect(r.counter).toBe(ask)
  })

  it('recusa oferta muito baixa', () => {
    expect(negotiateFee(30, true, 3, 'medio', 'grande', 1).status).toBe('refused')
  })

  it('recusa titular indo pra clube de porte menor, mesmo com oferta alta', () => {
    const r = negotiateFee(30, true, 3, 'gigante', 'pequeno', 9999)
    expect(r.status).toBe('refused')
  })
})

// ─── troca (mecânica NOVA — Q2) ──────────────────────────────────────────────

function tradeOf(over: Partial<TradeProposal> = {}): TradeProposal {
  return {
    offeredPlayer: mp({ id: 'offered', value: 30 }),
    offeredPlayerIsStarter: false,
    targetPlayer: mp({ id: 'target', value: 30 }),
    targetPlayerIsStarter: true,
    proposingClubTier: 'medio',
    owningClubTier: 'medio',
    cashAdjustment: 0,
    ...over
  }
}

describe('evaluateTrade — troca 1 por 1 com dinheiro complementar', () => {
  it('aceita quando o jogador oferecido + dinheiro cobre o pedido', () => {
    const ask = askingPrice(30, true, 3)
    const r = evaluateTrade(tradeOf({ offeredPlayer: mp({ id: 'offered', value: ask }) }))
    expect(r.status).toBe('accepted')
  })

  it('contrapropõe dinheiro extra quando a troca chega perto', () => {
    const ask = askingPrice(30, true, 3)
    const offered = mp({ id: 'offered', value: Math.round(ask * 0.9) })
    const r = evaluateTrade(tradeOf({ offeredPlayer: offered }))
    expect(r.status).toBe('counter')
    expect(r.counter).toBeCloseTo(ask - offered.value, 1)
  })

  it('recusa troca com jogador muito mais fraco, mesmo sem cash', () => {
    const r = evaluateTrade(tradeOf({ offeredPlayer: mp({ id: 'offered', value: 1 }) }))
    expect(r.status).toBe('refused')
  })

  it('cashAdjustment negativo (pedir dinheiro de volta) reduz o valor efetivo da oferta', () => {
    const ask = askingPrice(30, true, 3)
    const offered = mp({ id: 'offered', value: ask })
    const semAjuste = evaluateTrade(tradeOf({ offeredPlayer: offered, cashAdjustment: 0 }))
    const comPedido = evaluateTrade(tradeOf({ offeredPlayer: offered, cashAdjustment: -(ask * 0.5) }))
    expect(semAjuste.status).toBe('accepted')
    expect(comPedido.status).not.toBe('accepted')
  })

  it('recusa titular indo pra clube de porte menor, mesmo com jogador de valor alto', () => {
    const r = evaluateTrade(
      tradeOf({
        offeredPlayer: mp({ id: 'offered', value: 9999 }),
        proposingClubTier: 'pequeno',
        owningClubTier: 'gigante'
      })
    )
    expect(r.status).toBe('refused')
  })
})

// ─── mercado autônomo (venda OU troca entre clubes de IA) ────────────────────

describe('simulateMarketActivity', () => {
  const teams: Team[] = [team('t0', 60), team('t1', 62), team('t2', 58), team('t3', 61)]
  function rostersOf(n: number): Record<string, MarketPlayer[]> {
    const out: Record<string, MarketPlayer[]> = {}
    for (const t of teams) {
      out[t.id] = Array.from({ length: n }, (_, i) => mp({ id: `${t.id}_p${i}`, overall: 50 + i }))
    }
    return out
  }

  it('com swapChance 0, só produz negócios do tipo venda', () => {
    const { deals } = simulateMarketActivity(teams, rostersOf(20), {
      seed: 'a',
      minSquadSize: 5,
      startersCount: 0, // ninguém é "titular" — remove a trava de vontade própria pro teste
      dealRange: [6, 6],
      swapChance: 0
    })
    expect(deals.length).toBeGreaterThan(0)
    expect(deals.every((d) => d.kind === 'sale')).toBe(true)
  })

  it('com swapChance 1, produz negócios do tipo troca quando o destino tem elenco de sobra', () => {
    const { deals, rostersByClub } = simulateMarketActivity(teams, rostersOf(20), {
      seed: 'b',
      minSquadSize: 5,
      startersCount: 0,
      dealRange: [6, 6],
      swapChance: 1
    })
    expect(deals.some((d) => d.kind === 'swap')).toBe(true)
    const swap = deals.find((d) => d.kind === 'swap')!
    // o jogador que saiu não está mais no elenco de origem; o contraparte, sim
    expect(rostersByClub[swap.fromClubId].some((p) => p.id === swap.playerId)).toBe(false)
    expect(rostersByClub[swap.fromClubId].some((p) => p.id === swap.counterpartPlayerId)).toBe(true)
    expect(rostersByClub[swap.toClubId].some((p) => p.id === swap.playerId)).toBe(true)
  })

  it('respeita excludeClubIds — clube excluído nunca é origem nem destino', () => {
    const { deals } = simulateMarketActivity(teams, rostersOf(20), {
      seed: 'c',
      minSquadSize: 5,
      startersCount: 0,
      excludeClubIds: ['t0'],
      dealRange: [10, 10]
    })
    expect(deals.some((d) => d.fromClubId === 't0' || d.toClubId === 't0')).toBe(false)
  })

  it('titular nunca desce de porte, mesmo no mercado autônomo', () => {
    const bigTeams: Team[] = [team('big', 90), team('small', 40)]
    const rosters: Record<string, MarketPlayer[]> = {
      big: Array.from({ length: 20 }, (_, i) => mp({ id: `big_p${i}`, overall: 90 - i })),
      small: Array.from({ length: 20 }, (_, i) => mp({ id: `small_p${i}`, overall: 50 - i }))
    }
    const { deals } = simulateMarketActivity(bigTeams, rosters, {
      seed: 'd',
      minSquadSize: 5,
      startersCount: 11, // titulares reais dessa vez
      dealRange: [15, 15],
      swapChance: 0
    })
    // nenhum titular do "big" (top 11 por overall) foi vendido pro "small" (porte menor)
    const bigStarters = new Set(rosters.big.slice(0, 11).map((p) => p.id))
    expect(deals.some((d) => d.fromClubId === 'big' && d.toClubId === 'small' && bigStarters.has(d.playerId))).toBe(
      false
    )
  })
})
