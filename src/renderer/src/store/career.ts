// Store do Modo Carreira — 5º store do app, ISOLADO como o da Temporada:
// nada aqui escreve em history/season/library, e o torneio da liga da carreira
// vive DENTRO da carreira (nunca em useApp.current). Persist versionado.
//
// Fase 2: a liga inteira fica "viva" — TODOS os clubes têm elenco (o do usuário
// em `players`, os outros em `rostersByClub`) e a força de cada um deriva do
// elenco. Mercado com janelas, negociação e trava financeira dura.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Team, Tournament, TournamentConfig } from '../types'
import type { Career, CareerLineup, CareerPlayer, FormationId, TransferRecord, YearReview } from '../types-career'
import { createTournament, simulateAll, simulateRound } from '../engine/tournament'
import { finalRanking } from '../engine/ranking'
import { generateSquad } from '../engine/names'
import { clamp, uid } from '../engine/rng'
import {
  applyConfidence,
  applyLineupToTeam,
  bestLineup,
  clubTier,
  deriveClubStrength,
  evaluateYear,
  evolvePlayer,
  generateCareerRoster,
  generateObjective,
  generateOffers,
  isFired,
  lineupSectors,
  negotiateFee,
  seasonRevenue,
  startingBudget,
  wageBill,
  wageCapFor,
  verdictText
} from '../engine/career'
import { useApp } from './app'

const MIN_SQUAD = 16 // pisos p/ manter todo mundo escalável
const MIN_SELL = 14 // um clube não vende abaixo disso

interface StartInput {
  managerName: string
  universeLabel: string
  teams: Team[]
  clubId: string
}

export interface BuyResult {
  ok: boolean
  reason?: string
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
  // ── Fase 2: mercado ──
  closeWindow: () => void
  buyPlayer: (playerId: string, fee: number) => BuyResult
  sellPlayer: (playerId: string) => BuyResult
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

/**
 * Elenco de Carreira de um clube (nomes reais/overrides → OVR+finanças seeded).
 * Elenco curto (fonte veio com poucos nomes) é completado proceduralmente até
 * dar pra escalar 11 + banco.
 */
function rosterFor(club: Team): CareerPlayer[] {
  const base = generateSquad(club, undefined, undefined, useApp.getState().footballRosterOverrides)
  let squad = base
  if (base.length < MIN_SQUAD) {
    const used = new Set(base.map((p) => p.name.toLowerCase()))
    const fill = generateSquad({ ...club, id: `${club.id}-fill`, squad: undefined }).filter(
      (p) => !used.has(p.name.toLowerCase())
    )
    squad = [...base, ...fill].slice(0, Math.max(MIN_SQUAD, base.length))
  }
  return generateCareerRoster(club, squad)
}

/** materializa o elenco de TODOS os clubes menos o do usuário */
function rostersForOthers(teams: Team[], userClubId: string): Record<string, CareerPlayer[]> {
  const out: Record<string, CareerPlayer[]> = {}
  for (const t of teams) if (t.id !== userClubId) out[t.id] = rosterFor(t)
  return out
}

/** sectores/força de um clube: usuário usa a escalação escolhida; os outros, o melhor XI */
function clubSectors(c: Career, clubId: string) {
  if (clubId === c.clubId) return lineupSectors(c.players, c.lineup)
  const roster = c.rostersByClub[clubId]
  return roster ? deriveClubStrength(roster) : null
}

/** monta a liga do ano derivando a força de CADA clube do elenco dele */
function buildYearTournament(c: Career): Tournament {
  const teams = c.teams.map((t) => {
    const s = clubSectors(c, t.id)
    return s ? applyLineupToTeam(t, s) : t
  })
  return createTournament({
    name: `${c.universeLabel} — Ano ${c.year}`,
    sport: 'football',
    format: 'league',
    teams,
    config: LEAGUE_CONFIG,
    footballRosterOverrides: useApp.getState().footballRosterOverrides
  })
}

/** re-traduz a força de todos os clubes no torneio em andamento (partidas
 *  futuras usam a força nova; as já jogadas mantêm o placar). */
function retranslate(c: Career): Tournament | null {
  if (!c.tournament) return null
  return {
    ...c.tournament,
    teams: c.tournament.teams.map((t) => {
      const s = clubSectors(c, t.id)
      return s ? applyLineupToTeam(t, s) : t
    })
  }
}

/** true se o jogador é um dos 11 melhores do elenco (para preço/vontade própria) */
function isStarterIn(roster: CareerPlayer[], playerId: string): boolean {
  const top = [...roster].sort((a, b) => b.overall - a.overall).slice(0, 11)
  return top.some((p) => p.id === playerId)
}

/** fecha o ano: avalia objetivo, atualiza confiança/reputação, receita, review */
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

  // receita do ano entra no caixa (Fase 2)
  const revenue = seasonRevenue(clubTier(club.strength), position, total, champion)

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
    budget: Math.round((c.budget + revenue) * 10) / 10,
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
    pendingReview: { ...review, revenue },
    updatedAt: Date.now()
  }
}

/** evolui todos os elencos na virada do ano + top-up de quem ficou curto */
function turnoverRosters(c: Career, year: number): {
  players: CareerPlayer[]
  rostersByClub: Record<string, CareerPlayer[]>
} {
  const evolveAll = (roster: CareerPlayer[]) => roster.map((p) => evolvePlayer(p, year))
  const topUp = (roster: CareerPlayer[], club: Team | undefined): CareerPlayer[] => {
    if (!club || roster.length >= MIN_SQUAD) return roster
    const have = new Set(roster.map((p) => p.id))
    const fresh = rosterFor(club).filter((p) => !have.has(p.id))
    return [...roster, ...fresh].slice(0, Math.max(MIN_SQUAD, roster.length))
  }
  const players = topUp(evolveAll(c.players), c.teams.find((t) => t.id === c.clubId))
  const rostersByClub: Record<string, CareerPlayer[]> = {}
  for (const [id, roster] of Object.entries(c.rostersByClub)) {
    rostersByClub[id] = topUp(evolveAll(roster), c.teams.find((t) => t.id === id))
  }
  return { players, rostersByClub }
}

/** abre a pré-temporada e monta a liga do ano (força já reflete os elencos) */
function openSeason(c: Career): Career {
  const withTournament = { ...c, tournament: buildYearTournament(c) }
  return { ...withTournament, window: 'pre-season', midSeasonOpened: false }
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
          rostersByClub: rostersForOthers(pool, clubId),
          lineup,
          year: 1,
          budget: startingBudget(clubTier(club.strength)),
          wageBudget: wageCapFor(players),
          window: null,
          midSeasonOpened: false,
          marketLog: [],
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
        set({ career: openSeason(base) })
      },

      setFormation: (formation) => {
        const c = get().career
        if (!c || c.status !== 'in-season') return
        const lineup = bestLineup(c.players, formation)
        const next = { ...c, lineup, updatedAt: Date.now() }
        set({ career: { ...next, tournament: retranslate(next) } })
      },

      setStarter: (slotIndex, playerId) => {
        const c = get().career
        if (!c || c.status !== 'in-season') return
        if (slotIndex < 0 || slotIndex >= c.lineup.starterIds.length) return
        if (c.lineup.starterIds.includes(playerId)) return
        const starterIds = [...c.lineup.starterIds]
        starterIds[slotIndex] = playerId
        const lineup: CareerLineup = { ...c.lineup, starterIds }
        const next = { ...c, lineup, updatedAt: Date.now() }
        set({ career: { ...next, tournament: retranslate(next) } })
      },

      autoLineup: () => {
        const c = get().career
        if (!c || c.status !== 'in-season') return
        const lineup = bestLineup(c.players, c.lineup.formation)
        const next = { ...c, lineup, updatedAt: Date.now() }
        set({ career: { ...next, tournament: retranslate(next) } })
      },

      closeWindow: () => {
        const c = get().career
        if (!c || !c.window) return
        set({ career: { ...c, window: null, updatedAt: Date.now() } })
      },

      simRound: () => {
        const c = get().career
        if (!c?.tournament || c.status !== 'in-season' || c.window) return // janela aberta trava a rodada
        const t = simulateRound(c.tournament)
        if (t.phase === 'finished') {
          set({ career: concludeYear({ ...c, tournament: t }, t) })
          return
        }
        // pausa da janela intermediária ao cruzar a metade das partidas (1× no ano)
        const played = t.matches.filter((m) => m.played).length
        const openMid = !c.midSeasonOpened && played >= Math.floor(t.matches.length / 2)
        set({
          career: {
            ...c,
            tournament: t,
            window: openMid ? 'mid-season' : c.window,
            midSeasonOpened: c.midSeasonOpened || openMid,
            updatedAt: Date.now()
          }
        })
      },

      simYear: () => {
        const c = get().career
        if (!c?.tournament || c.status !== 'in-season' || c.window) return
        // simular o ano inteiro pula a janela intermediária (fast-forward)
        const t = simulateAll(c.tournament)
        set({ career: concludeYear({ ...c, midSeasonOpened: true }, t) })
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
        const { players, rostersByClub } = turnoverRosters(c, c.year)
        const club = c.teams.find((t) => t.id === c.clubId)!
        const next: Career = {
          ...c,
          players,
          rostersByClub,
          year: c.year + 1,
          objective: generateObjective(club, c.teams.length, c.reputation, c.lastPositionByClub[c.clubId]),
          status: 'in-season',
          pendingReview: undefined,
          updatedAt: Date.now()
        }
        set({ career: openSeason(next) })
      },

      acceptOffer: (clubId) => {
        const c = get().career
        if (!c || c.status !== 'offers') return
        const club = c.teams.find((t) => t.id === clubId)
        if (!club) return
        // vira "livre": evolui a liga toda como num turnover normal, depois
        // assume o novo clube (o elenco dele sai de rostersByClub pro comando)
        const { players: _oldPlayers, rostersByClub: evolved } = turnoverRosters(c, c.year)
        const newPlayers = evolved[clubId] ?? rosterFor(club)
        // o antigo clube do usuário volta pra liga com elenco próprio
        const rostersByClub = { ...evolved }
        delete rostersByClub[clubId]
        rostersByClub[c.clubId] = _oldPlayers
        const next: Career = {
          ...c,
          clubId,
          players: newPlayers,
          rostersByClub,
          lineup: bestLineup(newPlayers, c.lineup.formation),
          year: c.year + 1,
          budget: startingBudget(clubTier(club.strength)),
          wageBudget: wageCapFor(newPlayers),
          confidence: 55,
          objective: generateObjective(club, c.teams.length, c.reputation, c.lastPositionByClub[clubId]),
          status: 'in-season',
          pendingOffers: undefined,
          updatedAt: Date.now()
        }
        set({ career: openSeason(next) })
      },

      buyPlayer: (playerId, fee) => {
        const c = get().career
        if (!c || !c.window) return { ok: false, reason: 'A janela de transferências está fechada.' }
        // acha o vendedor + jogador
        let sellerId: string | null = null
        let player: CareerPlayer | null = null
        for (const [cid, roster] of Object.entries(c.rostersByClub)) {
          const p = roster.find((x) => x.id === playerId)
          if (p) { sellerId = cid; player = p; break }
        }
        if (!sellerId || !player) return { ok: false, reason: 'Jogador indisponível.' }
        const seller = c.teams.find((t) => t.id === sellerId)!
        const buyer = c.teams.find((t) => t.id === c.clubId)!

        if (fee > c.budget) return { ok: false, reason: 'Caixa insuficiente pra essa proposta.' }
        if (wageBill(c.players) + player.salary > c.wageBudget)
          return { ok: false, reason: 'Sem espaço na folha salarial (teto estourado).' }
        if (c.rostersByClub[sellerId].length <= MIN_SELL)
          return { ok: false, reason: 'O clube não quer vender e ficar com elenco curto demais.' }

        const isStarter = isStarterIn(c.rostersByClub[sellerId], playerId)
        const neg = negotiateFee(player.value, isStarter, player.contractYears, clubTier(seller.strength), clubTier(buyer.strength), fee)
        if (neg.status === 'refused') return { ok: false, reason: neg.reason }
        if (neg.status === 'counter') return { ok: false, reason: `${neg.reason} Pede ${neg.counter}M.` }

        // fecha o negócio: sai do vendedor, entra no usuário
        const sellerRoster = c.rostersByClub[sellerId].filter((p) => p.id !== playerId)
        const players = [...c.players, player]
        const record: TransferRecord = {
          year: c.year, window: c.window,
          playerId: player.id, playerName: player.name,
          fromClubId: sellerId, fromClubName: seller.name,
          toClubId: c.clubId, toClubName: buyer.name,
          fee
        }
        const next: Career = {
          ...c,
          players,
          rostersByClub: { ...c.rostersByClub, [sellerId]: sellerRoster },
          budget: Math.round((c.budget - fee) * 10) / 10,
          lineup: bestLineup(players, c.lineup.formation),
          marketLog: [record, ...c.marketLog],
          updatedAt: Date.now()
        }
        set({ career: { ...next, tournament: retranslate(next) } })
        return { ok: true }
      },

      sellPlayer: (playerId) => {
        const c = get().career
        if (!c || !c.window) return { ok: false, reason: 'A janela de transferências está fechada.' }
        const player = c.players.find((p) => p.id === playerId)
        if (!player) return { ok: false, reason: 'Jogador não está no seu elenco.' }
        if (c.players.length <= MIN_SELL) return { ok: false, reason: 'Elenco ficaria curto demais — não dá pra vender agora.' }

        // comprador: um clube da liga que tope o preço (o mais forte que puder pagar,
        // respeitando a vontade própria — clube menor não leva titular de clube maior)
        const fee = player.value // venda instantânea pelo valor de mercado (provisório)
        const isStarter = isStarterIn(c.players, playerId)
        const buyerTier = clubTier(c.teams.find((t) => t.id === c.clubId)!.strength)
        const buyer = c.teams
          .filter((t) => t.id !== c.clubId)
          .filter((t) => !(isStarter && clubTierRank(clubTier(t.strength)) < clubTierRank(buyerTier)))
          .sort((a, b) => b.strength - a.strength)[0]
        if (!buyer) return { ok: false, reason: 'Nenhum clube interessado no momento.' }

        const players = c.players.filter((p) => p.id !== playerId)
        const buyerRoster = [...(c.rostersByClub[buyer.id] ?? []), player]
        const record: TransferRecord = {
          year: c.year, window: c.window,
          playerId: player.id, playerName: player.name,
          fromClubId: c.clubId, fromClubName: c.teams.find((t) => t.id === c.clubId)!.name,
          toClubId: buyer.id, toClubName: buyer.name,
          fee
        }
        const next: Career = {
          ...c,
          players,
          rostersByClub: { ...c.rostersByClub, [buyer.id]: buyerRoster },
          budget: Math.round((c.budget + fee) * 10) / 10,
          lineup: bestLineup(players, c.lineup.formation),
          marketLog: [record, ...c.marketLog],
          updatedAt: Date.now()
        }
        set({ career: { ...next, tournament: retranslate(next) } })
        return { ok: true }
      },

      abandonCareer: () => set({ career: null })
    }),
    { name: 'simcamp-career', version: 2, migrate: (persisted) => persisted as CareerStore }
  )
)

// aid de verificação em DEV (nunca no build de produção)
if (import.meta.env.DEV) (window as unknown as { __career?: typeof useCareer }).__career = useCareer

const TIER_RANK_LOCAL = { pequeno: 0, medio: 1, grande: 2, gigante: 3 } as const
function clubTierRank(t: keyof typeof TIER_RANK_LOCAL): number {
  return TIER_RANK_LOCAL[t]
}
