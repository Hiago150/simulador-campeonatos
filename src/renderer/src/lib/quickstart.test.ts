import { describe, it, expect } from 'vitest'
import { championshipInput, randomInput } from './quickstart'
import { createTournament, simulateAll } from '../engine/tournament'
import { progress } from '../engine/selectors'
import { CHAMPIONSHIP_PRESETS } from '../data/championships'

describe('quickstart — randomInput sempre gera torneio válido', () => {
  it('30 sorteios criam e simulam até o fim sem erro', () => {
    for (let i = 0; i < 30; i++) {
      const input = randomInput([], {})
      expect(input.teams.length).toBeGreaterThanOrEqual(2)
      const t = simulateAll(createTournament(input))
      expect(t.phase).toBe('finished')
      expect(t.champion).toBeTruthy()
      const p = progress(t)
      expect(p.played).toBe(p.total)
    }
  })
})

describe('quickstart — championshipInput', () => {
  it('todo modelo resolve os times e simula até um campeão', () => {
    for (const c of CHAMPIONSHIP_PRESETS) {
      const input = championshipInput(c, [], {})
      expect(input.teams.length, `modelo ${c.id}`).toBeGreaterThan(1)
      expect(input.name).toBe(c.label)
      const t = simulateAll(createTournament(input))
      expect(t.champion, `modelo ${c.id}`).toBeTruthy()
    }
  })
})
