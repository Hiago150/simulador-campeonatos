// ---------- Modo Carreira (Fase 1 — núcleo jogável, futebol) ----------
// Tipos EXCLUSIVOS da Carreira, isolados de types.ts de propósito: Avulso e
// Temporada continuam com times-bloco e não enxergam jogador individual.
// Ver spec: Mixeng › "Simulador - Modo Treinador (Carreira)".
import type { Position, Tournament } from './types'

/** jogador da Carreira — overall (OVR) estilo FIFA na mesma escala 1-99 da força */
export interface CareerPlayer {
  id: string
  name: string
  position: Position // GK | DEF | MID | FWD (mesma do elenco real)
  age: number
  overall: number // 40-99
  potential: number // >= overall enquanto jovem; converge com a idade
}

/** formações da Fase 1 — GK é sempre 1; linhas somam 10 */
export type FormationId = '4-3-3' | '4-4-2' | '3-5-2' | '5-3-2' | '4-2-4'

export interface CareerLineup {
  formation: FormationId
  /** 11 ids na ordem GK → DEF → MID → FWD (tamanho de cada linha vem da formação) */
  starterIds: string[]
}

export type ClubTier = 'gigante' | 'grande' | 'medio' | 'pequeno'

export type ObjectiveKind =
  | 'win-title'
  | 'top-n'
  | 'reach-stage' // reservado (ano com mata-mata — Fase 2+)
  | 'avoid-relegation'
  | 'mid-table'
  | 'relative-to-last-year'

export interface BoardObjective {
  kind: ObjectiveKind
  /** top-n: posição alvo; relative: posição do ano anterior; avoid-relegation: tamanho da zona */
  target?: number
  /** frase da diretoria em PT-BR ("Termine entre os 4 primeiros") */
  label: string
}

export type ObjectiveOutcome = 'superou' | 'cumpriu' | 'falhou'

/** um ano fechado da carreira (linha do tempo do técnico) */
export interface CareerSeasonEntry {
  year: number
  clubId: string
  clubName: string
  objectiveLabel: string
  position: number
  totalTeams: number
  champion: boolean
  outcome: ObjectiveOutcome
  confidenceEnd: number
  reputationEnd: number
  fired: boolean
}

export interface JobOffer {
  clubId: string
  tier: ClubTier
  /** pitch curto da diretoria */
  note: string
}

/** dados do veredito anual, prontos pra tela de review */
export interface YearReview {
  year: number
  clubName: string
  objectiveLabel: string
  position: number
  totalTeams: number
  champion: boolean
  outcome: ObjectiveOutcome
  confidenceDelta: number
  reputationDelta: number
  confidenceEnd: number
  reputationEnd: number
  fired: boolean
  /** texto do veredito da diretoria (PT-BR, gerado na hora) */
  text: string
  /** maiores evoluções/quedas do elenco na virada do ano */
  evolution: { playerId: string; name: string; before: number; after: number }[]
}

export type CareerStatus = 'in-season' | 'year-review' | 'offers'

export interface Career {
  id: string
  managerName: string
  universeLabel: string
  /** clubes da liga (snapshot, sem elenco — só o clube do usuário tem jogadores) */
  teams: import('./types').Team[]
  clubId: string
  players: CareerPlayer[]
  lineup: CareerLineup
  year: number
  /** 1-100 — atravessa clubes, é do TÉCNICO */
  reputation: number
  /** 0-100 — é do vínculo com o clube atual */
  confidence: number
  objective: BoardObjective
  /** liga do ano em andamento (null só em transição) */
  tournament: Tournament | null
  /** última posição por clube (alimenta o objetivo "melhorar vs. ano anterior") */
  lastPositionByClub: Record<string, number>
  history: CareerSeasonEntry[]
  titles: { year: number; name: string }[]
  status: CareerStatus
  pendingReview?: YearReview
  pendingOffers?: JobOffer[]
  createdAt: number
  updatedAt: number
}
