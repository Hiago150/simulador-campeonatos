import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  EsportsGame,
  Season,
  SeasonRecords,
  SeasonScorerEntry,
  SeasonSlot,
  SeasonYearEntry,
  Sport,
  Team,
  Tournament
} from '../types'
import { uid } from '../engine/rng'

// ─── Recordes: extrai de um torneio e combina (all-time ou por ano) ──────────

/** recordes "do torneio" (um único campeonato/slot) */
function slotRecordsOf(
  tournament: Tournament,
  nameOf: (id: string) => string,
  year: number,
  slotName: string,
  sport: Sport
): SeasonRecords {
  const rec: SeasonRecords = {}
  // maior goleada / atropelo em série (margem de placar; soma como desempate)
  for (const m of tournament.matches) {
    if (!m.played) continue
    const margin = Math.abs(m.homeScore - m.awayScore)
    if (margin === 0) continue
    const cur = rec.biggestWin
    const curMargin = cur ? cur.winnerScore - cur.loserScore : -1
    const curSum = cur ? cur.winnerScore + cur.loserScore : -1
    if (margin > curMargin || (margin === curMargin && m.homeScore + m.awayScore > curSum)) {
      const homeWon = m.homeScore > m.awayScore
      const winnerId = homeWon ? m.homeId : m.awayId
      const loserId = homeWon ? m.awayId : m.homeId
      rec.biggestWin = {
        winnerId,
        winnerName: nameOf(winnerId),
        loserId,
        loserName: nameOf(loserId),
        winnerScore: Math.max(m.homeScore, m.awayScore),
        loserScore: Math.min(m.homeScore, m.awayScore),
        year,
        slotName
      }
    }
  }
  if (sport === 'esports') {
    const mvpCounts: Record<string, { name: string; teamId: string; teamName: string; count: number }> = {}
    for (const m of tournament.matches) {
      if (!m.played || !m.esports) continue
      for (const l of m.esports.lines) {
        if (l.kills > (rec.mostKillsSeries?.kills ?? -1)) {
          rec.mostKillsSeries = {
            playerId: l.playerId,
            name: l.name,
            teamId: l.teamId,
            teamName: nameOf(l.teamId),
            kills: l.kills,
            year,
            slotName
          }
        }
      }
      for (const mp of m.esports.maps) {
        const diff = Math.abs(mp.home - mp.away)
        const cur = rec.biggestMapStomp
        if (diff > (cur ? cur.winnerRounds - cur.loserRounds : -1)) {
          const homeWon = mp.home > mp.away
          const wId = homeWon ? m.homeId : m.awayId
          const lId = homeWon ? m.awayId : m.homeId
          rec.biggestMapStomp = {
            winnerId: wId,
            winnerName: nameOf(wId),
            loserId: lId,
            loserName: nameOf(lId),
            winnerRounds: Math.max(mp.home, mp.away),
            loserRounds: Math.min(mp.home, mp.away),
            mapName: mp.name,
            year,
            slotName
          }
        }
      }
      const mvp = m.esports.mvp
      if (mvp) {
        const ex = mvpCounts[mvp.playerId]
        mvpCounts[mvp.playerId] = {
          name: mvp.name,
          teamId: mvp.teamId,
          teamName: nameOf(mvp.teamId),
          count: (ex?.count ?? 0) + 1
        }
      }
    }
    if (Object.keys(mvpCounts).length) rec.mvpCounts = mvpCounts
  }
  return rec
}

/** combina recordes: mantém o melhor de cada (MVPs somam) */
function mergeRecords(target: SeasonRecords | undefined, cand: SeasonRecords): SeasonRecords {
  const out: SeasonRecords = JSON.parse(JSON.stringify(target ?? {}))
  if (cand.biggestWin) {
    const c = cand.biggestWin
    const t = out.biggestWin
    const cM = c.winnerScore - c.loserScore
    const cS = c.winnerScore + c.loserScore
    const tM = t ? t.winnerScore - t.loserScore : -1
    const tS = t ? t.winnerScore + t.loserScore : -1
    if (cM > tM || (cM === tM && cS > tS)) out.biggestWin = c
  }
  if (cand.mostKillsSeries) {
    if (!out.mostKillsSeries || cand.mostKillsSeries.kills > out.mostKillsSeries.kills) {
      out.mostKillsSeries = cand.mostKillsSeries
    }
  }
  if (cand.biggestMapStomp) {
    const c = cand.biggestMapStomp
    const t = out.biggestMapStomp
    const cd = c.winnerRounds - c.loserRounds
    const td = t ? t.winnerRounds - t.loserRounds : -1
    if (cd > td) out.biggestMapStomp = c
  }
  if (cand.mvpCounts) {
    const mc = { ...(out.mvpCounts ?? {}) }
    for (const [pid, v] of Object.entries(cand.mvpCounts)) {
      const ex = mc[pid]
      mc[pid] = { name: v.name, teamId: v.teamId, teamName: v.teamName, count: (ex?.count ?? 0) + v.count }
    }
    out.mvpCounts = mc
  }
  return out
}

interface SeasonDraft {
  name: string
  sport: Sport
  game?: EsportsGame
  period: number
  slots: SeasonSlot[]
  teamPool: Team[]
}

interface SeasonStore {
  seasons: Season[]
  activeSeason: Season | null
  pendingTournamentId: string | null

  createSeason: (draft: SeasonDraft) => Season
  setActiveSeason: (id: string | null) => void
  abandonSeason: () => void
  setPendingTournamentId: (id: string | null) => void
  recordSlotResult: (tournament: Tournament) => void
  startNextYear: () => void
  deleteSeason: (id: string) => void
  renameSeason: (id: string, name: string) => void
}

function sync(seasons: Season[], updated: Season): Season[] {
  return seasons.map((s) => (s.id === updated.id ? updated : s))
}

export const useSeasons = create<SeasonStore>()(
  persist(
    (set, get) => ({
      seasons: [],
      activeSeason: null,
      pendingTournamentId: null,

      createSeason: (draft) => {
        const teamPool = draft.teamPool.map(({ squad: _sq, ...rest }) => rest)
        const baseStats: Record<string, { s: number; a?: number; m?: number; d?: number }> = {}
        const teamForm: Record<string, number> = {}
        for (const t of teamPool) {
          baseStats[t.id] = { s: t.strength, a: t.attack, m: t.midfield, d: t.defense }
          teamForm[t.id] = 0
        }
        const season: Season = {
          id: uid('season'),
          name: draft.name,
          sport: draft.sport,
          game: draft.game,
          period: draft.period,
          slots: draft.slots,
          teamPool,
          currentYear: 1,
          currentSlotIndex: 0,
          years: [],
          allTimeScorers: [],
          allTimeWins: {},
          baseStats,
          teamForm,
          records: {},
          status: 'playing',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        set({ seasons: [season, ...get().seasons], activeSeason: season })
        return season
      },

      setActiveSeason: (id) => {
        const s = id ? (get().seasons.find((x) => x.id === id) ?? null) : null
        set({ activeSeason: s })
      },

      abandonSeason: () => set({ activeSeason: null, pendingTournamentId: null }),

      setPendingTournamentId: (id) => set({ pendingTournamentId: id }),

      recordSlotResult: (tournament) => {
        const active = get().activeSeason
        if (!active || active.status !== 'playing' || !tournament.champion) return

        const nameOf = (id: string) => tournament.teams.find((t) => t.id === id)?.name ?? id

        // collect scorers from this tournament
        const slotScorers: SeasonScorerEntry[] = []
        const addScorer = (pid: string, name: string, tid: string, goals: number, kills: number) => {
          const ex = slotScorers.find((s) => s.playerId === pid)
          if (ex) { ex.goals += goals; ex.kills += kills }
          else slotScorers.push({ playerId: pid, name, teamId: tid, teamName: nameOf(tid), goals, kills })
        }
        for (const m of tournament.matches) {
          if (!m.played) continue
          if (m.football) {
            for (const g of m.football.goals) {
              if (!g.ownGoal) addScorer(g.playerId, g.playerName, g.teamId, 1, 0)
            }
          } else if (m.esports) {
            for (const l of m.esports.lines) {
              addScorer(l.playerId, l.name, l.teamId, 0, l.kills)
            }
          }
        }

        const slot = active.slots[active.currentSlotIndex]

        // recordes do torneio → combina com all-time (era) E com o ano atual
        const slotRecords = slotRecordsOf(tournament, nameOf, active.currentYear, slot.name, active.sport)
        const records = mergeRecords(active.records, slotRecords)

        let years = JSON.parse(JSON.stringify(active.years)) as SeasonYearEntry[]

        const yIdx = years.findIndex((y) => y.year === active.currentYear)
        if (yIdx >= 0) {
          years[yIdx].champions.push({
            slotId: slot.id,
            slotName: slot.name,
            teamId: tournament.champion,
            teamName: nameOf(tournament.champion)
          })
          for (const sc of slotScorers) {
            const ex = years[yIdx].scorers.find((s) => s.playerId === sc.playerId)
            if (ex) { ex.goals += sc.goals; ex.kills += sc.kills }
            else years[yIdx].scorers.push({ ...sc })
          }
          years[yIdx].records = mergeRecords(years[yIdx].records, slotRecords)
        } else {
          years.push({
            year: active.currentYear,
            champions: [{ slotId: slot.id, slotName: slot.name, teamId: tournament.champion, teamName: nameOf(tournament.champion) }],
            scorers: [...slotScorers],
            records: mergeRecords(undefined, slotRecords),
            completed: false
          })
        }

        const allTimeScorers = JSON.parse(JSON.stringify(active.allTimeScorers)) as SeasonScorerEntry[]
        for (const sc of slotScorers) {
          const ex = allTimeScorers.find((s) => s.playerId === sc.playerId)
          if (ex) { ex.goals += sc.goals; ex.kills += sc.kills }
          else allTimeScorers.push({ ...sc })
        }

        const allTimeWins = {
          ...active.allTimeWins,
          [tournament.champion]: (active.allTimeWins[tournament.champion] ?? 0) + 1
        }

        const nextSlot = active.currentSlotIndex + 1
        let status: Season['status'] = 'playing'
        let currentYear = active.currentYear
        let currentSlotIndex = nextSlot

        if (nextSlot >= active.slots.length) {
          const yi = years.findIndex((y) => y.year === active.currentYear)
          if (yi >= 0) years[yi] = { ...years[yi], completed: true }
          currentSlotIndex = 0
          if (active.currentYear >= active.period) {
            status = 'completed'
          } else {
            status = 'year-summary'
          }
        }

        const updated: Season = {
          ...active,
          currentYear,
          currentSlotIndex,
          years,
          allTimeScorers,
          allTimeWins,
          records,
          status,
          updatedAt: Date.now()
        }
        set({ seasons: sync(get().seasons, updated), activeSeason: updated, pendingTournamentId: null })
      },

      startNextYear: () => {
        const active = get().activeSeason
        if (!active || active.status !== 'year-summary') return

        // Evolução dos times entre anos: a cada ano ~metade dos times entra em
        // ALTA e ~metade em BAIXA (adaptável ao nº de times), com intensidade
        // média. A "forma" reverte parcialmente à base, então as fases mudam.
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
        const teamForm: Record<string, number> = { ...active.teamForm }
        const shuffledIds = active.teamPool.map((t) => t.id).sort(() => Math.random() - 0.5)
        const risers = new Set(shuffledIds.slice(0, Math.ceil(shuffledIds.length / 2)))
        const teamPool = active.teamPool.map((t) => {
          const base = active.baseStats?.[t.id]
          if (!base) return t
          const dir = risers.has(t.id) ? 1 : -1
          const swing = 4 + Math.random() * 7 // 4..11 (intensidade média)
          const form = clamp((teamForm[t.id] ?? 0) * 0.5 + dir * swing, -18, 18)
          teamForm[t.id] = form
          const off = Math.round(form)
          return {
            ...t,
            strength: clamp(base.s + off, 35, 99),
            attack: base.a != null ? clamp(base.a + off, 35, 99) : t.attack,
            midfield: base.m != null ? clamp(base.m + off, 35, 99) : t.midfield,
            defense: base.d != null ? clamp(base.d + off, 35, 99) : t.defense
          }
        })

        const updated: Season = {
          ...active,
          currentYear: active.currentYear + 1,
          currentSlotIndex: 0,
          teamPool,
          teamForm,
          status: 'playing',
          updatedAt: Date.now()
        }
        set({ seasons: sync(get().seasons, updated), activeSeason: updated })
      },

      deleteSeason: (id) => {
        const active = get().activeSeason
        set({
          seasons: get().seasons.filter((s) => s.id !== id),
          activeSeason: active?.id === id ? null : active,
          pendingTournamentId: active?.id === id ? null : get().pendingTournamentId
        })
      },

      renameSeason: (id, name) => {
        const updated = get().seasons.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s))
        const active = get().activeSeason
        set({ seasons: updated, activeSeason: active?.id === id ? { ...active, name } : active })
      }
    }),
    { name: 'simcamp-seasons' }
  )
)
