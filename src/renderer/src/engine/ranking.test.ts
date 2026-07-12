import { describe, it, expect } from 'vitest'
import { createTournament, simulateAll } from './tournament'
import { computeStandings } from './standings'
import { finalRanking } from './ranking'
import { computeMovements } from '../store/season'
import { baseConfig, mkTeams } from '../test/fixtures'
import type { Format, SeasonSlot } from '../types'

function played(format: Format, n: number, over = {}) {
  return simulateAll(
    createTournament({
      name: 'R',
      sport: 'football',
      format,
      teams: mkTeams(n),
      config: baseConfig(over)
    })
  )
}

describe('finalRanking — classificação final por formato', () => {
  it('liga: igual à tabela final; todos os times, sem repetição', () => {
    const t = played('league', 10)
    const rank = finalRanking(t)
    expect(rank).toHaveLength(10)
    expect(new Set(rank).size).toBe(10)
    const table = computeStandings(t.teams.map((x) => x.id), t.matches).map((r) => r.teamId)
    expect(rank).toEqual(table)
    expect(rank[0]).toBe(t.champion)
  })

  it('suíço: tabela final, campeão no topo', () => {
    const t = played('swiss', 8, { swissRounds: 5 })
    const rank = finalRanking(t)
    expect(rank).toHaveLength(8)
    expect(rank[0]).toBe(t.champion)
  })

  it('liga+playoffs: campeão no topo, resto pela tabela da fase de liga', () => {
    const t = played('league-playoffs', 10, { playoffQualifiers: 4 })
    const rank = finalRanking(t)
    expect(rank).toHaveLength(10)
    expect(new Set(rank).size).toBe(10)
    expect(rank[0]).toBe(t.champion)
  })

  it('mata-mata: campeão primeiro, vice segundo, todos presentes', () => {
    const t = played('cup', 16)
    const rank = finalRanking(t)
    expect(rank).toHaveLength(16)
    expect(new Set(rank).size).toBe(16)
    expect(rank[0]).toBe(t.champion)
    // vice = quem perdeu a final
    const final = t.bracket![t.bracket!.length - 1].matches[0]
    const vice = final.homeId === t.champion ? final.awayId : final.homeId
    expect(rank[1]).toBe(vice)
  })

  it('grupos: eliminados na fase de grupos ficam atrás de quem foi ao mata-mata', () => {
    const t = played('groups', 16, { groupCount: 4, qualifiersPerGroup: 2 })
    const rank = finalRanking(t)
    expect(rank).toHaveLength(16)
    expect(new Set(rank).size).toBe(16)
    expect(rank[0]).toBe(t.champion)
    const koTeams = new Set<string>()
    for (const round of t.bracket ?? []) {
      for (const bm of round.matches) {
        if (bm.homeId) koTeams.add(bm.homeId)
        if (bm.awayId) koTeams.add(bm.awayId)
      }
    }
    // os 8 do mata-mata ocupam as 8 primeiras posições
    expect(rank.slice(0, koTeams.size).every((id) => koTeams.has(id))).toBe(true)
  })

  it('dupla eliminação: campeão primeiro, todos os times presentes', () => {
    const t = played('double-elim', 8)
    const rank = finalRanking(t)
    expect(rank).toHaveLength(8)
    expect(new Set(rank).size).toBe(8)
    expect(rank[0]).toBe(t.champion)
  })
})

describe('computeMovements — acesso/descenso entre divisões', () => {
  const mkSlot = (id: string, name: string, teamIds: string[]): SeasonSlot => ({
    id,
    name,
    format: 'league',
    config: baseConfig(),
    teamIds
  })

  it('troca os últimos N de cima pelos primeiros N de baixo', () => {
    const slots = [
      mkSlot('a', 'Série A', ['a1', 'a2', 'a3', 'a4']),
      mkSlot('b', 'Série B', ['b1', 'b2', 'b3', 'b4'])
    ]
    const rankings = {
      a: ['a2', 'a1', 'a4', 'a3'], // últimos 2: a4, a3
      b: ['b3', 'b1', 'b2', 'b4'] // primeiros 2: b3, b1
    }
    const { slots: next, movements } = computeMovements(
      slots,
      [{ upperSlotId: 'a', lowerSlotId: 'b', count: 2 }],
      rankings,
      (id) => id
    )
    expect(next[0].teamIds!.sort()).toEqual(['a1', 'a2', 'b1', 'b3'])
    expect(next[1].teamIds!.sort()).toEqual(['a3', 'a4', 'b2', 'b4'])
    expect(movements).toHaveLength(4)
    expect(movements.filter((m) => m.kind === 'relegation').map((m) => m.teamId).sort()).toEqual(['a3', 'a4'])
    expect(movements.filter((m) => m.kind === 'promotion').map((m) => m.teamId).sort()).toEqual(['b1', 'b3'])
    // tamanhos estáveis
    expect(next[0].teamIds).toHaveLength(4)
    expect(next[1].teamIds).toHaveLength(4)
  })

  it('divisão do meio cede pra cima e pra baixo no mesmo ano (A↔B e B↔C)', () => {
    const slots = [
      mkSlot('a', 'Série A', ['a1', 'a2', 'a3']),
      mkSlot('b', 'Série B', ['b1', 'b2', 'b3']),
      mkSlot('c', 'Série C', ['c1', 'c2', 'c3'])
    ]
    const rankings = {
      a: ['a1', 'a2', 'a3'],
      b: ['b1', 'b2', 'b3'],
      c: ['c1', 'c2', 'c3']
    }
    const { slots: next } = computeMovements(
      slots,
      [
        { upperSlotId: 'a', lowerSlotId: 'b', count: 1 },
        { upperSlotId: 'b', lowerSlotId: 'c', count: 1 }
      ],
      rankings,
      (id) => id
    )
    // A perde a3, ganha b1
    expect(next[0].teamIds!.sort()).toEqual(['a1', 'a2', 'b1'])
    // B perde b1 (subiu) e b3 (desceu), ganha a3 e c1
    expect(next[1].teamIds!.sort()).toEqual(['a3', 'b2', 'c1'])
    // C perde c1, ganha b3
    expect(next[2].teamIds!.sort()).toEqual(['b3', 'c2', 'c3'])
    // todos os tamanhos estáveis
    for (const s of next) expect(s.teamIds).toHaveLength(3)
  })

  it('ignora fronteira sem classificação registrada ou sem elenco próprio', () => {
    const slots = [mkSlot('a', 'A', ['a1', 'a2']), { ...mkSlot('b', 'B', []), teamIds: undefined }]
    const { slots: next, movements } = computeMovements(
      slots,
      [{ upperSlotId: 'a', lowerSlotId: 'b', count: 1 }],
      {},
      (id) => id
    )
    expect(movements).toHaveLength(0)
    expect(next).toEqual(slots)
  })

  it('count é limitado pra não esvaziar uma divisão pequena', () => {
    const slots = [mkSlot('a', 'A', ['a1', 'a2', 'a3']), mkSlot('b', 'B', ['b1', 'b2', 'b3'])]
    const rankings = { a: ['a1', 'a2', 'a3'], b: ['b1', 'b2', 'b3'] }
    const { movements } = computeMovements(
      slots,
      [{ upperSlotId: 'a', lowerSlotId: 'b', count: 99 }],
      rankings,
      (id) => id
    )
    // no máximo floor(3/2) = 1 por lado
    expect(movements).toHaveLength(2)
  })
})
