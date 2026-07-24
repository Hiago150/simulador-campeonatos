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
  // ── financeiro (Fase 2) ──
  contractYears: number // anos restantes de contrato
  salary: number // M/ano (fixo até renovar)
  value: number // valor de mercado (M) — recalculado a cada virada de ano
  // ── moral (Fase 3) ── 0-100; move por tempo de jogo + resultados
  morale: number
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
  /** receita do ano que entrou no caixa (M) — Fase 2 */
  revenue?: number
}

export type CareerStatus = 'in-season' | 'year-review' | 'offers'

/** janela de transferências (Fase 2) — null = mercado só leitura */
export type TransferWindow = 'pre-season' | 'mid-season'

export interface TransferRecord {
  year: number
  window: TransferWindow
  playerId: string
  playerName: string
  fromClubId: string
  fromClubName: string
  toClubId: string
  toClubName: string
  fee: number // M
  /** negócio entre clubes da IA (não envolveu o usuário) — Fase 3 */
  ai?: boolean
}

// ── Eventos (Fase 3) — derivados do estado, nunca roteiro fixo ──────────────

export type CareerEventKind =
  | 'rival-bid' // clube rival quer um titular seu
  | 'bench-unhappy' // reserva insatisfeito com pouco tempo de jogo
  | 'contract-expiring' // titular com contrato acabando (risco Bosman)
  | 'board-sell-demand' // diretoria cobra venda pra equilibrar o caixa

export interface CareerEventOption {
  id: string
  label: string
  /** o que acontece, em PT-BR, pro usuário decidir informado */
  detail: string
}

export interface CareerEvent {
  id: string
  kind: CareerEventKind
  year: number
  title: string
  text: string
  /** jogador no centro do evento (quando houver) */
  playerId?: string
  playerName?: string
  /** clube envolvido (ex.: quem fez a oferta) */
  clubId?: string
  clubName?: string
  /** valor em jogo (M) — oferta, custo de renovação etc. */
  amount?: number
  options: CareerEventOption[]
  /** resposta já dada (resolvido) — mantém no histórico */
  resolvedOptionId?: string
  /** resumo do desfecho, preenchido ao resolver */
  outcome?: string
}

export interface Career {
  id: string
  managerName: string
  universeLabel: string
  /** clubes da liga (snapshot, sem elenco — só o clube do usuário tem jogadores) */
  teams: import('./types').Team[]
  clubId: string
  /** elenco do clube do usuário (fonte da verdade do SEU time) */
  players: CareerPlayer[]
  /** elencos "vivos" de TODOS os outros clubes da liga — a força deles deriva
   *  daqui (Fase 2). Vender pro rival fortalece o rival de verdade. */
  rostersByClub: Record<string, CareerPlayer[]>
  lineup: CareerLineup
  year: number
  // ── finanças + mercado (Fase 2) ──
  /** caixa de transferências (M) */
  budget: number
  /** teto de folha salarial (M/ano) — trava dura */
  wageBudget: number
  /** janela aberta agora (null = mercado só leitura) */
  window: TransferWindow | null
  /** a janela intermediária já abriu neste ano? (abre 1× no meio das rodadas) */
  midSeasonOpened: boolean
  /** histórico de transferências (feedback/extrato) — inclui negócios da IA */
  marketLog: TransferRecord[]
  // ── eventos (Fase 3) ──
  /** caixa de entrada: pendentes primeiro, resolvidos ficam como histórico */
  events: CareerEvent[]
  /** jogadores que saíram de graça por fim de contrato (Bosman) no último turnover */
  lastFreeAgents?: { playerId: string; name: string; overall: number }[]
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
