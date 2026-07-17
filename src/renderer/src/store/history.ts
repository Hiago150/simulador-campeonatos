import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { History, SetupBlueprint, Tournament } from '../types'

const emptyHistory = (): History => ({
  teamRecords: {},
  scorers: {},
  headToHead: {},
  titles: []
})

interface HistoryState {
  data: History
  committedIds: string[]
  setups: SetupBlueprint[]
  commitTournament: (t: Tournament) => void
  reset: () => void
}

function blueprintOf(t: Tournament): SetupBlueprint {
  return {
    id: t.id,
    name: t.name,
    sport: t.sport,
    format: t.format,
    config: t.config,
    // remove os elencos (regenerados ao repetir) para um snapshot enxuto
    teams: t.teams.map(({ squad, ...rest }) => rest),
    date: Date.now()
  }
}

const h2hKey = (a: string, b: string): string => [a, b].sort().join('|')

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      data: emptyHistory(),
      committedIds: [],
      setups: [],

      commitTournament: (t) => {
        if (!t.champion || get().committedIds.includes(t.id)) return
        const data: History = JSON.parse(JSON.stringify(get().data))
        const nameOf = (id: string): string => t.teams.find((x) => x.id === id)?.name ?? id

        const ensureTeam = (id: string): void => {
          if (!data.teamRecords[id]) {
            data.teamRecords[id] = {
              teamId: id,
              teamName: nameOf(id),
              sport: t.sport,
              titles: 0,
              finals: 0,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              goalsFor: 0,
              goalsAgainst: 0
            }
          } else {
            data.teamRecords[id].teamName = nameOf(id)
            data.teamRecords[id].sport = t.sport
          }
        }

        for (const team of t.teams) ensureTeam(team.id)

        for (const m of t.matches) {
          if (!m.played) continue
          ensureTeam(m.homeId)
          ensureTeam(m.awayId)
          const home = data.teamRecords[m.homeId]
          const away = data.teamRecords[m.awayId]
          home.played++
          away.played++
          home.goalsFor += m.homeScore
          home.goalsAgainst += m.awayScore
          away.goalsFor += m.awayScore
          away.goalsAgainst += m.homeScore

          // resultado
          const decided = m.winnerId
          const h2h = (data.headToHead[h2hKey(m.homeId, m.awayId)] ??= {
            key: h2hKey(m.homeId, m.awayId),
            aId: [m.homeId, m.awayId].sort()[0],
            bId: [m.homeId, m.awayId].sort()[1],
            aWins: 0,
            bWins: 0,
            draws: 0
          })

          if (m.homeScore === m.awayScore && !decided) {
            home.drawn++
            away.drawn++
            h2h.draws++
          } else {
            const homeWon = decided ? decided === m.homeId : m.homeScore > m.awayScore
            if (homeWon) {
              home.won++
              away.lost++
            } else {
              away.won++
              home.lost++
            }
            const winnerId = homeWon ? m.homeId : m.awayId
            if (winnerId === h2h.aId) h2h.aWins++
            else h2h.bWins++
          }

          // artilheiros / abates
          if (m.football) {
            for (const g of m.football.goals) {
              if (g.ownGoal) continue
              const s = (data.scorers[g.playerId] ??= {
                playerId: g.playerId,
                name: g.playerName,
                teamId: g.teamId,
                teamName: nameOf(g.teamId),
                goals: 0,
                kills: 0,
                assists: 0
              })
              s.goals++
              if (g.assistPlayerId && g.assistPlayerName) {
                const a = (data.scorers[g.assistPlayerId] ??= {
                  playerId: g.assistPlayerId,
                  name: g.assistPlayerName,
                  teamId: g.teamId,
                  teamName: nameOf(g.teamId),
                  goals: 0,
                  kills: 0,
                  assists: 0
                })
                a.assists++
              }
            }
          } else if (m.esports) {
            for (const l of m.esports.lines) {
              const s = (data.scorers[l.playerId] ??= {
                playerId: l.playerId,
                name: l.name,
                teamId: l.teamId,
                teamName: nameOf(l.teamId),
                goals: 0,
                kills: 0,
                assists: 0
              })
              s.kills += l.kills
            }
          }
        }

        // finalistas (mata-mata)
        if (t.bracket && t.bracket.length > 0) {
          const finalMatch = t.bracket[t.bracket.length - 1].matches[0]
          if (finalMatch?.homeId) data.teamRecords[finalMatch.homeId] && data.teamRecords[finalMatch.homeId].finals++
          if (finalMatch?.awayId) data.teamRecords[finalMatch.awayId] && data.teamRecords[finalMatch.awayId].finals++
        }

        // título
        ensureTeam(t.champion)
        data.teamRecords[t.champion].titles++
        data.titles.unshift({
          tournamentId: t.id,
          tournamentName: t.name,
          sport: t.sport,
          format: t.format,
          championId: t.champion,
          championName: nameOf(t.champion),
          date: Date.now()
        })

        const setups = [blueprintOf(t), ...get().setups.filter((s) => s.id !== t.id)].slice(0, 12)
        set({ data, committedIds: [...get().committedIds, t.id], setups })
      },

      reset: () => set({ data: emptyHistory(), committedIds: [], setups: [] })
    }),
    { name: 'simcamp-history', version: 1, migrate: (persisted) => persisted as HistoryState }
  )
)
