import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tournament } from '../types'

export interface SavedTournament {
  id: string
  savedAt: number
  tournament: Tournament
}

interface LibraryState {
  saved: SavedTournament[]
  /** salva (ou atualiza, mesmo id) um campeonato na biblioteca local */
  saveTournament: (t: Tournament) => void
  removeSaved: (id: string) => void
  renameSaved: (id: string, name: string) => void
  clear: () => void
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      saved: [],

      saveTournament: (t) => {
        const entry: SavedTournament = { id: t.id, savedAt: Date.now(), tournament: t }
        set({ saved: [entry, ...get().saved.filter((s) => s.id !== t.id)] })
      },

      removeSaved: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),

      renameSaved: (id, name) =>
        set({
          saved: get().saved.map((s) =>
            s.id === id ? { ...s, tournament: { ...s.tournament, name: name.trim() || s.tournament.name } } : s
          )
        }),

      clear: () => set({ saved: [] })
    }),
    { name: 'simcamp-library' }
  )
)
