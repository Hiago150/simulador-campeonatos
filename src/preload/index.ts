import { contextBridge, ipcRenderer } from 'electron'

const api = {
  /** Abre diálogo nativo "Salvar como" e grava o JSON do campeonato. */
  saveTournament: (json: string, suggestedName?: string) =>
    ipcRenderer.invoke('tournament:save', { json, suggestedName }) as Promise<
      { ok: true; path: string } | { ok: false; canceled: true }
    >,
  /** Abre diálogo nativo "Abrir" e devolve o conteúdo do arquivo escolhido. */
  loadTournament: () =>
    ipcRenderer.invoke('tournament:load') as Promise<
      { ok: true; data: string; path: string } | { ok: false; canceled: true }
    >
}

contextBridge.exposeInMainWorld('desktop', api)

export type DesktopApi = typeof api
