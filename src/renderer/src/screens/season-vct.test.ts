import { describe, it, expect } from 'vitest'
import {
  vctStage2Ranking,
  resolveVCTConsistencyWildcards,
  resolveVCTPreviousYearBye
} from './Season'
import type { Season, SeasonSlot } from '../types'

describe('vctStage2Ranking — combina Playoffs (quem chegou lá) + Play-Ins (quem caiu)', () => {
  it('playoffs primeiro, depois quem não avançou dos play-ins, sem duplicar', () => {
    const ranking = vctStage2Ranking(
      { playoffs: ['a', 'b', 'c', 'd'], playins: ['c', 'd', 'e', 'f'] },
      'playoffs',
      'playins'
    )
    expect(ranking).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('sem dados de nenhum dos dois slots, devolve lista vazia', () => {
    expect(vctStage2Ranking(undefined, 'playoffs', 'playins')).toEqual([])
  })
})

describe('resolveVCTConsistencyWildcards — 2 vagas por região via média de colocação', () => {
  const cfg = {
    count: 2,
    regions: [
      {
        kickoffSlotId: 'ko',
        stage1SlotId: 's1',
        stage2PlayoffsSlotId: 'playoffs',
        stage2PlayInsSlotId: 'playins'
      }
    ]
  }

  it('escolhe quem teve a melhor média de colocação, ignorando quem já se classificou', () => {
    // time "a" e "b" já vieram direto pelo playoff (excluídos); entre os
    // demais, "c" tem colocação melhor em média que "d"
    const rankings = {
      ko: ['a', 'c', 'd', 'e'],
      s1: ['c', 'a', 'd', 'e'],
      playoffs: ['a', 'b'],
      playins: ['c', 'd', 'e', 'f']
    }
    const out = resolveVCTConsistencyWildcards(cfg, rankings, new Set(['a', 'b']))
    expect(out.map((o) => o.teamId)).toEqual(['c', 'd'])
  })

  it('respeita o count por região (só as N melhores médias)', () => {
    const rankings = {
      ko: ['x', 'y', 'z'],
      s1: ['x', 'y', 'z'],
      playoffs: [],
      playins: ['x', 'y', 'z']
    }
    const out = resolveVCTConsistencyWildcards({ ...cfg, count: 1 }, rankings, new Set())
    expect(out).toHaveLength(1)
    expect(out[0].teamId).toBe('x')
  })
})

describe('resolveVCTPreviousYearBye — bye do Kickoff pro Champions do ano anterior', () => {
  const slot: SeasonSlot = {
    id: 'kickoff-americas',
    name: 'VCT Americas — Kickoff',
    format: 'triple-elim',
    config: {} as SeasonSlot['config'],
    teamIds: ['a', 'b', 'c', 'd', 'e'],
    previousYearBye: { fromSlotId: 'champions' }
  }

  it('ano 1: sem ano anterior, sem bye nenhum', () => {
    const season = { currentYear: 1, years: [] } as unknown as Season
    expect(resolveVCTPreviousYearBye(slot, season)).toEqual([])
  })

  it('ano 2+: times da própria região que foram ao Champions do ano passado ganham rank 1..N', () => {
    const season = {
      currentYear: 2,
      years: [
        {
          year: 1,
          slotRankings: { champions: ['z', 'a', 'y', 'c', 'x', 'b'] } // z/y/x são de outra região
        }
      ]
    } as unknown as Season
    const out = resolveVCTPreviousYearBye(slot, season)
    expect(out.map((o) => o.teamId)).toEqual(['a', 'c', 'b'])
    expect(out.every((o) => o.fromSlotId === 'champions')).toBe(true)
    expect(out.map((o) => o.rank)).toEqual([1, 2, 3])
  })

  it('sem previousYearBye configurado, não faz nada', () => {
    const season = { currentYear: 2, years: [{ year: 1, slotRankings: { champions: ['a'] } }] } as unknown as Season
    expect(resolveVCTPreviousYearBye({ ...slot, previousYearBye: undefined }, season)).toEqual([])
  })
})
