// Engine de MERCADO — venda e troca de jogadores, compartilhada entre futebol
// e e-sports e entre modos (Carreira, Temporada, avulso). Pura: sem UI, sem
// store, sem wiring em modo NENHUM ainda — é só a engine, por pedido
// explícito do usuário ("vamos elaborar ela antes de implementar em qualquer
// modo"). Ver spec: Mixeng › "Simulador - Engine de Mercado (Transferências)".
//
// GENERALIZAÇÃO da matemática já provada no Modo Carreira (`engine/career.ts`):
// playerValue/playerSalary/askingPrice/negotiateFee/wageCap/receita eram
// coincidentemente agnósticas de esporte desde o início (só usam números —
// overall/idade/potencial/contrato — nada específico de futebol). O Modo
// Carreira NÃO foi tocado nem migrado nesta rodada: os dois convivem por
// ora, sem duplicar a matemática pra sempre — a migração da Carreira fica
// pra quando ela for adaptada pra consumir esta engine.
//
// Decisões desta rodada (refinamento em 3 perguntas antes de codar):
// - Curva de IDADE própria por esporte: e-sports pica mais cedo e cai mais
//   rápido (pico 20-23, declínio a partir de 26-27) — diferente da curva do
//   futebol (pico 24-29, já em uso na Carreira). Só a curva de idade diverge;
//   salário/valor-base/potencial/contrato usam a mesma fórmula nos dois.
// - TROCA (não só venda): 1 jogador por 1, com dinheiro complementar opcional
//   de qualquer um dos lados (`TradeProposal.cashAdjustment`).
// - `MarketPlayer` é um tipo NOVO e genérico (não é `CareerPlayer`): `role` é
//   texto livre (posição no futebol, papel no e-sports), sem moral/eventos —
//   isso é escopo de quem for consumir a engine.
//
// Números de calibração são os MESMOS já validados na Carreira (exceto a
// curva de idade de e-sports, nova).
import type { Sport, Team } from '../types'
import type { ClubTier, MarketDeal, MarketPlayer, NegotiationResult, RosterTurnover, TradeProposal } from '../types-market'
import { clamp, hashString, mulberry32 } from './rng'

// ─── Porte do clube (mesmas faixas de força da Carreira) ─────────────────────

export function clubTier(strength: number): ClubTier {
  if (strength >= 85) return 'gigante'
  if (strength >= 70) return 'grande'
  if (strength >= 55) return 'medio'
  return 'pequeno'
}

export const TIER_LABEL: Record<ClubTier, string> = {
  gigante: 'Gigante',
  grande: 'Grande',
  medio: 'Médio',
  pequeno: 'Pequeno'
}

const TIER_RANK: Record<ClubTier, number> = { pequeno: 0, medio: 1, grande: 2, gigante: 3 }

// ─── Finanças do jogador (M = unidade abstrata) ──────────────────────────────

/** salário anual (M) a partir do OVR — cresce forte no topo. Igual nos 2 esportes. */
export function playerSalary(overall: number): number {
  const s = Math.pow(Math.max(0, overall - 40) / 12, 2) * 0.9 + 0.2
  return Math.round(s * 10) / 10
}

/**
 * Fator de idade sobre o valor de mercado — ÚNICA curva que diverge por
 * esporte (decisão desta rodada). Futebol: pico 24-29 (mesma da Carreira).
 * E-sports: pico 20-23, declínio começa em 24-25 e é mais acentuado dali em
 * diante — carreira profissional mais curta e mais precoce.
 */
export function ageValueFactor(sport: Sport, age: number): number {
  if (sport === 'esports') {
    if (age <= 20) return 1.15
    if (age <= 23) return 1.35
    if (age <= 25) return 1.05
    if (age <= 27) return 0.7
    return 0.35
  }
  if (age <= 23) return 1.3
  if (age <= 27) return 1.15
  if (age <= 30) return 1.0
  if (age <= 32) return 0.7
  return 0.4
}

/** valor de mercado (M) — OVR (peso maior), idade (curva por esporte), potencial e contrato */
export function playerValue(
  sport: Sport,
  overall: number,
  age: number,
  potential: number,
  contractYears: number
): number {
  const base = Math.pow(Math.max(0, overall - 40) / 10, 2.6) * 3
  const potFactor = 1 + Math.max(0, potential - overall) * 0.03
  const contractFactor = contractYears <= 1 ? 0.6 : contractYears === 2 ? 0.85 : 1.0
  return Math.max(1, Math.round(base * ageValueFactor(sport, age) * potFactor * contractFactor))
}

/** preenche os campos financeiros de um jogador (contrato seeded 1-4 anos) */
export function withMarketFinance(p: Omit<MarketPlayer, 'contractYears' | 'salary' | 'value'>): MarketPlayer {
  const rnd = mulberry32(hashString(p.id + 'contract'))
  const contractYears = 1 + Math.floor(rnd() * 4) // 1-4
  const salary = playerSalary(p.overall)
  const value = playerValue(p.sport, p.overall, p.age, p.potential, contractYears)
  return { ...p, contractYears, salary, value }
}

// ─── Evolução anual (envelhecimento + contrato) ──────────────────────────────

/** crescimento/queda de OVR no ano — bandas por esporte (mesma forma, janelas diferentes) */
function growthDelta(sport: Sport, age: number, rnd: () => number): number {
  if (sport === 'esports') {
    if (age <= 20) return 3 + Math.round(rnd() * 2) // +3..+5 — ramp de prodígio
    if (age <= 23) return Math.round(rnd() * 2) // 0..+2 — pico
    if (age <= 26) return -1 + Math.round(rnd()) // -1..0 — início do declínio
    return -(3 + Math.round(rnd() * 2)) // -3..-5 — queda acentuada
  }
  if (age <= 23) return 2 + Math.round(rnd() * 2) // +2..+4
  if (age <= 29) return Math.round(rnd() * 2) // 0..+2
  if (age <= 32) return -1 + Math.round(rnd()) // -1..0
  return -(2 + Math.round(rnd() * 2)) // -2..-4
}

// idade em que o potencial TRAVA (não sobe mais) e idade até a qual o OVR
// ainda é limitado pelo potencial (sempre 1 ano depois do travamento) — o
// mesmo desenho da Carreira (trava 28 / teto até 29), só que mais cedo pro
// e-sports (trava 22 / teto até 23), batendo com o pico mais precoce.
const POTENTIAL_LOCK_AGE: Record<Sport, number> = { esports: 22, football: 28 }
const POTENTIAL_CAP_UNTIL_AGE: Record<Sport, number> = { esports: 23, football: 29 }

/**
 * Evolui 1 ano: idade, OVR (rumo ao potencial, depois declínio), potencial
 * (trava ao chegar na idade de pico) e contrato (conta 1 ano — vence de
 * verdade; ao chegar a 0 é responsabilidade de quem chama tratar como
 * Bosman/agente livre, igual a Carreira já faz em `turnoverRoster`).
 */
export function evolvePlayer(sport: Sport, p: MarketPlayer, year: number): MarketPlayer {
  const rnd = mulberry32(hashString(p.id + 'evolve' + year))
  const age = p.age + 1
  const delta = growthDelta(sport, age, rnd)
  const cap = age <= POTENTIAL_CAP_UNTIL_AGE[sport] ? p.potential : 99
  const overall = clamp(Math.min(p.overall + delta, cap), 40, 99)
  const potential = age >= POTENTIAL_LOCK_AGE[sport] ? overall : Math.max(p.potential, overall)
  const contractYears = Math.max(0, p.contractYears - 1)
  const value = playerValue(sport, overall, age, potential, contractYears)
  return { ...p, age, overall, potential, contractYears, value }
}

/**
 * Reposição de elenco ao fim do ano: evolui todo mundo, tira quem chegou a
 * contrato 0 (sai de graça — Bosman), e completa com `makeFillers` se o
 * elenco ficar abaixo do mínimo. Idêntico ao `turnoverRoster` da Carreira,
 * generalizado por esporte.
 */
export function turnoverRoster(
  sport: Sport,
  roster: MarketPlayer[],
  year: number,
  minSquad: number,
  makeFillers: (need: number) => MarketPlayer[]
): RosterTurnover {
  const evolved = roster.map((p) => evolvePlayer(sport, p, year))
  const left = evolved.filter((p) => p.contractYears <= 0)
  const kept = evolved.filter((p) => p.contractYears > 0)
  if (kept.length >= minSquad) return { kept, left }
  const gone = new Set([...left.map((p) => p.id), ...kept.map((p) => p.id)])
  const fillers = makeFillers(minSquad - kept.length).filter((p) => !gone.has(p.id))
  return { kept: [...kept, ...fillers], left }
}

// ─── Finanças do clube ────────────────────────────────────────────────────────

const BUDGET_BY_TIER: Record<ClubTier, number> = { gigante: 180, grande: 70, medio: 22, pequeno: 7 }

/** caixa inicial de transferências por porte (M) */
export function startingBudget(tier: ClubTier): number {
  return BUDGET_BY_TIER[tier]
}

/** folha atual (soma dos salários) */
export function wageBill(players: MarketPlayer[]): number {
  return Math.round(players.reduce((s, p) => s + p.salary, 0) * 10) / 10
}

/** teto de folha: folha inicial + 25% de espaço pra contratar */
export function wageCapFor(players: MarketPlayer[]): number {
  return Math.round(wageBill(players) * 1.25 * 10) / 10
}

/** receita do fim do ano (M) = base por porte + premiação pela campanha */
export function seasonRevenue(tier: ClubTier, position: number, totalTeams: number, champion: boolean): number {
  const base = BUDGET_BY_TIER[tier] * 0.5
  const prize = Math.max(0, totalTeams - position) * 1.5 + (champion ? 40 : 0)
  return Math.round((base + prize) * 10) / 10
}

// ─── Titular (genérico — cada modo decide o tamanho do "onze") ───────────────

/** os `startersCount` de maior OVR do elenco contam como titulares */
export function isStarter(roster: MarketPlayer[], playerId: string, startersCount: number): boolean {
  const starters = new Set(
    [...roster].sort((a, b) => b.overall - a.overall).slice(0, startersCount).map((p) => p.id)
  )
  return starters.has(playerId)
}

// ─── Venda (dinheiro) ─────────────────────────────────────────────────────────

/** preço "pedido" pelo clube vendedor (M) — valor × multiplicador */
export function askingPrice(value: number, isStarter: boolean, contractYears: number): number {
  const starterMul = isStarter ? 1.6 : 1.1
  const contractMul = contractYears <= 1 ? 0.6 : contractYears === 2 ? 0.85 : 1.0
  return Math.max(1, Math.round(value * starterMul * contractMul))
}

/**
 * Resposta do clube vendedor a uma oferta de compra em dinheiro. "Vontade
 * própria": um titular de clube maior recusa cair pra um clube menor (sem
 * via de salário — sweetener salarial não modelado aqui). Fora isso: aceita
 * se a oferta cobre o pedido, contrapropõe se está perto, recusa se está baixa.
 */
export function negotiateFee(
  value: number,
  isStarter: boolean,
  contractYears: number,
  sellerTier: ClubTier,
  buyerTier: ClubTier,
  offeredFee: number
): NegotiationResult {
  if (isStarter && TIER_RANK[buyerTier] < TIER_RANK[sellerTier]) {
    return { status: 'refused', reason: 'O jogador é titular e não quer descer de nível — nem por dinheiro (por ora).' }
  }
  const ask = askingPrice(value, isStarter, contractYears)
  if (offeredFee >= ask) return { status: 'accepted' }
  if (offeredFee >= ask * 0.85) {
    return { status: 'counter', counter: ask, reason: 'Chegou perto — o clube pede um pouco mais.' }
  }
  return { status: 'refused', reason: 'Oferta muito abaixo do que o clube pede.' }
}

// ─── Troca (jogador por jogador) ──────────────────────────────────────────────

/**
 * Resposta do clube DONO do `targetPlayer` a uma proposta de troca. Reaproveita
 * `askingPrice` tratando "jogador oferecido + dinheiro" como uma oferta só:
 * a mesma vontade própria de `negotiateFee` vale aqui (titular não desce de
 * porte, nem trocando por outro jogador). O `counter`, quando existe, é o
 * dinheiro extra necessário pra fechar com o MESMO par de jogadores — pode
 * ser a mesma lógica de "sweetening" que uma venda em dinheiro usaria.
 */
export function evaluateTrade(p: TradeProposal): NegotiationResult {
  if (p.targetPlayerIsStarter && TIER_RANK[p.proposingClubTier] < TIER_RANK[p.owningClubTier]) {
    return {
      status: 'refused',
      reason: 'O clube não abre mão do titular pra descer de nível — nem trocando por outro jogador.'
    }
  }
  const ask = askingPrice(p.targetPlayer.value, p.targetPlayerIsStarter, p.targetPlayer.contractYears)
  const offerValue = p.offeredPlayer.value + p.cashAdjustment
  if (offerValue >= ask) return { status: 'accepted' }
  if (offerValue >= ask * 0.85) {
    return {
      status: 'counter',
      counter: Math.round((ask - p.offeredPlayer.value) * 10) / 10,
      reason: 'A troca chegou perto — o clube pede uma bolada a mais pra fechar.'
    }
  }
  return { status: 'refused', reason: 'A troca ficou muito abaixo do que o clube pede pelo jogador.' }
}

// ─── Mercado autônomo (clubes controlados por IA se movem sozinhos) ─────────

export interface MarketActivityOptions {
  seed: string
  /** ids que nunca participam como origem/destino (ex.: o clube do usuário na Carreira) */
  excludeClubIds?: string[]
  /** tamanho mínimo de elenco — abaixo disso o clube não vende/troca pra fora */
  minSquadSize: number
  /** quantos jogadores contam como "titular" pra vontade própria (11 futebol, 5 e-sports) */
  startersCount: number
  /** intervalo de negócios tentados nesta janela (padrão 2-4, igual à Carreira) */
  dealRange?: [number, number]
  /** chance de um negócio virar TROCA em vez de venda em dinheiro (padrão 35%) */
  swapChance?: number
}

export interface MarketActivityResult {
  rostersByClub: Record<string, MarketPlayer[]>
  deals: MarketDeal[]
}

/**
 * Simula alguns negócios entre clubes controlados pela IA por janela — venda
 * em dinheiro OU troca, sorteado por negócio. Generaliza `aiTransfers` da
 * Carreira (que só fazia venda): mesmo filtro de porte + vontade própria +
 * elenco mínimo, agora também tentando trocas 1-por-1. Sem orçamento de IA
 * modelado (provisório, igual à Carreira).
 */
export function simulateMarketActivity(
  teams: Team[],
  rostersByClub: Record<string, MarketPlayer[]>,
  opts: MarketActivityOptions
): MarketActivityResult {
  const rnd = mulberry32(hashString(opts.seed + 'market-activity'))
  const excluded = new Set(opts.excludeClubIds ?? [])
  const next: Record<string, MarketPlayer[]> = Object.fromEntries(
    Object.entries(rostersByClub).map(([k, v]) => [k, [...v]])
  )
  const deals: MarketDeal[] = []
  const clubIds = teams.map((t) => t.id).filter((id) => !excluded.has(id) && next[id])
  const strengthOf = (id: string): number => teams.find((t) => t.id === id)?.strength ?? 60
  const nameOf = (id: string): string => teams.find((t) => t.id === id)?.name ?? id
  const [lo, hi] = opts.dealRange ?? [2, 4]
  const swapChance = opts.swapChance ?? 0.35
  const count = lo + Math.floor(rnd() * (hi - lo + 1))

  for (let i = 0; i < count && clubIds.length >= 2; i++) {
    const fromId = clubIds[Math.floor(rnd() * clubIds.length)]
    const toId = clubIds[Math.floor(rnd() * clubIds.length)]
    if (fromId === toId) continue
    const fromRoster = next[fromId]
    const toRoster = next[toId]
    if (!fromRoster || fromRoster.length <= opts.minSquadSize) continue
    const player = fromRoster[Math.floor(rnd() * fromRoster.length)]
    if (!player) continue
    const fromTier = clubTier(strengthOf(fromId))
    const toTier = clubTier(strengthOf(toId))
    const starter = isStarter(fromRoster, player.id, opts.startersCount)
    // vontade própria: titular não desce de porte
    if (starter && TIER_RANK[toTier] < TIER_RANK[fromTier]) continue

    const wantsSwap = rnd() < swapChance && toRoster && toRoster.length > opts.minSquadSize
    if (wantsSwap) {
      const counterpart = toRoster[Math.floor(rnd() * toRoster.length)]
      if (!counterpart) continue
      const counterpartStarter = isStarter(toRoster, counterpart.id, opts.startersCount)
      // vontade própria no sentido contrário também
      if (counterpartStarter && TIER_RANK[fromTier] < TIER_RANK[toTier]) continue
      next[fromId] = fromRoster.filter((p) => p.id !== player.id).concat(counterpart)
      next[toId] = toRoster.filter((p) => p.id !== counterpart.id).concat(player)
      deals.push({
        kind: 'swap',
        playerId: player.id,
        playerName: player.name,
        fromClubId: fromId,
        fromClubName: nameOf(fromId),
        toClubId: toId,
        toClubName: nameOf(toId),
        fee: 0,
        counterpartPlayerId: counterpart.id,
        counterpartPlayerName: counterpart.name,
        ai: true
      })
    } else {
      next[fromId] = fromRoster.filter((p) => p.id !== player.id)
      next[toId] = [...next[toId], player]
      deals.push({
        kind: 'sale',
        playerId: player.id,
        playerName: player.name,
        fromClubId: fromId,
        fromClubName: nameOf(fromId),
        toClubId: toId,
        toClubName: nameOf(toId),
        fee: askingPrice(player.value, starter, player.contractYears),
        ai: true
      })
    }
  }
  return { rostersByClub: next, deals }
}
