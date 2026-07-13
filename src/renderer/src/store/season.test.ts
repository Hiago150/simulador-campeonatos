import { describe, it, expect, beforeEach } from 'vitest'
import { useSeasons, resolveSlotTeamIds, resolveSlotArrivals } from './season'
import { createTournament, simulateAll } from '../engine/tournament'
import { baseConfig, mkTeams } from '../test/fixtures'
import type { SeasonSlot } from '../types'

// Reproduz o loop de "Simular todos os campeonatos" da SeasonHub: cria e simula
// o campeonato do slot atual, grava o resultado, repete enquanto o ano seguir 'playing'.
function simulateAllRemaining() {
  let active = useSeasons.getState().activeSeason!
  let guard = 0
  while (active.status === 'playing' && guard < 50) {
    const slot = active.slots[active.currentSlotIndex]
    const thisYear = active.years.find((y) => y.year === active.currentYear)
    const ids = resolveSlotTeamIds(slot, thisYear?.slotRankings)
    const teams = ids.length ? active.teamPool.filter((t) => ids.includes(t.id)) : active.teamPool
    const built = createTournament({ name: slot.name, sport: active.sport, format: slot.format, teams, config: slot.config })
    const played = simulateAll(built)
    useSeasons.getState().recordSlotResult(played)
    active = useSeasons.getState().activeSeason!
    guard++
  }
  return active
}

describe('recordSlotResult — guarda o campeonato completo pra revisão', () => {
  const teams = mkTeams(8)
  const mkSlot = (id: string, name: string): SeasonSlot => ({
    id,
    name,
    format: 'league',
    config: baseConfig(),
    teamIds: teams.map((t) => t.id)
  })

  beforeEach(() => {
    // some qualquer temporada de execuções anteriores (store singleton entre testes)
    for (const s of useSeasons.getState().seasons) useSeasons.getState().deleteSeason(s.id)
    useSeasons.getState().setActiveSeason(null)
  })

  it('cada slot concluído grava seu Tournament completo em years[].tournaments', () => {
    const slots = [mkSlot('liga', 'Liga'), mkSlot('copa', 'Copa')]
    useSeasons.getState().createSeason({ name: 'T', sport: 'football', period: 3, slots, teamPool: teams })

    const final = simulateAllRemaining()
    const year = final.years.find((y) => y.year === 1)!

    expect(year.tournaments?.liga).toBeDefined()
    expect(year.tournaments?.copa).toBeDefined()
    expect(year.tournaments!.liga.name).toBe('Liga')
    expect(year.tournaments!.copa.name).toBe('Copa')
    // o campeonato guardado tem partidas de verdade, não só o resumo
    expect(year.tournaments!.liga.matches.length).toBeGreaterThan(0)
    expect(year.tournaments!.liga.matches.every((m) => m.played)).toBe(true)
    // "simular todos os campeonatos" avança o ano sozinho, sem passar pela tela de torneio
    expect(final.status).toBe('year-summary')
  })

  it('o snapshot guardado é uma cópia — mutar o Tournament devolvido não afeta o que foi salvo', () => {
    const slots = [mkSlot('liga', 'Liga')]
    useSeasons.getState().createSeason({ name: 'T', sport: 'football', period: 3, slots, teamPool: teams })

    const built = createTournament({ name: 'Liga', sport: 'football', format: 'league', teams, config: baseConfig() })
    const played = simulateAll(built)
    useSeasons.getState().recordSlotResult(played)

    played.name = 'MUTADO'
    played.matches.length = 0

    const stored = useSeasons.getState().activeSeason!.years[0].tournaments!.liga
    expect(stored.name).toBe('Liga')
    expect(stored.matches.length).toBeGreaterThan(0)
  })

  it('anos diferentes guardam campeonatos diferentes para o mesmo slot', () => {
    const slots = [mkSlot('liga', 'Liga')]
    useSeasons.getState().createSeason({ name: 'T', sport: 'football', period: 2, slots, teamPool: teams })

    simulateAllRemaining() // termina o ano 1 -> status 'year-summary'
    useSeasons.getState().startNextYear()
    simulateAllRemaining() // termina o ano 2 -> 'completed'

    const final = useSeasons.getState().activeSeason!
    const y1 = final.years.find((y) => y.year === 1)!
    const y2 = final.years.find((y) => y.year === 2)!
    expect(y1.tournaments?.liga).toBeDefined()
    expect(y2.tournaments?.liga).toBeDefined()
    expect(y1.tournaments!.liga.id).not.toBe(y2.tournaments!.liga.id)
    expect(final.status).toBe('completed')
  })
})

describe('resolveSlotArrivals — posição de chegada por time', () => {
  const slot: SeasonSlot = {
    id: 'x',
    name: 'X',
    format: 'cup',
    config: {} as SeasonSlot['config'],
    teamIds: ['fixo1', 'fixo2'],
    qualifiesFrom: [
      { slotId: 'liga', count: 2 },
      { slotId: 'pre', count: 2, offset: 2 }
    ]
  }
  const rankings = { liga: ['l1', 'l2', 'l3'], pre: ['p1', 'p2', 'p3', 'p4', 'p5'] }

  it('elenco fixo não tem origem/rank; classificados carregam slot de origem e rank 1-based', () => {
    const arrivals = resolveSlotArrivals(slot, rankings)
    expect(arrivals).toEqual([
      { teamId: 'fixo1' },
      { teamId: 'fixo2' },
      { teamId: 'l1', fromSlotId: 'liga', rank: 1 },
      { teamId: 'l2', fromSlotId: 'liga', rank: 2 },
      { teamId: 'p3', fromSlotId: 'pre', rank: 3 },
      { teamId: 'p4', fromSlotId: 'pre', rank: 4 }
    ])
  })

  it('resolveSlotTeamIds continua idêntico (mesma ordem/dedup), só que via resolveSlotArrivals', () => {
    expect(resolveSlotTeamIds(slot, rankings)).toEqual(['fixo1', 'fixo2', 'l1', 'l2', 'p3', 'p4'])
    // dedup: time já fixo não duplica mesmo se também aparecer classificado
    const dupSlot = { ...slot, teamIds: ['l1'] }
    expect(resolveSlotTeamIds(dupSlot, rankings)).toEqual(['l1', 'l2', 'p3', 'p4'])
    expect(resolveSlotArrivals(dupSlot, rankings).find((a) => a.teamId === 'l1')).toEqual({ teamId: 'l1' })
  })

  it('ignora com segurança fonte ainda não concluída no ano', () => {
    expect(resolveSlotArrivals(slot, { liga: rankings.liga })).toEqual([
      { teamId: 'fixo1' },
      { teamId: 'fixo2' },
      { teamId: 'l1', fromSlotId: 'liga', rank: 1 },
      { teamId: 'l2', fromSlotId: 'liga', rank: 2 }
    ])
    expect(resolveSlotArrivals(slot, undefined)).toEqual([{ teamId: 'fixo1' }, { teamId: 'fixo2' }])
  })
})
