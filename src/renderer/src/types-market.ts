// ---------- Engine de Mercado (venda e troca de jogadores) ----------
// Tipos GENÉRICOS: independentes de futebol/e-sports e de qualquer modo
// (Carreira, Temporada, avulso). Cada modo mapeia o próprio jogador/elenco
// pra este formato na hora de usar a engine (`engine/market.ts`) — nada aqui
// assume `CareerPlayer`, formação, ou qualquer conceito específico de modo.
// Ver spec: Mixeng › "Simulador - Engine de Mercado (Transferências)".
import type { Sport } from './types'

export type ClubTier = 'gigante' | 'grande' | 'medio' | 'pequeno'

/**
 * Jogador negociável. `role` é texto livre (posição no futebol, papel no
 * e-sports) — cada modo decide o próprio vocabulário; a engine nunca olha
 * pro valor de `role`, só carrega ele adiante nos negócios registrados.
 * Sem moral/eventos: isso é escopo do modo que for consumir a engine (ex.:
 * a Carreira já tem o próprio sistema de moral — não duplicado aqui).
 */
export interface MarketPlayer {
  id: string
  name: string
  sport: Sport
  role: string
  age: number
  overall: number // 40-99
  potential: number // >= overall enquanto sobe; converge com a idade
  contractYears: number
  salary: number // M/ano (unidade abstrata — cada modo decide a escala real)
  value: number // valor de mercado (M)
}

export interface NegotiationResult {
  status: 'accepted' | 'counter' | 'refused'
  /** counter: venda = nova cifra pedida; troca = dinheiro extra necessário pra fechar */
  counter?: number
  /** motivo em PT-BR (refused/counter) */
  reason?: string
}

/**
 * Proposta de TROCA: 1 jogador por 1 jogador, com dinheiro complementar
 * opcional de qualquer um dos lados. `cashAdjustment` positivo = o
 * proponente ADICIONA dinheiro junto com o jogador oferecido; negativo =
 * o proponente PEDE dinheiro de volta (o jogador oferecido "vale mais").
 */
export interface TradeProposal {
  /** jogador que o proponente oferece (sai do elenco dele) */
  offeredPlayer: MarketPlayer
  offeredPlayerIsStarter: boolean
  /** jogador que o proponente quer receber (sai do elenco do dono) */
  targetPlayer: MarketPlayer
  targetPlayerIsStarter: boolean
  /** porte do clube que PROPÕE a troca (dono do `offeredPlayer`) */
  proposingClubTier: ClubTier
  /** porte do clube DONO do `targetPlayer` (quem decide aceitar ou não) */
  owningClubTier: ClubTier
  cashAdjustment: number
}

/**
 * Negócio concluído — venda (dinheiro) ou troca (jogador por jogador).
 * Generaliza `TransferRecord` (hoje só-Carreira, só-venda, em types-career.ts).
 */
export interface MarketDeal {
  kind: 'sale' | 'swap'
  playerId: string
  playerName: string
  fromClubId: string
  fromClubName: string
  toClubId: string
  toClubName: string
  /** venda: valor cheio pago (M). troca: dinheiro que acompanhou o jogador oferecido (pode ser 0 ou negativo) */
  fee: number
  /** só em troca ('swap'): o jogador que veio no sentido contrário */
  counterpartPlayerId?: string
  counterpartPlayerName?: string
  /** negócio entre dois clubes controlados pela IA (não envolveu o usuário) */
  ai?: boolean
}

export interface RosterTurnover {
  kept: MarketPlayer[]
  left: MarketPlayer[]
}
