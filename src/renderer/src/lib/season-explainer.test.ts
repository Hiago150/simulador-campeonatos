import { describe, it, expect } from 'vitest'
import { seasonFlow, seasonHasFlow } from './season-explainer'
import type { Season, SeasonSlot, Team } from '../types'

function slot(over: Partial<SeasonSlot> & { id: string; name: string }): SeasonSlot {
  return { format: 'league', config: {} as SeasonSlot['config'], ...over }
}

const POOL: Team[] = []

function season(over: Partial<Season>): Season {
  return {
    id: 's1',
    name: 'Era Teste',
    sport: 'football',
    period: 10,
    slots: [],
    teamPool: POOL,
    currentYear: 1,
    currentSlotIndex: 0,
    years: [],
    allTimeScorers: [],
    allTimeWins: {},
    baseStats: {},
    teamForm: {},
    records: {},
    status: 'playing',
    createdAt: 0,
    updatedAt: 0,
    ...over
  }
}

describe('seasonFlow', () => {
  it('slot sem nenhum mecanismo dinâmico: só o elenco fixo', () => {
    const s = season({ slots: [slot({ id: 'a', name: 'Liga A', teamIds: ['t1', 't2'] })] })
    const [flow] = seasonFlow(s)
    expect(flow.fixedCount).toBe(2)
    expect(flow.sources).toHaveLength(0)
    expect(flow.boundaryLinks).toHaveLength(0)
  })

  it('slot sem teamIds usa o pool inteiro (fixedCount null)', () => {
    const s = season({ slots: [slot({ id: 'a', name: 'Livre' })] })
    const [flow] = seasonFlow(s)
    expect(flow.fixedCount).toBeNull()
  })

  it('qualifiesFrom sem offset vira "1º ao Nº"', () => {
    const s = season({
      slots: [
        slot({ id: 'liga', name: 'Liga', teamIds: ['a', 'b'] }),
        slot({ id: 'copa', name: 'Copa', qualifiesFrom: [{ slotId: 'liga', count: 4 }] })
      ]
    })
    const [, copaFlow] = seasonFlow(s)
    expect(copaFlow.sources).toEqual([
      { fromSlotId: 'liga', fromSlotName: 'Liga', count: 4, rankFrom: 1, rankTo: 4 }
    ])
  })

  it('qualifiesFrom com offset calcula a faixa correta (ex.: 7º-8º)', () => {
    const s = season({
      slots: [
        slot({ id: 'liga', name: 'Liga' }),
        slot({ id: 'pre', name: 'Pré', qualifiesFrom: [{ slotId: 'liga', count: 2, offset: 6 }] })
      ]
    })
    const [, preFlow] = seasonFlow(s)
    expect(preFlow.sources[0]).toEqual({ fromSlotId: 'liga', fromSlotName: 'Liga', count: 2, rankFrom: 7, rankTo: 8 })
  })

  it('divisionBoundary aparece nos dois slots, com direção oposta', () => {
    const s = season({
      slots: [slot({ id: 'a', name: 'Série A' }), slot({ id: 'b', name: 'Série B' })],
      divisionBoundaries: [{ upperSlotId: 'a', lowerSlotId: 'b', count: 4 }]
    })
    const [flowA, flowB] = seasonFlow(s)
    expect(flowA.boundaryLinks).toEqual([
      { partnerSlotId: 'b', partnerSlotName: 'Série B', direction: 'desce-pra', count: 4, playInSlotId: undefined, playInSlotName: undefined }
    ])
    expect(flowB.boundaryLinks).toEqual([
      { partnerSlotId: 'a', partnerSlotName: 'Série A', direction: 'sobe-pra', count: 4, playInSlotId: undefined, playInSlotName: undefined }
    ])
  })

  it('play-in decide a última vaga da fronteira', () => {
    const s = season({
      slots: [slot({ id: 'a', name: 'Série A' }), slot({ id: 'b', name: 'Série B' }), slot({ id: 'pi', name: 'Quadrangular' })],
      divisionBoundaries: [{ upperSlotId: 'a', lowerSlotId: 'b', count: 2, playInSlotId: 'pi' }]
    })
    const [flowA] = seasonFlow(s)
    expect(flowA.boundaryLinks[0].playInSlotName).toBe('Quadrangular')
  })

  it('nota curta pra vctConsistencyWildcards e previousYearBye', () => {
    const s = season({
      slots: [
        slot({ id: 'champ', name: 'Champions' }),
        slot({
          id: 'kickoff',
          name: 'Kickoff',
          previousYearBye: { fromSlotId: 'champ' },
          vctConsistencyWildcards: { count: 1, regions: [] }
        })
      ]
    })
    const [, kickoffFlow] = seasonFlow(s)
    expect(kickoffFlow.extraNotes).toHaveLength(2)
    expect(kickoffFlow.extraNotes[1]).toContain('Champions')
  })
})

describe('seasonHasFlow', () => {
  it('false quando nenhum slot tem qualifiesFrom/boundaries/extras', () => {
    const s = season({ slots: [slot({ id: 'a', name: 'Liga', teamIds: ['t1'] })] })
    expect(seasonHasFlow(s)).toBe(false)
  })

  it('true quando há qualifiesFrom', () => {
    const s = season({
      slots: [slot({ id: 'a', name: 'Liga' }), slot({ id: 'b', name: 'Copa', qualifiesFrom: [{ slotId: 'a', count: 2 }] })]
    })
    expect(seasonHasFlow(s)).toBe(true)
  })

  it('true quando há divisionBoundaries', () => {
    const s = season({
      slots: [slot({ id: 'a', name: 'A' }), slot({ id: 'b', name: 'B' })],
      divisionBoundaries: [{ upperSlotId: 'a', lowerSlotId: 'b', count: 2 }]
    })
    expect(seasonHasFlow(s)).toBe(true)
  })
})
