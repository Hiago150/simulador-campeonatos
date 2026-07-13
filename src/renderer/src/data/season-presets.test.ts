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

// Índices fixos do preset VCT (ver data/season-presets.ts): Kickoff 0-3,
// Masters 1 (classificatória/playoffs) 4-5, Stage 1 6-9, Masters 2 10-11,
// Stage 2 grupos/play-ins/playoffs 12-23, Champions 24.
describe('preset Temporada Valorant — circuito completo (Kickoff→Champions)', () => {
  const p = preset('sea-valorant')
  const slots = buildSlots(p)
  const rankings: Record<string, string[]> = {}
  for (const s of slots) if (s.teamIds) rankings[s.id] = [...s.teamIds]

  it('todos os ids dos slots existem na base de times e têm region', () => {
    const known = new Map(PRESET_TEAMS.map((t) => [t.id, t]))
    for (const sl of p.slots) {
      for (const id of sl.teamIds) {
        const team = known.get(id)
        expect(team, id).toBeTruthy()
        expect(team!.region, id).toBeTruthy()
      }
    }
  })

  it('tem 25 campeonatos no ano', () => {
    expect(slots).toHaveLength(25)
  })

  it('Kickoff (0-3): tripla eliminação, 12 franquias por região, sem sobreposição', () => {
    const kickoffs = slots.slice(0, 4)
    expect(kickoffs.every((s) => s.format === 'triple-elim' && s.teamIds?.length === 12)).toBe(true)
    const allIds = kickoffs.flatMap((s) => s.teamIds!)
    expect(new Set(allIds).size).toBe(48)
  })

  it('Stage 1 (6-9) e Stage 2 · Grupos (12-15) usam o mesmo elenco do Kickoff da região', () => {
    for (let i = 0; i < 4; i++) {
      expect(new Set(slots[6 + i].teamIds)).toEqual(new Set(slots[i].teamIds))
      expect(new Set(slots[12 + i].teamIds)).toEqual(new Set(slots[i].teamIds))
    }
  })

  it('Masters 1 — Fase Classificatória (4): 2º e 3º de cada Kickoff (8 times)', () => {
    const ids = resolveSlotTeamIds(slots[4], rankings)
    expect(ids).toHaveLength(8)
    for (const ko of slots.slice(0, 4)) {
      expect(ids).toContain(ko.teamIds![1])
      expect(ids).toContain(ko.teamIds![2])
      expect(ids).not.toContain(ko.teamIds![0])
    }
  })

  it('Masters 1 — Playoffs (5): 1º de cada Kickoff (bye) + top-4 da fase classificatória (8 times)', () => {
    const classifierRanking = resolveSlotTeamIds(slots[4], rankings)
    rankings[slots[4].id] = classifierRanking
    const ids = resolveSlotTeamIds(slots[5], rankings)
    expect(ids).toHaveLength(8)
    for (const ko of slots.slice(0, 4)) expect(ids).toContain(ko.teamIds![0])
    // top-4 da classificação da fase classificatória (as 4 primeiras posições)
    for (const qualifier of classifierRanking.slice(0, 4)) expect(ids).toContain(qualifier)
  })

  it('Stage 2 · Play-Ins (16-19): quem não fez o top-2/grupo (8 times, sem os 4 diretos)', () => {
    const groupsSlot = slots[12]
    const ids = resolveSlotTeamIds(slots[16], rankings)
    expect(ids).toHaveLength(8)
    // as 4 primeiras posições da classificação são de quem fez o top-2/grupo
    // (foram pro mini-mata-mata) — essas NÃO vão pro Play-In
    for (const direct of groupsSlot.teamIds!.slice(0, 4)) expect(ids).not.toContain(direct)
    expect(ids).toContain(groupsSlot.teamIds![4])
  })

  it('Stage 2 · Playoffs (20-23): top-2/grupo direto + 4 sobreviventes dos Play-Ins (8 times)', () => {
    rankings[slots[16].id] = resolveSlotTeamIds(slots[16], rankings)
    const ids = resolveSlotTeamIds(slots[20], rankings)
    expect(ids).toHaveLength(8)
    expect(ids).toContain(slots[12].teamIds![0])
    expect(ids).toContain(slots[12].teamIds![1])
  })

  it('VCT Champions (24): qualifiesFrom direto traz 2 finalistas de cada Stage 2 Playoffs (8 times)', () => {
    for (let i = 0; i < 4; i++) rankings[slots[20 + i].id] = resolveSlotTeamIds(slots[20 + i], rankings)
    const champions = slots[24]
    const ids = resolveSlotTeamIds(champions, rankings)
    expect(ids).toHaveLength(8) // resolveSlotTeamIds só resolve o qualifiesFrom genérico —
    // as outras 8 vagas (2 por região "por consistência") são um mecanismo à parte do preset,
    // resolvido em Season.tsx (ver season-vct.test.ts)
    expect(champions.config.groupCount).toBe(4)
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
