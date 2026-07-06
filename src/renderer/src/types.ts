// ============================================================
//  Modelo de domínio — Simulador de Campeonatos
// ============================================================

export type Sport = 'football' | 'esports'
export type Format =
  | 'league'
  | 'cup'
  | 'groups'
  | 'swiss'
  | 'league-playoffs'
  | 'double-elim'
  | 'triple-elim'
export type TeamCategory = 'club' | 'national' | 'custom'
export type BestOf = 1 | 3 | 5
/** jogo do e-sports — define pool de mapas e contexto da série */
export type EsportsGame = 'cs2' | 'valorant'

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface Player {
  id: string
  name: string
  position: Position // no e-sports reaproveitamos como "role" visual
}

export interface Team {
  id: string
  name: string
  shortName: string // sigla de 3 letras
  strength: number // 1-100 — força geral (semeadura, e-sports, pênaltis)
  /** setores 1-100 (futebol) — quando ausentes, derivados da força geral */
  attack?: number
  midfield?: number
  defense?: number
  category: TeamCategory
  sport: Sport
  color: string // cor primária (hex)
  logo?: string // emoji opcional; ausência => renderiza iniciais
  country?: string
  squad?: Player[] // gerado quando o torneio inicia
}

// ---------- Detalhes de partida por esporte ----------

export interface Goal {
  minute: number
  teamId: string
  playerId: string
  playerName: string
  ownGoal?: boolean
}

export interface FootballDetail {
  goals: Goal[]
  possession: [number, number]
  shots: [number, number]
  shotsOnTarget: [number, number]
  corners: [number, number]
  fouls: [number, number]
  yellow: [number, number]
  red: [number, number]
}

export interface EsportsMap {
  name: string
  home: number // rounds vencidos
  away: number
  /** KDA dos 10 jogadores neste mapa (partidas antigas não têm) */
  lines?: EsportsPlayerLine[]
}

export interface EsportsPlayerLine {
  playerId: string
  name: string
  teamId: string
  kills: number
  deaths: number
  assists: number
}

export interface EsportsDetail {
  bestOf: BestOf
  maps: EsportsMap[] // mapas disputados na série
  mvp: EsportsPlayerLine
  lines: EsportsPlayerLine[] // KDA de todos os jogadores
  totalKills: [number, number]
}

// ---------- Partida ----------

export interface Match {
  id: string
  /** índice da rodada dentro da fase (liga/grupos/suíço/mata-mata) */
  round: number
  /** rótulo legível: "Rodada 3", "Quartas de final", "Grupo A · R2" */
  stage: string
  groupId?: string
  homeId: string
  awayId: string
  played: boolean
  /** placar genérico: gols (futebol) OU mapas vencidos (e-sports) */
  homeScore: number
  awayScore: number
  // --- decisão de mata-mata ---
  extraTime?: boolean
  penalties?: [number, number]
  winnerId?: string
  // --- detalhe por esporte ---
  football?: FootballDetail
  esports?: EsportsDetail
}

// ---------- Estruturas de formato ----------

export interface Group {
  id: string // 'A', 'B', ...
  name: string // 'Grupo A'
  teamIds: string[]
}

/** de onde vem um lado de um confronto (dupla/tripla eliminação) */
export interface BracketFeed {
  bm: string // id do BracketMatch de origem
  take: 'winner' | 'loser'
}

export interface BracketMatch {
  id: string
  roundIndex: number
  slot: number
  homeId: string | null
  awayId: string | null
  /** rótulo de origem quando o time ainda não foi definido */
  homeSource?: string
  awaySource?: string
  matchId: string | null // Match real, criado quando ambos os lados são conhecidos
  /** ida e volta: [idaId, voltaId]; vencedor pelo agregado */
  legIds?: string[]
  winnerId: string | null
  // --- dupla/tripla eliminação ---
  loserId?: string | null
  /** origem explícita de cada lado (winners/losers/última chance) */
  homeFrom?: BracketFeed
  awayFrom?: BracketFeed
  /** confronto de reset da grande final — só ocorre se o desafiante vencer o `resetOf` */
  resetOf?: string
  /** resolvido sem partida (bye/vazio) */
  bye?: boolean
  /** seção do chaveamento (winners/losers/última chance/grande final) */
  section?: 'wb' | 'lb' | 'lcb' | 'gf'
}

export interface BracketRound {
  index: number
  name: string // 'Oitavas', 'Quartas', 'Semifinal', 'Final'
  matches: BracketMatch[]
  /** rodada disputada em ida e volta (agregado) */
  twoLegged?: boolean
  /** seção do chaveamento (dupla/tripla eliminação) */
  section?: 'wb' | 'lb' | 'lcb' | 'gf'
  /** rodada com ressorteio: os entrantes são repareados evitando revanches */
  reseed?: boolean
  /** fontes dos entrantes de uma rodada com ressorteio (winner/loser de outras) */
  entrantFeeds?: BracketFeed[]
}

export interface SwissState {
  totalRounds: number
  currentRound: number // 1-based; rodada atualmente gerada
  /** pares já enfrentados, para evitar repetição (chave "a|b" ordenada) */
  playedPairs: string[]
}

// ---------- Configuração do torneio ----------

export interface TournamentConfig {
  /** 100% aleatório: ignora a força dos times (legado; equivale a chaos = 1) */
  pureRandom: boolean
  /** imprevisibilidade 0..1 — 0 = força manda (Realista), 1 = Loteria. Tem precedência sobre `pureRandom` */
  chaos?: number
  /** forma/embalo: times embalados ganham boost; em má fase, levam penalidade */
  momentum?: boolean
  /** ida e volta (apenas liga e grupos) */
  homeAndAway: boolean
  /** e-sports: formato da série */
  bestOf: BestOf
  /** e-sports: jogo disputado (pool de mapas) */
  game?: EsportsGame
  /** grupos: número de grupos */
  groupCount: number
  /** grupos: classificados por grupo para o mata-mata */
  qualifiersPerGroup: number
  /** suíço: número de rodadas */
  swissRounds: number
  /** liga+playoffs: nº de classificados ao mata-mata final */
  playoffQualifiers?: number
  /** mata-mata em ida e volta (agregado), exceto a final — só futebol */
  twoLeggedKO?: boolean
}

export type TournamentPhase = 'league' | 'group' | 'knockout' | 'swiss' | 'finished'

export interface Tournament {
  id: string
  name: string
  sport: Sport
  format: Format
  createdAt: number
  updatedAt: number
  config: TournamentConfig
  teams: Team[] // snapshot dos participantes (com elencos gerados)
  matches: Match[]
  groups?: Group[]
  bracket?: BracketRound[]
  swiss?: SwissState
  /** ordem de chaveamento original (mata-mata) — usado para refazer */
  cupSeed?: (string | null)[]
  phase: TournamentPhase
  champion?: string // teamId quando encerrado
}

// ---------- Classificação (tabela) ----------

export interface StandingRow {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  /** posição final (1-based) após ordenação */
  rank: number
}

// ---------- Histórico acumulado entre edições ----------

export interface TeamRecord {
  teamId: string
  teamName: string
  sport: Sport
  titles: number
  finals: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}

export interface ScorerRecord {
  playerId: string
  name: string
  teamId: string
  teamName: string
  goals: number // futebol
  kills: number // e-sports
}

export interface HeadToHead {
  // chave "teamA|teamB" (ids ordenados)
  key: string
  aId: string
  bId: string
  aWins: number
  bWins: number
  draws: number
}

export interface TitleEntry {
  tournamentId: string
  tournamentName: string
  sport: Sport
  format: Format
  championId: string
  championName: string
  date: number
}

export interface History {
  teamRecords: Record<string, TeamRecord>
  scorers: Record<string, ScorerRecord>
  headToHead: Record<string, HeadToHead>
  titles: TitleEntry[]
}

/** "Receita" de um campeonato já realizado — permite repetir gerando um novo. */
export interface SetupBlueprint {
  id: string
  name: string
  sport: Sport
  format: Format
  config: TournamentConfig
  teams: Team[] // snapshot sem elencos (regenerados ao repetir)
  date: number
}

// ---------- Modo Temporada ----------

export interface SeasonSlot {
  id: string
  name: string
  format: Format
  config: TournamentConfig
  /**
   * Times específicos deste campeonato dentro da temporada. Quando presente,
   * o campeonato usa apenas estes times (ex.: Brasileirão = clubes BR). Quando
   * ausente, usa o pool global da temporada (criação manual).
   */
  teamIds?: string[]
}

export interface SeasonScorerEntry {
  playerId: string
  name: string
  teamId: string
  teamName: string
  goals: number
  kills: number
}

export interface SeasonYearEntry {
  year: number
  champions: Array<{ slotId: string; slotName: string; teamId: string; teamName: string }>
  scorers: SeasonScorerEntry[]
  /** recordes daquele ano (isolado) — mesma estrutura do all-time */
  records?: SeasonRecords
  completed: boolean
}

/** força base de um time (captada na criação) — usada na evolução entre anos */
export interface SeasonBaseStat {
  s: number // strength
  a?: number // attack (se explícito)
  m?: number // midfield
  d?: number // defense
}

export interface SeasonRecords {
  /** futebol: maior goleada · e-sports: maior atropelo em série (mapas) */
  biggestWin?: {
    winnerId: string
    winnerName: string
    loserId: string
    loserName: string
    winnerScore: number
    loserScore: number
    year: number
    slotName: string
  }
  // ---- recordes de e-sports ----
  /** mais abates de um jogador numa única série */
  mostKillsSeries?: {
    playerId: string
    name: string
    teamId: string
    teamName: string
    kills: number
    year: number
    slotName: string
  }
  /** maior diferença de rounds num único mapa */
  biggestMapStomp?: {
    winnerId: string
    winnerName: string
    loserId: string
    loserName: string
    winnerRounds: number
    loserRounds: number
    mapName: string
    year: number
    slotName: string
  }
  /** contagem de MVPs por jogador na temporada (id → dados) */
  mvpCounts?: Record<string, { name: string; teamId: string; teamName: string; count: number }>
}

export interface Season {
  id: string
  name: string
  sport: Sport
  game?: EsportsGame
  period: number
  slots: SeasonSlot[]
  teamPool: Team[]
  currentYear: number
  currentSlotIndex: number
  years: SeasonYearEntry[]
  allTimeScorers: SeasonScorerEntry[]
  allTimeWins: Record<string, number>
  /** força base por time (id → stats) — referência para a evolução anual */
  baseStats: Record<string, SeasonBaseStat>
  /** "forma" atual por time (delta aplicado à base no ano corrente) */
  teamForm: Record<string, number>
  records: SeasonRecords
  status: 'playing' | 'year-summary' | 'completed'
  createdAt: number
  updatedAt: number
}
