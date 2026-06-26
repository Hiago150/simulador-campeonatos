// Camada de dados para os GRÁFICOS (Fase 1 — página "Estatísticas").
// Módulo puramente aditivo: nada aqui é importado pelo app ainda, então
// não afeta o comportamento atual. Serve de base para a próxima atualização.
import type { History, Match, Tournament } from '../types'
import { computeStandings } from './standings'

// ------------------------------------------------------------------
//  Evolução por rodada (pontos + posição) — base do gráfico de linha
//  e do "racing chart" de ranking.
// ------------------------------------------------------------------

export interface RoundRow {
  teamId: string
  points: number
  rank: number
  goalDiff: number
  played: number
}

export interface RoundSnapshot {
  round: number
  rows: RoundRow[]
}

/**
 * Para cada rodada 1..N, recalcula a classificação considerando apenas as
 * partidas jogadas até aquela rodada. Devolve um snapshot por rodada.
 */
export function evolutionByRound(teamIds: string[], matches: Match[]): RoundSnapshot[] {
  const played = matches.filter((m) => m.played)
  const maxRound = matches.reduce((mx, m) => Math.max(mx, m.round), 0)
  const snaps: RoundSnapshot[] = []
  for (let r = 1; r <= maxRound; r++) {
    const upto = played.filter((m) => m.round <= r)
    const st = computeStandings(teamIds, upto)
    snaps.push({
      round: r,
      rows: st.map((row) => ({
        teamId: row.teamId,
        points: row.points,
        rank: row.rank,
        goalDiff: row.goalDiff,
        played: row.played
      }))
    })
  }
  return snaps
}

/** Liga / Suíço: evolução considerando todas as partidas sem grupo. */
export function leagueEvolution(t: Tournament): RoundSnapshot[] {
  return evolutionByRound(
    t.teams.map((x) => x.id),
    t.matches.filter((m) => !m.groupId)
  )
}

/** Grupos: um conjunto de snapshots por grupo (id do grupo -> snapshots). */
export function groupEvolution(t: Tournament): Record<string, RoundSnapshot[]> {
  const out: Record<string, RoundSnapshot[]> = {}
  for (const g of t.groups ?? []) {
    out[g.id] = evolutionByRound(
      g.teamIds,
      t.matches.filter((m) => m.groupId === g.id)
    )
  }
  return out
}

// ------------------------------------------------------------------
//  Evolução do mata-mata (avanço no chaveamento por rodada)
//  Métrica = "fase alcançada": quem avança sobe; eliminado estaciona.
// ------------------------------------------------------------------

export function knockoutEvolution(t: Tournament): RoundSnapshot[] {
  const bracket = t.bracket
  if (!bracket || bracket.length === 0) return []

  const teamIds = new Set<string>()
  for (const bm of bracket[0].matches) {
    if (bm.homeId) teamIds.add(bm.homeId)
    if (bm.awayId) teamIds.add(bm.awayId)
  }

  // rodada em que cada time foi eliminado (índice da rodada do chaveamento)
  const elim: Record<string, number> = {}
  for (const round of bracket) {
    for (const bm of round.matches) {
      if (bm.winnerId && bm.homeId && bm.awayId) {
        const loser = bm.winnerId === bm.homeId ? bm.awayId : bm.homeId
        if (loser) elim[loser] = round.index
      }
    }
  }

  // quantas rodadas já tiveram resultado
  let playedRounds = 0
  bracket.forEach((round) => {
    if (round.matches.some((bm) => bm.winnerId)) playedRounds = round.index + 1
  })

  const ids = [...teamIds]
  const snaps: RoundSnapshot[] = []
  for (let r = 0; r < playedRounds; r++) {
    const rows = ids.map((id) => {
      const e = elim[id]
      const reached = e != null && e <= r ? e + 1 : r + 2
      return { teamId: id, points: reached, rank: 0, goalDiff: 0, played: r + 1 }
    })
    rows.sort((a, b) => b.points - a.points)
    rows.forEach((row, i) => (row.rank = i + 1))
    snaps.push({ round: r + 1, rows })
  }
  return snaps
}

// ------------------------------------------------------------------
//  Confrontos diretos (head-to-head)
// ------------------------------------------------------------------

export interface HeadToHeadResult {
  aWins: number
  bWins: number
  draws: number
  matches: Match[]
}

/** Confrontos entre dois times dentro de UM torneio (com lista de jogos). */
export function tournamentHeadToHead(t: Tournament, aId: string, bId: string): HeadToHeadResult {
  const ms = t.matches.filter(
    (m) =>
      m.played &&
      ((m.homeId === aId && m.awayId === bId) || (m.homeId === bId && m.awayId === aId))
  )
  let aWins = 0
  let bWins = 0
  let draws = 0
  for (const m of ms) {
    const winner =
      m.winnerId ??
      (m.homeScore > m.awayScore ? m.homeId : m.awayScore > m.homeScore ? m.awayId : null)
    if (!winner) draws++
    else if (winner === aId) aWins++
    else bWins++
  }
  return { aWins, bWins, draws, matches: ms }
}

/** Confrontos acumulados entre dois times no HISTÓRICO (todas as edições). */
export function historyHeadToHead(
  history: History,
  aId: string,
  bId: string
): { aWins: number; bWins: number; draws: number } {
  const key = [aId, bId].sort().join('|')
  const h = history.headToHead[key]
  if (!h) return { aWins: 0, bWins: 0, draws: 0 }
  // a chave ordena os ids; mapeia de volta para a/b solicitados
  return aId === h.aId
    ? { aWins: h.aWins, bWins: h.bWins, draws: h.draws }
    : { aWins: h.bWins, bWins: h.aWins, draws: h.draws }
}
