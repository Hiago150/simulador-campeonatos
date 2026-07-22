// Engine pura do Modo Carreira (Fase 1) — sem UI, sem store, determinística
// onde importa (seeds por id). A Carreira NÃO simula partida: ela só traduz
// elenco escalado → força/setores e deixa o motor existente (tournament.ts/
// simulate.ts) fazer o resto.
//
// Números de calibração são PROVISÓRIOS de propósito (spec: "calibrar na hora
// de codar; pontas soltas depois") — concentrados nas constantes abaixo.
import type { Position, Team } from '../types'
import type {
  BoardObjective,
  CareerLineup,
  CareerPlayer,
  ClubTier,
  FormationId,
  JobOffer,
  ObjectiveOutcome
} from '../types-career'
import { clamp, hashString, mulberry32 } from './rng'

// ─── Finanças (Fase 2) — todos os valores em "M" (milhões). Provisório. ──────

/** salário anual (M) a partir do OVR — cresce forte no topo */
export function playerSalary(overall: number): number {
  const s = Math.pow(Math.max(0, overall - 40) / 12, 2) * 0.9 + 0.2
  return Math.round(s * 10) / 10
}

/** valor de mercado (M) — OVR (peso maior), idade, potencial e contrato */
export function playerValue(overall: number, age: number, potential: number, contractYears: number): number {
  const base = Math.pow(Math.max(0, overall - 40) / 10, 2.6) * 3
  const ageFactor = age <= 23 ? 1.3 : age <= 27 ? 1.15 : age <= 30 ? 1.0 : age <= 32 ? 0.7 : 0.4
  const potFactor = 1 + Math.max(0, potential - overall) * 0.03
  const contractFactor = contractYears <= 1 ? 0.6 : contractYears === 2 ? 0.85 : 1.0
  return Math.max(1, Math.round(base * ageFactor * potFactor * contractFactor))
}

/** preenche os campos financeiros de um jogador (contrato seeded 1-4 anos) */
export function withFinance(p: Omit<CareerPlayer, 'contractYears' | 'salary' | 'value'>): CareerPlayer {
  const rnd = mulberry32(hashString(p.id + 'contract'))
  const contractYears = 1 + Math.floor(rnd() * 4) // 1-4
  const salary = playerSalary(p.overall)
  const value = playerValue(p.overall, p.age, p.potential, contractYears)
  return { ...p, contractYears, salary, value }
}

// ─── Formações: quantos por linha (GK é sempre 1) ────────────────────────────

export const FORMATIONS: Record<FormationId, { def: number; mid: number; fwd: number }> = {
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
  '5-3-2': { def: 5, mid: 3, fwd: 2 },
  '4-2-4': { def: 4, mid: 2, fwd: 4 }
}

export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[]

// ─── Geração de elenco (OVR estilo FIFA, seed por jogador) ───────────────────

/**
 * Converte o elenco de nomes reais (ou procedurais) do time num elenco de
 * Carreira com OVR/idade/potencial. Determinístico: mesma entrada, mesmo elenco.
 * OVR ancora na força do clube: titulares em torno dela, reservas abaixo,
 * ~1 em 6 vira "craque" com bônus.
 */
export function generateCareerRoster(
  team: Team,
  squad: { id: string; name: string; position: Position }[]
): CareerPlayer[] {
  const base = team.strength
  return squad.map((p, i) => {
    const rnd = mulberry32(hashString(p.id + p.name + 'career'))
    // primeiros ~11 do elenco tendem a ser o time titular real → offset melhor
    const starterish = i < 11
    let overall = base + (starterish ? -3 + Math.round(rnd() * 8) : -9 + Math.round(rnd() * 8))
    if (rnd() < 0.16) overall += 3 + Math.round(rnd() * 4) // craque
    overall = clamp(Math.round(overall), 40, 99)

    // idade 17-36, centrada em ~26 (média de duas uniformes)
    const age = Math.round(17 + ((rnd() + rnd()) / 2) * 19)

    // potencial: jovem tem teto acima do OVR; aos 28+ o potencial é o próprio OVR
    const headroom = Math.max(0, 28 - age)
    const potential = clamp(overall + Math.round(rnd() * Math.min(12, headroom * 2)), overall, 99)

    return withFinance({ id: p.id, name: p.name, position: p.position, age, overall, potential })
  })
}

// ─── Escalação: melhor XI + tradução pra setores ─────────────────────────────

const byOverall = (a: CareerPlayer, b: CareerPlayer) => b.overall - a.overall

/**
 * Melhor XI pra formação: melhores de cada linha; se o elenco não tem gente
 * suficiente numa posição, completa com os melhores que sobraram de qualquer
 * linha (sem penalidade na Fase 1 — ponta solta documentada).
 */
export function bestLineup(players: CareerPlayer[], formation: FormationId): CareerLineup {
  const shape = FORMATIONS[formation]
  const picked = new Set<string>()
  const pickBest = (pos: Position, count: number): CareerPlayer[] => {
    const pool = players.filter((p) => p.position === pos && !picked.has(p.id)).sort(byOverall)
    const got = pool.slice(0, count)
    got.forEach((p) => picked.add(p.id))
    return got
  }
  const gk = pickBest('GK', 1)
  const def = pickBest('DEF', shape.def)
  const mid = pickBest('MID', shape.mid)
  const fwd = pickBest('FWD', shape.fwd)
  const lineup = [...gk, ...def, ...mid, ...fwd]
  // completa buracos (elenco real curto numa posição) com as melhores sobras
  if (lineup.length < 11) {
    const rest = players.filter((p) => !picked.has(p.id)).sort(byOverall)
    for (const p of rest) {
      if (lineup.length >= 11) break
      lineup.push(p)
      picked.add(p.id)
    }
  }
  return { formation, starterIds: lineup.map((p) => p.id) }
}

export interface LineupSectors {
  strength: number
  attack: number
  midfield: number
  defense: number
}

/**
 * Tradução escalação → setores que a engine já consome (decidido R2):
 * Defesa = média de GK+DEF titulares · Meio = média dos MID · Ataque = média
 * dos FWD; força geral = média dos 3 setores. Jogador escalado fora de posição
 * conta na linha em que foi escalado? Não — conta pela POSIÇÃO dele (simples e
 * transparente; escalar um MID no ataque não vira mágica de setor).
 */
export function lineupSectors(players: CareerPlayer[], lineup: CareerLineup): LineupSectors {
  const starters = lineup.starterIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is CareerPlayer => !!p)
  const avg = (list: CareerPlayer[], fallback: number): number =>
    list.length ? list.reduce((s, p) => s + p.overall, 0) / list.length : fallback
  const overallAvg = avg(starters, 50)
  const defense = avg(starters.filter((p) => p.position === 'GK' || p.position === 'DEF'), overallAvg)
  const midfield = avg(starters.filter((p) => p.position === 'MID'), overallAvg)
  const attack = avg(starters.filter((p) => p.position === 'FWD'), overallAvg)
  const strength = (defense + midfield + attack) / 3
  const r = (v: number) => clamp(Math.round(v), 1, 99)
  return { strength: r(strength), attack: r(attack), midfield: r(midfield), defense: r(defense) }
}

/** aplica a escalação do usuário no Team-bloco que vai pro motor */
export function applyLineupToTeam(team: Team, sectors: LineupSectors): Team {
  return { ...team, strength: sectors.strength, attack: sectors.attack, midfield: sectors.midfield, defense: sectors.defense }
}

// ─── Porte do clube (decidido R3: faixas de força) ───────────────────────────

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

// ─── Objetivo da diretoria (decidido R3: 6 tipos; Fase 1 sem mata-mata) ──────

/**
 * Gera o objetivo do ano pro clube. `lastPosition` = posição do ano anterior
 * NESTE clube (habilita o objetivo "melhorar vs. ano passado").
 */
export function generateObjective(
  team: Team,
  totalTeams: number,
  reputation: number,
  lastPosition?: number
): BoardObjective {
  const tier = clubTier(team.strength)
  const relegationZone = Math.max(2, Math.floor(totalTeams / 5))

  if (tier === 'gigante') {
    if (reputation >= 55) return { kind: 'win-title', label: 'Seja campeão — nada menos que o título' }
    return { kind: 'top-n', target: 2, label: 'Termine no mínimo em 2º lugar' }
  }
  if (tier === 'grande') {
    const n = reputation >= 65 ? 3 : reputation >= 40 ? 4 : 6
    return { kind: 'top-n', target: n, label: `Termine entre os ${n} primeiros` }
  }
  if (tier === 'medio') {
    if (lastPosition != null && lastPosition > Math.ceil(totalTeams / 3)) {
      return {
        kind: 'relative-to-last-year',
        target: lastPosition,
        label: `Melhore a campanha do ano passado (${lastPosition}º)`
      }
    }
    if (reputation >= 60) {
      const n = Math.ceil(totalTeams / 2) - 1
      return { kind: 'top-n', target: n, label: `Briga pela parte de cima: top ${n}` }
    }
    return { kind: 'mid-table', target: Math.ceil(totalTeams / 2), label: 'Termine na metade de cima da tabela' }
  }
  return {
    kind: 'avoid-relegation',
    target: relegationZone,
    label: `Não caia — fique fora das últimas ${relegationZone} posições`
  }
}

// ─── Avaliação do ano (decidido R3: 1x/ano) ──────────────────────────────────

export interface YearEvaluation {
  outcome: ObjectiveOutcome
  confidenceDelta: number
  reputationDelta: number
}

export function evaluateYear(
  objective: BoardObjective,
  position: number,
  totalTeams: number,
  champion: boolean
): YearEvaluation {
  // campeão supera qualquer objetivo que não fosse o próprio título
  if (champion) {
    const outcome: ObjectiveOutcome = objective.kind === 'win-title' ? 'cumpriu' : 'superou'
    return { outcome, confidenceDelta: outcome === 'superou' ? 20 : 12, reputationDelta: outcome === 'superou' ? 8 : 5 }
  }

  const fail = (distance: number): YearEvaluation => ({
    outcome: 'falhou',
    confidenceDelta: -(14 + Math.min(12, distance * 2)),
    reputationDelta: -(3 + Math.min(5, Math.round(distance / 2)))
  })
  const met = (margin: number): YearEvaluation =>
    margin > 0
      ? { outcome: 'superou', confidenceDelta: 16, reputationDelta: 6 }
      : { outcome: 'cumpriu', confidenceDelta: 10, reputationDelta: 4 }

  switch (objective.kind) {
    case 'win-title':
      return fail(position - 1)
    case 'top-n': {
      const n = objective.target ?? 4
      if (position <= n) return met(Math.ceil(n / 2) - position >= 0 ? 1 : 0)
      return fail(position - n)
    }
    case 'mid-table': {
      const half = objective.target ?? Math.ceil(totalTeams / 2)
      if (position <= half) return met(position <= Math.ceil(totalTeams / 3) ? 1 : 0)
      return fail(position - half)
    }
    case 'avoid-relegation': {
      const zone = objective.target ?? Math.max(2, Math.floor(totalTeams / 5))
      const cut = totalTeams - zone
      if (position <= cut) return met(position <= Math.ceil(totalTeams / 2) ? 1 : 0)
      return fail(position - cut)
    }
    case 'relative-to-last-year': {
      const last = objective.target ?? totalTeams
      if (position <= last) return met(last - position >= 3 ? 1 : 0)
      return fail(position - last)
    }
    case 'reach-stage':
      // Fase 1 não gera esse tipo (ano sem mata-mata) — tratado como cumprido neutro
      return { outcome: 'cumpriu', confidenceDelta: 0, reputationDelta: 0 }
  }
}

/** texto do veredito da diretoria (PT-BR, tom do app) */
export function verdictText(
  outcome: ObjectiveOutcome,
  objectiveLabel: string,
  position: number,
  champion: boolean,
  fired: boolean
): string {
  if (fired) {
    return `A diretoria perdeu a paciência. O objetivo era claro — ${objectiveLabel.toLowerCase()} — e o ${position}º lugar ficou longe demais. Contrato encerrado.`
  }
  if (champion) {
    return outcome === 'superou'
      ? 'Campeão! A diretoria não esperava tanto — status de ídolo no clube e moral nas alturas.'
      : 'Título entregue. Era exatamente o que a diretoria cobrou — trabalho cumprido com autoridade.'
  }
  if (outcome === 'superou') return `Campanha acima do combinado (${position}º). A diretoria renova a confiança com elogios públicos.`
  if (outcome === 'cumpriu') return `Objetivo cumprido (${position}º). Sem fogos, mas com o emprego garantido — a diretoria segue no plano.`
  return `A meta era ${objectiveLabel.toLowerCase()} e o time terminou em ${position}º. A diretoria registrou a frustração — a confiança encolheu.`
}

// ─── Confiança / demissão ────────────────────────────────────────────────────

export function applyConfidence(current: number, delta: number): number {
  return clamp(Math.round(current + delta), 0, 100)
}

export function isFired(confidence: number): boolean {
  return confidence <= 0
}

// ─── Evolução anual do elenco (decidido R2: pico ~24-29) ─────────────────────

/**
 * Evolui um jogador na virada do ano (idade +1, OVR pela curva):
 * ≤23 sobe forte rumo ao potencial · 24-29 platô com ganho leve · 30-32 começa
 * a cair · 33+ despenca. Ruído determinístico por (id + ano).
 */
export function evolvePlayer(p: CareerPlayer, year: number): CareerPlayer {
  const rnd = mulberry32(hashString(p.id + 'evolve' + year))
  const age = p.age + 1
  let delta: number
  if (age <= 23) delta = 2 + Math.round(rnd() * 2) // +2..+4
  else if (age <= 29) delta = Math.round(rnd() * 2) // 0..+2
  else if (age <= 32) delta = -1 + Math.round(rnd()) // -1..0
  else delta = -(2 + Math.round(rnd() * 2)) // -2..-4
  const cap = age <= 29 ? p.potential : 99
  const overall = clamp(Math.min(p.overall + delta, cap), 40, 99)
  const potential = age >= 28 ? overall : Math.max(p.potential, overall)
  // contrato corre 1 ano; ao vencer, o clube retém (renovação MANUAL é F3 —
  // aqui auto-renova pra 3 anos pra não criar agente livre antes da hora)
  const contractYears = p.contractYears <= 1 ? 3 : p.contractYears - 1
  // salário fixo pelo contrato; valor de mercado acompanha idade/OVR/contrato
  const value = playerValue(overall, age, potential, contractYears)
  return { ...p, age, overall, potential, contractYears, value }
}

// ─── Ofertas de emprego (decidido R3: quantidade+porte escalam; sempre ≥1) ───

const TIER_ORDER: ClubTier[] = ['pequeno', 'medio', 'grande', 'gigante']

function allowedTiers(reputation: number): ClubTier[] {
  if (reputation >= 75) return TIER_ORDER
  if (reputation >= 55) return ['pequeno', 'medio', 'grande']
  if (reputation >= 35) return ['pequeno', 'medio']
  return ['pequeno']
}

export function generateOffers(
  teams: Team[],
  reputation: number,
  excludeClubId: string,
  seed: string
): JobOffer[] {
  const rnd = mulberry32(hashString(seed + 'offers'))
  const tiers = new Set(allowedTiers(reputation))
  const candidates = teams.filter((t) => t.id !== excludeClubId && tiers.has(clubTier(t.strength)))
  // fallback: nunca soft-lock — se nada casa com a reputação, oferece os mais fracos
  const pool = candidates.length
    ? candidates
    : [...teams].filter((t) => t.id !== excludeClubId).sort((a, b) => a.strength - b.strength).slice(0, 3)
  const count = Math.max(1, Math.min(1 + Math.floor(reputation / 25), pool.length))
  const shuffled = [...pool].sort(() => rnd() - 0.5)
  return shuffled.slice(0, count).map((t) => {
    const tier = clubTier(t.strength)
    const note =
      tier === 'gigante' || tier === 'grande'
        ? `${t.name} quer um nome à altura do projeto — e chamou você.`
        : `${t.name} aposta na sua reconstrução — projeto humilde, palavra de tempo.`
    return { clubId: t.id, tier, note }
  })
}

// ─── Força derivada do elenco (Fase 2: liga inteira "viva") ──────────────────

/** força/setores de um clube a partir do MELHOR XI do elenco dele (4-3-3) */
export function deriveClubStrength(players: CareerPlayer[]): LineupSectors {
  return lineupSectors(players, bestLineup(players, '4-3-3'))
}

// ─── Finanças do clube (Fase 2) ──────────────────────────────────────────────

const BUDGET_BY_TIER: Record<ClubTier, number> = { gigante: 180, grande: 70, medio: 22, pequeno: 7 }

/** caixa inicial de transferências por porte (M) */
export function startingBudget(tier: ClubTier): number {
  return BUDGET_BY_TIER[tier]
}

/** folha atual (soma dos salários) */
export function wageBill(players: CareerPlayer[]): number {
  return Math.round(players.reduce((s, p) => s + p.salary, 0) * 10) / 10
}

/** teto de folha: folha inicial + 25% de espaço pra contratar (garante que o
 *  elenco atual sempre cabe). */
export function wageCapFor(players: CareerPlayer[]): number {
  return Math.round(wageBill(players) * 1.25 * 10) / 10
}

/** receita do fim do ano (M) = base por porte + premiação pela campanha */
export function seasonRevenue(tier: ClubTier, position: number, totalTeams: number, champion: boolean): number {
  const base = BUDGET_BY_TIER[tier] * 0.5
  const prize = Math.max(0, totalTeams - position) * 1.5 + (champion ? 40 : 0)
  return Math.round((base + prize) * 10) / 10
}

// ─── Negociação de transferência (Fase 2) ────────────────────────────────────

const TIER_RANK: Record<ClubTier, number> = { pequeno: 0, medio: 1, grande: 2, gigante: 3 }

/** preço "pedido" pelo clube vendedor (M) — valor × multiplicador */
export function askingPrice(value: number, isStarter: boolean, contractYears: number): number {
  const starterMul = isStarter ? 1.6 : 1.1
  const contractMul = contractYears <= 1 ? 0.6 : contractYears === 2 ? 0.85 : 1.0
  return Math.max(1, Math.round(value * starterMul * contractMul))
}

export interface NegotiationResult {
  status: 'accepted' | 'counter' | 'refused'
  /** counter: contraproposta do vendedor (M) */
  counter?: number
  /** motivo em PT-BR (refused/counter) */
  reason?: string
}

/**
 * Resposta do clube vendedor a uma oferta de compra. "Vontade própria" (R4):
 * um titular de clube maior recusa cair pra um clube menor (sem via de salário
 * nesta fase — sweetener salarial fica pra F3). Fora isso: aceita se a oferta
 * cobre o pedido, contrapropõe se está perto, recusa se está baixa.
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
  if (offeredFee >= ask * 0.85) return { status: 'counter', counter: ask, reason: 'Chegou perto — o clube pede um pouco mais.' }
  return { status: 'refused', reason: 'Oferta muito abaixo do que o clube pede.' }
}
