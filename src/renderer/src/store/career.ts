// Store do Modo Carreira — 5º store do app, ISOLADO como o da Temporada:
// nada aqui escreve em history/season/library, e o torneio da liga da carreira
// vive DENTRO da carreira (nunca em useApp.current). Persist versionado.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Team, Tournament, TournamentConfig } from '../types'
import type { Career, CareerLineup, FormationId, YearReview } from '../types-career'
import { createTournament, simulateAll, simulateRound } from '../engine/tournament'
import { finalRanking } from '../engine/ranking'
import { generateSquad } from '../engine/names'
import { clamp, uid } from '../engine/rng'
import {
  applyConfidence,
  applyLineupToTeam,
  bestLineup,
  evaluateYear,
  evolvePlayer,
  generateCareerRoster,
  generateObjective,
  generateOffers,
  isFired,
  lineupSectors,
  verdictText
} from '../engine/career'
import { useApp } from './app'

interface StartInput {
  managerName: string
  universeLabel: string
  teams: Team[]
  clubId: string
}

interface CareerStore {
  career: Career | null

  startCareer: (input: StartInput) => void
  setFormation: (formation: FormationId) => void
  setStarter: (slotIndex: number, playerId: string) => void
  autoLineup: () => void
  simRound: () => void
  simYear: () => void
  advanceAfterReview: () => void
  acceptOffer: (clubId: string) => void
  abandonCareer: () => void
}

const LEAGUE_CONFIG: TournamentConfig = {
  pureRandom: false,
  homeAndAway: true,
  bestOf: 3,
  game: undefined,
  groupCount: 4,
  qualifiersPerGroup: 2,
  swissRounds: 5
}

/** monta a liga do ano com o clube do usuário traduzido da escalação (elenco→força) */
function buildYearTournament(c: Career): Tournament {
  const sectors = lineupSectors(c.players, c.lineup)
  const teams = c.teams.map((t) => (t.id === c.clubId ? applyLineupToTeam(t, sectors) : t))
  return createTournament({
    name: `${c.universeLabel} — Ano ${c.year}`,
    sport: 'football',
    format: 'league',
    teams,
    config: LEAGUE_CONFIG,
    footballRosterOverrides: useApp.getState().footballRosterOverrides
  })
}

/**
 * Elenco de Carreira do clube (nomes reais/overrides → OVR seeded).
 * Elenco curto (ex.: override do usuário com 10 nomes) é completado com os
 * nomes reais/procedurais do próprio clube até dar pra escalar 11 + banco.
 */
function rosterFor(club: Team): ReturnType<typeof generateCareerRoster> {
  const base = generateSquad(club, undefined, undefined, useApp.getState().footballRosterOverrides)
  let squad = base
  if (base.length < 16) {
    // complemento PROCEDURAL: id sintético não tem dados reais, então o
    // generateSquad cai no gerador de nomes (determinístico) — cobre elencos
    // reais que vieram curtos da fonte (ex.: squads.json com 10 nomes)
    const used = new Set(base.map((p) => p.name.toLowerCase()))
    const fill = generateSquad({ ...club, id: `${club.id}-fill`, squad: undefined }).filter(
      (p) => !used.has(p.name.toLowerCase())
    )
    squad = [...base, ...fill].slice(0, Math.max(16, base.length))
  }
  return generateCareerRoster(club, squad)
}

/** aplica a escalação atual nas partidas FUTURAS do ano (as jogadas ficam como estão) */
function retranslateCurrentTournament(c: Career): Tournament | null {
  if (!c.tournament) return null
  const sectors = lineupSectors(c.players, c.lineup)
  return {
    ...c.tournament,
    teams: c.tournament.teams.map((t) => (t.id === c.clubId ? applyLineupToTeam(t, sectors) : t))
  }
}

/** fecha o ano: avalia objetivo, atualiza confiança/reputação, monta o review */
function concludeYear(c: Career, finished: Tournament): Career {
  const club = c.teams.find((t) => t.id === c.clubId)!
  const ranking = finalRanking(finished)
  const position = Math.max(1, ranking.indexOf(c.clubId) + 1)
  const total = finished.teams.length
  const champion = finished.champion === c.clubId

  const ev = evaluateYear(c.objective, position, total, champion)
  const confidenceEnd = applyConfidence(c.confidence, ev.confidenceDelta)
  const reputationEnd = clamp(Math.round(c.reputation + ev.reputationDelta), 1, 100)
  const fired = isFired(confidenceEnd)

  // prévia determinística da evolução (aplicada de verdade só na virada do ano)
  const evolutionDiffs = c.players
    .map((p) => {
      const after = evolvePlayer(p, c.year)
      return { playerId: p.id, name: p.name, before: p.overall, after: after.overall }
    })
    .filter((d) => d.after !== d.before)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
    .slice(0, 6)

  const review: YearReview = {
    year: c.year,
    clubName: club.name,
    objectiveLabel: c.objective.label,
    position,
    totalTeams: total,
    champion,
    outcome: ev.outcome,
    confidenceDelta: ev.confidenceDelta,
    reputationDelta: ev.reputationDelta,
    confidenceEnd,
    reputationEnd,
    fired,
    text: verdictText(ev.outcome, c.objective.label, position, champion, fired),
    evolution: evolutionDiffs
  }

  return {
    ...c,
    tournament: finished,
    confidence: confidenceEnd,
    reputation: reputationEnd,
    lastPositionByClub: { ...c.lastPositionByClub, [c.clubId]: position },
    history: [
      ...c.history,
      {
        year: c.year,
        clubId: c.clubId,
        clubName: club.name,
        objectiveLabel: c.objective.label,
        position,
        totalTeams: total,
        champion,
        outcome: ev.outcome,
        confidenceEnd,
        reputationEnd,
        fired
      }
    ],
    titles: champion ? [...c.titles, { year: c.year, name: finished.name }] : c.titles,
    status: 'year-review',
    pendingReview: review,
    updatedAt: Date.now()
  }
}

export const useCareer = create<CareerStore>()(
  persist(
    (set, get) => ({
      career: null,

      startCareer: ({ managerName, universeLabel, teams, clubId }) => {
        const pool = teams.map(({ squad: _sq, ...rest }) => rest)
        const club = pool.find((t) => t.id === clubId)
        if (!club || pool.length < 2) return
        const players = rosterFor(club)
        const lineup = bestLineup(players, '4-3-3')
        const reputation = 40
        const base: Career = {
          id: uid('career'),
          managerName: managerName.trim() || 'Treinador',
          universeLabel,
          teams: pool,
          clubId,
          players,
          lineup,
          year: 1,
          reputation,
          confidence: 60,
          objective: generateObjective(club, pool.length, reputation),
          tournament: null,
          lastPositionByClub: {},
          history: [],
          titles: [],
          status: 'in-season',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        set({ career: { ...base, tournament: buildYearTournament(base) } })
      },

      setFormation: (formation) => {
        const c = get().career
        if (!c || c.status !== 'in-season') return
        // trocar formação re-escala o melhor XI automaticamente (ajustes finos depois)
        const lineup = bestLineup(c.players, formation)
        const next = { ...c, lineup, updatedAt: Date.now() }
        set({ career: { ...next, tournament: retranslateCurrentTournament(next) } })
      },

      setStarter: (slotIndex, playerId) => {
        const c = get().career
        if (!c || c.status !== 'in-season') return
        if (slotIndex < 0 || slotIndex >= c.lineup.starterIds.length) return
        if (c.lineup.starterIds.includes(playerId)) return // já é titular
        const starterIds = [...c.lineup.starterIds]
        starterIds[slotIndex] = playerId
        const lineup: CareerLineup = { ...c.lineup, starterIds }
        const next = { ...c, lineup, updatedAt: Date.now() }
        set({ career: { ...next, tournament: retranslateCurrentTournament(next) } })
      },

      autoLineup: () => {
        const c = get().career
        if (!c || c.status !== 'in-season') return
        const lineup = bestLineup(c.players, c.lineup.formation)
        const next = { ...c, lineup, updatedAt: Date.now() }
        set({ career: { ...next, tournament: retranslateCurrentTournament(next) } })
      },

      simRound: () => {
        const c = get().career
        if (!c?.tournament || c.status !== 'in-season') return
        const t = simulateRound(c.tournament)
        const next = { ...c, tournament: t, updatedAt: Date.now() }
        set({ career: t.phase === 'finished' ? concludeYear(next, t) : next })
      },

      simYear: () => {
        const c = get().career
        if (!c?.tournament || c.status !== 'in-season') return
        const t = simulateAll(c.tournament)
        set({ career: concludeYear({ ...c, updatedAt: Date.now() }, t) })
      },

      advanceAfterReview: () => {
        const c = get().career
        if (!c || c.status !== 'year-review') return
        if (c.pendingReview?.fired) {
          set({
            career: {
              ...c,
              status: 'offers',
              pendingOffers: generateOffers(c.teams, c.reputation, c.clubId, c.id + c.year),
              pendingReview: undefined,
              updatedAt: Date.now()
            }
          })
          return
        }
        // continua no clube: evolui elenco e abre o próximo ano
        const players = c.players.map((p) => evolvePlayer(p, c.year))
        const club = c.teams.find((t) => t.id === c.clubId)!
        const next: Career = {
          ...c,
          players,
          year: c.year + 1,
          objective: generateObjective(club, c.teams.length, c.reputation, c.lastPositionByClub[c.clubId]),
          status: 'in-season',
          pendingReview: undefined,
          updatedAt: Date.now()
        }
        set({ career: { ...next, tournament: buildYearTournament(next) } })
      },

      acceptOffer: (clubId) => {
        const c = get().career
        if (!c || c.status !== 'offers') return
        const club = c.teams.find((t) => t.id === clubId)
        if (!club) return
        const players = rosterFor(club)
        const next: Career = {
          ...c,
          clubId,
          players,
          lineup: bestLineup(players, c.lineup.formation),
          year: c.year + 1,
          confidence: 55, // voto de confiança do novo emprego
          objective: generateObjective(club, c.teams.length, c.reputation, c.lastPositionByClub[clubId]),
          status: 'in-season',
          pendingOffers: undefined,
          updatedAt: Date.now()
        }
        set({ career: { ...next, tournament: buildYearTournament(next) } })
      },

      abandonCareer: () => set({ career: null })
    }),
    { name: 'simcamp-career', version: 1, migrate: (persisted) => persisted as CareerStore }
  )
)
