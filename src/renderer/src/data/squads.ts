// Elencos reais (nomes + posição) por time, empacotados offline.
// Preenchido por scripts/fetch-squads.mjs (fonte: TheSportsDB).
import data from './squads.json'

export interface SquadEntry {
  name: string
  pos: 'GK' | 'DEF' | 'MID' | 'FWD'
}

const squads = data as Record<string, SquadEntry[]>

export function getSquadData(teamId: string): SquadEntry[] | undefined {
  const s = squads[teamId]
  return s && s.length ? s : undefined
}
