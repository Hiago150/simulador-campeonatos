import { describe, it, expect } from 'vitest'
import { SEASON_PRESETS, type SeasonPreset } from './season-presets'
import { PRESET_TEAMS } from './teams'
import { resolveSlotTeamIds } from '../store/season'
import type { SeasonSlot } from '../types'

// Reproduz o mapeamento do applyPreset do wizard: índice do preset → id real
function buildSlots(p: SeasonPreset): SeasonSlot[] {
  const ids = p.slots.map((_, i) => `slot-${i}`)
  return p.slots.map((sl, i) => ({
    id: ids[i],
    name: sl.name,
    format: sl.format,
    teamIds: sl.teamIds.length > 0 ? sl.teamIds : undefined,
    qualifiesFrom: sl.qualifiesFrom?.map((q) => ({
      slotId: ids[q.slot],
      count: q.count,
      offset: q.offset
    })),
    config: { homeAndAway: false, bestOf: 3, groupCount: 4, qualifiersPerGroup: 2, swissRounds: 5, ...sl.config }
  })) as SeasonSlot[]
}

const preset = (id: string) => {
  const p = SEASON_PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`preset ${id} não existe`)
  return p
}

describe('resolveSlotTeamIds — vagas fixas + dinâmicas', () => {
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

  it('soma fixos + faixas das fontes (offset 0-based)', () => {
    expect(resolveSlotTeamIds(slot, rankings)).toEqual(['fixo1', 'fixo2', 'l1', 'l2', 'p3', 'p4'])
  })

  it('deduplica quando um classificado já é fixo', () => {
    const r = resolveSlotTeamIds({ ...slot, teamIds: ['l1'] }, rankings)
    expect(r).toEqual(['l1', 'l2', 'p3', 'p4'])
  })

  it('ignora fonte ainda não concluída no ano', () => {
    expect(resolveSlotTeamIds(slot, { liga: rankings.liga })).toEqual(['fixo1', 'fixo2', 'l1', 'l2'])
    expect(resolveSlotTeamIds(slot, undefined)).toEqual(['fixo1', 'fixo2'])
  })
})

describe('preset Circuito Sul-Americano — pirâmide completa', () => {
  const p = preset('sea-sul-americana')
  const slots = buildSlots(p)
  // classificação simulada: cada liga termina na ordem do próprio teamIds
  const rankings: Record<string, string[]> = {}
  for (const s of slots) if (s.teamIds) rankings[s.id] = [...s.teamIds]

  it('todos os ids dos slots existem na base de times', () => {
    const known = new Set(PRESET_TEAMS.map((t) => t.id))
    for (const sl of p.slots) for (const id of sl.teamIds) expect(known.has(id), id).toBe(true)
  })

  it('tem as 10 ligas nacionais antes da fase continental', () => {
    const leagues = slots.slice(0, 10)
    expect(leagues.every((s) => s.format === 'league' && (s.teamIds?.length ?? 0) >= 12)).toBe(true)
    const allIds = leagues.flatMap((s) => s.teamIds!)
    expect(new Set(allIds).size).toBe(allIds.length) // nenhum clube em duas ligas
  })

  it('Pré-Libertadores: 16 clubes = 3º e 4º das 8 ligas menores', () => {
    const pre = slots[10]
    const ids = resolveSlotTeamIds(pre, rankings)
    expect(ids).toHaveLength(16)
    for (const s of slots.slice(2, 10)) {
      expect(ids).toContain(s.teamIds![2])
      expect(ids).toContain(s.teamIds![3])
      expect(ids).not.toContain(s.teamIds![0]) // topo vai direto à Libertadores
    }
  })

  it('Libertadores: 32 = G-6 BR + top 6 ARG + top 2 das demais + 4 da Pré', () => {
    const pre = slots[10]
    rankings[pre.id] = resolveSlotTeamIds(pre, rankings) // pré termina nessa ordem
    const lib = slots[11]
    const ids = resolveSlotTeamIds(lib, rankings)
    expect(ids).toHaveLength(32)
    expect(ids).toContain(slots[0].teamIds![5]) // 6º do Brasileirão entra
    expect(ids).not.toContain(slots[0].teamIds![6]) // 7º não
    expect(ids).toContain(slots[1].teamIds![5]) // 6º da Argentina entra
    expect(lib.config.groupCount).toBe(8) // 8 grupos de 4
  })

  it('Intercontinental: campeão da Libertadores × campeão da Champions', () => {
    rankings['slot-11'] = ['campeao-lib', 'vice-lib']
    rankings['slot-12'] = ['campeao-ucl', 'vice-ucl']
    const ids = resolveSlotTeamIds(slots[13], rankings)
    expect(ids).toEqual(['campeao-lib', 'campeao-ucl'])
  })
})

describe('preset Eliminatórias & Copa América', () => {
  const p = preset('sea-eliminatorias')
  const slots = buildSlots(p)

  it('Copa América = 2 convidadas fixas + 6 melhores das Eliminatórias', () => {
    const rankings = { 'slot-0': [...slots[0].teamIds!] }
    const ids = resolveSlotTeamIds(slots[1], rankings)
    expect(ids).toHaveLength(8)
    expect(ids).toContain('mexico')
    expect(ids).toContain('eua')
    expect(ids).toContain(slots[0].teamIds![5])
    expect(ids).not.toContain(slots[0].teamIds![6])
  })

  it('Eliminatórias têm as 10 seleções da CONMEBOL', () => {
    expect(slots[0].teamIds).toHaveLength(10)
    const known = new Set(PRESET_TEAMS.map((t) => t.id))
    for (const id of slots[0].teamIds!) expect(known.has(id), id).toBe(true)
  })
})
