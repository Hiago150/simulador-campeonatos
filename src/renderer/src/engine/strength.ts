// Setores de força (Ataque / Meio / Defesa) — futebol
import type { Team } from '../types'
import { clamp, hashString, mulberry32 } from './rng'

export interface Sectors {
  attack: number
  midfield: number
  defense: number
}

/**
 * Setores de um time. Usa valores explícitos quando existirem; caso contrário,
 * deriva da força geral de forma determinística (mesmo time => mesmos setores),
 * dando "caráter" sem precisar cadastrar 100+ times à mão.
 */
export function sectorsOf(team: Team): Sectors {
  if (team.attack != null && team.midfield != null && team.defense != null) {
    return { attack: team.attack, midfield: team.midfield, defense: team.defense }
  }
  const base = team.strength
  const rng = mulberry32(hashString(team.id + '|sect'))
  const jitter = (): number => Math.round((rng() - 0.5) * 16) // ±8
  return {
    attack: team.attack ?? clamp(base + jitter(), 1, 99),
    midfield: team.midfield ?? clamp(base + jitter(), 1, 99),
    defense: team.defense ?? clamp(base + jitter(), 1, 99)
  }
}

export function overallFromSectors(s: Sectors): number {
  return Math.round((s.attack + s.midfield + s.defense) / 3)
}
