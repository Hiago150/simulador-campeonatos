import type { Match, StandingRow, Team, Tournament } from '../types'
import { computeStandings } from './standings'

export function teamMap(t: Tournament): Record<string, Team> {
  const map: Record<string, Team> = {}
  for (const team of t.teams) map[team.id] = team
  return map
}

export function progress(t: Tournament): { played: number; total: number } {
  const played = t.matches.filter((m) => m.played).length
  let total = t.matches.length
  if (t.format === 'cup') {
    total = Math.max(t.teams.length - 1, played)
  } else if (t.format === 'groups') {
    const groupTotal = t.matches.filter((m) => m.groupId).length
    const koTotal = t.config.groupCount * t.config.qualifiersPerGroup - 1
    total = groupTotal + Math.max(koTotal, 0)
  } else if (t.format === 'swiss' && t.swiss) {
    total = t.swiss.totalRounds * Math.floor(t.teams.length / 2)
  }
  return { played, total: Math.max(total, played) }
}

export function leagueStandings(t: Tournament): StandingRow[] {
  return computeStandings(
    t.teams.map((x) => x.id),
    t.matches.filter((m) => !m.groupId)
  )
}

export function groupStandings(t: Tournament): Record<string, StandingRow[]> {
  const out: Record<string, StandingRow[]> = {}
  for (const g of t.groups ?? []) {
    out[g.id] = computeStandings(
      g.teamIds,
      t.matches.filter((m) => m.groupId === g.id)
    )
  }
  return out
}

export interface ScorerLine {
  playerId: string
  name: string
  teamId: string
  value: number
}

/** Artilharia (futebol) ou abates (e-sports) dentro do torneio. */
export function tournamentScorers(t: Tournament, limit = 10): ScorerLine[] {
  const acc = new Map<string, ScorerLine>()
  for (const m of t.matches) {
    if (!m.played) continue
    if (t.sport === 'football' && m.football) {
      for (const g of m.football.goals) {
        if (g.ownGoal) continue
        const cur = acc.get(g.playerId) ?? {
          playerId: g.playerId,
          name: g.playerName,
          teamId: g.teamId,
          value: 0
        }
        cur.value += 1
        acc.set(g.playerId, cur)
      }
    } else if (t.sport === 'esports' && m.esports) {
      for (const l of m.esports.lines) {
        const cur = acc.get(l.playerId) ?? {
          playerId: l.playerId,
          name: l.name,
          teamId: l.teamId,
          value: 0
        }
        cur.value += l.kills
        acc.set(l.playerId, cur)
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.value - a.value).slice(0, limit)
}

export function matchesByRound(matches: Match[]): Map<number, Match[]> {
  const map = new Map<number, Match[]>()
  for (const m of matches) {
    const arr = map.get(m.round) ?? []
    arr.push(m)
    map.set(m.round, arr)
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]))
}
