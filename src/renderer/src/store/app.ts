import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EsportsGame, Format, SetupBlueprint, Sport, Team, Tournament } from '../types'
import { rosterKey } from '../data/esports-rosters'
import {
  createTournament,
  currentRoundInfo,
  resetResults,
  simulateAll,
  simulateOne,
  simulateRound,
  type CreateInput
} from '../engine/tournament'
import { uid } from '../engine/rng'
import { useHistory } from './history'

export type Screen = 'home' | 'setup' | 'tournament' | 'history' | 'teams' | 'stats' | 'season'

export interface CustomTeamInput {
  name: string
  strength: number
  sport: Sport
  color: string
  logo?: string
  attack?: number
  midfield?: number
  defense?: number
}

export interface TeamOverride {
  name?: string
  strength?: number
  color?: string
  attack?: number
  midfield?: number
  defense?: number
}

interface AppState {
  screen: Screen
  current: Tournament | null
  customTeams: Team[]
  toast: string | null
  pendingFormat: Format | null
  pendingSport: Sport | null

  go: (screen: Screen) => void
  newTournament: (format?: Format, sport?: Sport) => void
  setToast: (msg: string | null) => void

  addCustomTeam: (input: CustomTeamInput) => Team
  updateCustomTeam: (id: string, patch: Partial<CustomTeamInput>) => void
  removeCustomTeam: (id: string) => void

  // edição de times pré-definidos (sobrescreve campos)
  teamOverrides: Record<string, TeamOverride>
  setTeamOverride: (id: string, patch: TeamOverride) => void
  resetTeamOverride: (id: string) => void

  // elencos de e-sports editados pelo usuário (por jogo + time)
  rosterOverrides: Record<string, string[]>
  setRosterOverride: (game: EsportsGame, teamId: string, names: string[]) => void
  resetRosterOverride: (game: EsportsGame, teamId: string) => void

  startTournament: (input: CreateInput, monteCarlo?: number) => void
  repeatTournament: (blueprint: SetupBlueprint) => void
  simMatch: (matchId: string) => void
  simRound: () => void
  simPhase: () => void
  simAll: () => void
  concludeTournament: () => void
  reset: () => void
  closeTournament: () => void

  // Monte Carlo: re-simula o torneio inteiro N vezes e conta os campeões
  // (efêmero — não entra no histórico)
  mcTarget: number
  mcDone: number
  mcTally: Record<string, number>
  mcRunOnce: () => void
  mcRunAll: () => void

  // narração: ids das partidas da última rodada simulada (para os destaques)
  lastRoundIds: string[]

  // revisão somente-leitura de um campeonato já concluído (ex.: slot de Temporada)
  reviewMode: boolean
  viewTournament: (t: Tournament) => void

  exportCurrent: () => Promise<void>
  importFromFile: () => Promise<void>
}

function shortFromName(name: string): string {
  const clean = name.trim().replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '')
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0] + (words[1][1] ?? '')).toUpperCase()
  return clean.slice(0, 3).toUpperCase() || 'CUS'
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      screen: 'home',
      current: null,
      customTeams: [],
      teamOverrides: {},
      rosterOverrides: {},
      toast: null,
      pendingFormat: null,
      pendingSport: null,
      mcTarget: 0,
      mcDone: 0,
      mcTally: {},
      lastRoundIds: [],
      reviewMode: false,

      go: (screen) => set({ screen }),
      newTournament: (format, sport) =>
        set({ screen: 'setup', pendingFormat: format ?? null, pendingSport: sport ?? null }),
      setToast: (msg) => {
        set({ toast: msg })
        if (msg) setTimeout(() => set((s) => (s.toast === msg ? { toast: null } : {})), 2600)
      },

      addCustomTeam: (input) => {
        const team: Team = {
          id: uid('custom'),
          name: input.name.trim() || 'Novo time',
          shortName: shortFromName(input.name),
          strength: Math.round(input.strength),
          attack: input.attack != null ? Math.round(input.attack) : undefined,
          midfield: input.midfield != null ? Math.round(input.midfield) : undefined,
          defense: input.defense != null ? Math.round(input.defense) : undefined,
          category: 'custom',
          sport: input.sport,
          color: input.color,
          logo: input.logo
        }
        set({ customTeams: [...get().customTeams, team] })
        return team
      },

      updateCustomTeam: (id, patch) =>
        set({
          customTeams: get().customTeams.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  name: patch.name?.trim() ? patch.name.trim() : t.name,
                  shortName: patch.name ? shortFromName(patch.name) : t.shortName,
                  strength: patch.strength != null ? Math.round(patch.strength) : t.strength,
                  attack: patch.attack != null ? Math.round(patch.attack) : t.attack,
                  midfield: patch.midfield != null ? Math.round(patch.midfield) : t.midfield,
                  defense: patch.defense != null ? Math.round(patch.defense) : t.defense
                }
              : t
          )
        }),

      removeCustomTeam: (id) =>
        set({ customTeams: get().customTeams.filter((t) => t.id !== id) }),

      setTeamOverride: (id, patch) =>
        set({ teamOverrides: { ...get().teamOverrides, [id]: { ...get().teamOverrides[id], ...patch } } }),

      resetTeamOverride: (id) => {
        const next = { ...get().teamOverrides }
        delete next[id]
        set({ teamOverrides: next })
      },

      setRosterOverride: (game, teamId, names) =>
        set({
          rosterOverrides: {
            ...get().rosterOverrides,
            [rosterKey(game, teamId)]: names.map((n) => n.trim()).slice(0, 5)
          }
        }),

      resetRosterOverride: (game, teamId) => {
        const next = { ...get().rosterOverrides }
        delete next[rosterKey(game, teamId)]
        set({ rosterOverrides: next })
      },

      startTournament: (input, monteCarlo) => {
        const t = createTournament({ ...input, rosterOverrides: get().rosterOverrides })
        set({
          current: t,
          screen: 'tournament',
          mcTarget: monteCarlo && monteCarlo > 1 ? monteCarlo : 0,
          mcDone: 0,
          mcTally: {},
          lastRoundIds: []
        })
      },

      // repete um campeonato do histórico gerando um novo (mesmos times/config,
      // id novo — não substitui o original)
      repeatTournament: (b) => {
        const t = createTournament({
          name: b.name,
          sport: b.sport,
          format: b.format,
          teams: b.teams,
          config: b.config,
          rosterOverrides: get().rosterOverrides
        })
        // zera qualquer sessão de Monte Carlo/revisão herdada do campeonato anterior
        set({
          current: t,
          screen: 'tournament',
          lastRoundIds: [],
          mcTarget: 0,
          mcDone: 0,
          mcTally: {},
          reviewMode: false
        })
        get().setToast('Novo campeonato criado a partir do histórico')
      },

      simMatch: (matchId) => {
        const cur = get().current
        if (!cur) return
        try {
          set({ current: simulateOne(cur, matchId), lastRoundIds: [matchId] })
        } catch (err) {
          console.error('Falha ao simular partida', err)
          get().setToast('Não foi possível simular essa partida')
        }
      },

      simRound: () => {
        const cur = get().current
        if (!cur) return
        try {
          const ids = currentRoundInfo(cur).matchIds
          set({ current: simulateRound(cur), lastRoundIds: ids })
        } catch (err) {
          console.error('Falha ao simular rodada', err)
          get().setToast('Não foi possível simular essa rodada')
        }
      },

      // simula a fase inteira atual (ex.: toda a fase de grupos de uma vez)
      simPhase: () => {
        const cur = get().current
        if (!cur) return
        try {
          const startPhase = cur.phase
          let nt = cur
          let guard = 0
          while (guard < 500) {
            const info = currentRoundInfo(nt)
            if (info.matchIds.length === 0) break
            nt = simulateRound(nt)
            if (nt.phase !== startPhase) break
            guard++
          }
          set({ current: nt, lastRoundIds: [] })
        } catch (err) {
          console.error('Falha ao simular fase', err)
          get().setToast('Não foi possível simular essa fase')
        }
      },

      simAll: () => {
        const cur = get().current
        if (!cur) return
        try {
          set({ current: simulateAll(cur), lastRoundIds: [] })
        } catch (err) {
          console.error('Falha ao simular tudo', err)
          get().setToast('Não foi possível simular o campeonato inteiro')
        }
      },

      // só quando não resta nada a simular: registra no histórico
      concludeTournament: () => {
        const cur = get().current
        if (!cur || cur.phase !== 'finished') return
        // campeonato de Temporada nunca entra no histórico global — o resultado
        // já foi (ou será) registrado na própria temporada via recordSlotResult
        if (cur.fromSeason) return
        useHistory.getState().commitTournament(cur)
        get().setToast('Campeonato concluído e salvo no histórico')
      },

      reset: () => {
        const cur = get().current
        if (!cur) return
        // refazer também zera a sessão de Monte Carlo (recomeça a contagem)
        set({ current: resetResults(cur), mcDone: 0, mcTally: {}, lastRoundIds: [] })
      },

      // ---- Monte Carlo ----
      mcRunOnce: () => {
        const cur = get().current
        const { mcTarget, mcDone, mcTally } = get()
        if (!cur || mcTarget <= 0 || mcDone >= mcTarget) return
        const fresh = createTournament({
          name: cur.name,
          sport: cur.sport,
          format: cur.format,
          teams: cur.teams,
          config: cur.config,
          rosterOverrides: get().rosterOverrides
        })
        const done = simulateAll(fresh)
        const tally = { ...mcTally }
        if (done.champion) tally[done.champion] = (tally[done.champion] ?? 0) + 1
        set({ current: done, mcTally: tally, mcDone: mcDone + 1 })
      },

      // roda o restante das simulações UMA por tick (setTimeout) em vez de um
      // loop síncrono — 100× num campeonato grande travava a interface; agora
      // o contador anda ao vivo e um erro no meio para com segurança
      mcRunAll: () => {
        const step = () => {
          const { current, mcTarget, mcDone } = get()
          if (!current || mcTarget <= 0 || mcDone >= mcTarget) return
          try {
            get().mcRunOnce()
          } catch (err) {
            console.error('Falha numa simulação do Monte Carlo', err)
            get().setToast('Monte Carlo interrompido por um erro — resultados parciais mantidos')
            return
          }
          if (get().mcDone < get().mcTarget) setTimeout(step, 0)
        }
        step()
      },

      closeTournament: () =>
        set({ current: null, screen: 'home', mcTarget: 0, mcDone: 0, mcTally: {}, lastRoundIds: [], reviewMode: false }),

      viewTournament: (t) => {
        // revisão somente-leitura (ex.: campeonato já concluído de um ano da Temporada) —
        // clona pra não expor o snapshot guardado a mutações acidentais
        const clone: Tournament = JSON.parse(JSON.stringify(t))
        set({ current: clone, screen: 'tournament', reviewMode: true, mcTarget: 0, mcDone: 0, mcTally: {}, lastRoundIds: [] })
      },

      exportCurrent: async () => {
        const cur = get().current
        if (!cur) return
        if (!window.desktop) {
          get().setToast('Exportação disponível apenas no app desktop')
          return
        }
        const json = JSON.stringify(cur, null, 2)
        const safe = cur.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'campeonato'
        const res = await window.desktop.saveTournament(json, `${safe}.json`)
        if (res.ok) get().setToast('Campeonato salvo com sucesso')
      },

      importFromFile: async () => {
        if (!window.desktop) {
          get().setToast('Importação disponível apenas no app desktop')
          return
        }
        const res = await window.desktop.loadTournament()
        if (!res.ok) return
        try {
          const t = JSON.parse(res.data) as Tournament
          if (!t.id || !t.teams || !t.matches) throw new Error('Arquivo inválido')
          set({ current: t, screen: 'tournament', mcTarget: 0, mcDone: 0, mcTally: {}, lastRoundIds: [] })
          get().setToast('Campeonato carregado')
        } catch {
          get().setToast('Não foi possível ler o arquivo')
        }
      }
    }),
    {
      name: 'simcamp-app',
      version: 1,
      // baseline de versionamento — migrações futuras de schema entram aqui
      migrate: (persisted) => persisted as AppState,
      partialize: (s) => ({
        customTeams: s.customTeams,
        current: s.current,
        teamOverrides: s.teamOverrides,
        rosterOverrides: s.rosterOverrides,
        mcTarget: s.mcTarget,
        mcDone: s.mcDone,
        mcTally: s.mcTally
      })
    }
  )
)
