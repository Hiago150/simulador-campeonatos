import { describe, it, expect } from 'vitest'
import { buildRegionPotGroups } from './regionDraw'
import type { Team, TournamentConfig } from '../types'
import { baseConfig } from '../test/fixtures'

const REGIONS = ['americas', 'emea', 'pacific', 'china'] as const

function regionTeams(perRegion: number): Team[] {
  const out: Team[] = []
  for (const region of REGIONS) {
    for (let i = 0; i < perRegion; i++) {
      out.push({
        id: `${region}-${i}`,
        name: `${region} ${i}`,
        shortName: region.slice(0, 3).toUpperCase(),
        strength: 70 + i,
        category: 'club',
        sport: 'esports',
        color: '#111',
        region
      })
    }
  }
  return out
}

function arrivalsFor(teams: Team[]): Record<string, { fromSlotId?: string; rank?: number }> {
  const out: Record<string, { fromSlotId?: string; rank?: number }> = {}
  for (const t of teams) {
    const rank = parseInt(t.id.split('-')[1], 10) + 1
    out[t.id] = { fromSlotId: `liga-${t.region}`, rank }
  }
  return out
}

describe('buildRegionPotGroups — potes por região (Valorant, Temporada)', () => {
  const config: TournamentConfig = { ...baseConfig(), groupCount: 4, qualifiersPerGroup: 2 }

  it('nenhum grupo recebe 2 times da mesma região (4 regiões × 4, 4 grupos)', () => {
    const teams = regionTeams(4)
    const arrivals = arrivalsFor(teams)
    const result = buildRegionPotGroups(teams, config, arrivals)
    expect(result).toBeTruthy()
    for (const g of result!.groups) {
      const regions = g.teamIds.map((id) => teams.find((t) => t.id === id)!.region)
      expect(new Set(regions).size).toBe(regions.length)
    }
    // cada grupo tem exatamente 1 time de cada região (16 times, 4 grupos, 4 regiões)
    for (const g of result!.groups) expect(g.teamIds).toHaveLength(4)
  })

  it('pote 1 (melhores colocados de cada região) fica espalhado, um por grupo', () => {
    const teams = regionTeams(4)
    const arrivals = arrivalsFor(teams) // rank 1 = "<region>-0" de cada região
    const result = buildRegionPotGroups(teams, config, arrivals)!
    const seed1Ids = teams.filter((t) => t.id.endsWith('-0')).map((t) => t.id)
    const groupsWithSeed1 = result.groups.filter((g) => g.teamIds.some((id) => seed1Ids.includes(id)))
    expect(groupsWithSeed1).toHaveLength(4) // um seed 1 em cada grupo, nenhum grupo com 2
  })

  it('seedLabels traz região + posição de chegada', () => {
    const teams = regionTeams(4)
    const arrivals = arrivalsFor(teams)
    const result = buildRegionPotGroups(teams, config, arrivals)!
    expect(result.seedLabels['americas-0']).toBe('Americas #1')
    expect(result.seedLabels['china-3']).toBe('China #4')
  })

  it('pote maior que o nº de grupos (VCT Masters: 4 regiões, 2 grupos) ainda evita repetição de região', () => {
    // Masters real: top-2 de cada região = 8 times, 2 grupos de 4 — o pote 1
    // (4 times, um por região) não cabe "1 por grupo" com só 2 grupos; precisa
    // permitir até ceil(4/2)=2 do mesmo pote por grupo, mas nunca 2 da mesma região
    const teams = regionTeams(2)
    const arrivals = arrivalsFor(teams)
    const mastersConfig: TournamentConfig = { ...baseConfig(), groupCount: 2, qualifiersPerGroup: 2 }
    const result = buildRegionPotGroups(teams, mastersConfig, arrivals)
    expect(result).toBeTruthy()
    expect(result!.groups).toHaveLength(2)
    for (const g of result!.groups) {
      expect(g.teamIds).toHaveLength(4)
      const regions = g.teamIds.map((id) => teams.find((t) => t.id === id)!.region)
      expect(new Set(regions).size).toBe(regions.length)
    }
  })

  it('retorna null (fallback) quando algum time não tem region', () => {
    const teams = regionTeams(4)
    teams[0] = { ...teams[0], region: undefined }
    const result = buildRegionPotGroups(teams, config, arrivalsFor(teams))
    expect(result).toBeNull()
  })

  it('retorna null com segurança em cenário combinatoriamente inviável, sem travar', () => {
    // 5 times da MESMA região pra só 4 grupos — pelo menos 2 caem juntos, sempre
    const teams: Team[] = Array.from({ length: 5 }, (_, i) => ({
      id: `same-${i}`,
      name: `Same ${i}`,
      shortName: 'SAM',
      strength: 70,
      category: 'club',
      sport: 'esports',
      color: '#111',
      region: 'americas' as const
    }))
    const result = buildRegionPotGroups(teams, config, {})
    expect(result).toBeNull()
  })
})
