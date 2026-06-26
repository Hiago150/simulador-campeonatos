import type { Match, StandingRow } from '../types'

/**
 * Calcula a classificação a partir das partidas jogadas.
 * Futebol: V=3, E=1, D=0. E-sports: vitória=3, derrota=0 (sem empate);
 * "gols" = mapas vencidos/sofridos.
 */
export function computeStandings(teamIds: string[], matches: Match[]): StandingRow[] {
  const table = new Map<string, StandingRow>()
  for (const id of teamIds) {
    table.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      rank: 0
    })
  }

  for (const m of matches) {
    if (!m.played) continue
    const home = table.get(m.homeId)
    const away = table.get(m.awayId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += m.homeScore
    home.goalsAgainst += m.awayScore
    away.goalsFor += m.awayScore
    away.goalsAgainst += m.homeScore

    const decidedWinner = m.winnerId // usado em mata-mata (pode haver pênaltis)
    if (m.homeScore === m.awayScore && !decidedWinner) {
      // empate (liga/grupos no futebol)
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    } else {
      const homeWon = decidedWinner ? decidedWinner === m.homeId : m.homeScore > m.awayScore
      if (homeWon) {
        home.won++
        away.lost++
        home.points += 3
      } else {
        away.won++
        home.lost++
        away.points += 3
      }
    }
  }

  const rows = [...table.values()]
  for (const r of rows) r.goalDiff = r.goalsFor - r.goalsAgainst

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      b.won - a.won
  )
  rows.forEach((r, i) => (r.rank = i + 1))
  return rows
}
