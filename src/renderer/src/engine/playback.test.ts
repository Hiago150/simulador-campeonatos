import { describe, it, expect } from 'vitest'
import { createTournament, simulateAll } from './tournament'
import { footballTimeline, esportsTimeline } from './playback'
import { baseConfig, mkTeams } from '../test/fixtures'
import type { Match, Team } from '../types'

function playedMatches(sport: 'football' | 'esports', n = 8): { matches: Match[]; teams: Record<string, Team> } {
  const teams = mkTeams(n).map((t) => ({ ...t, sport }))
  const t = simulateAll(
    createTournament({
      name: 'P',
      sport,
      format: 'league',
      teams,
      config: baseConfig(sport === 'esports' ? { bestOf: 3 } : {})
    })
  )
  const map: Record<string, Team> = {}
  for (const tm of t.teams) map[tm.id] = tm
  return { matches: t.matches.filter((m) => m.played), teams: map }
}

describe('footballTimeline — replay dos 90 minutos', () => {
  const { matches, teams } = playedMatches('football')

  it('nunca inventa números: eventos batem exatamente com os totais simulados', () => {
    for (const m of matches) {
      const f = m.football!
      const { events } = footballTimeline(m, teams)
      const count = (k: string) => events.filter((e) => e.kind === k).length
      expect(count('goal') + count('own-goal')).toBe(f.goals.length)
      expect(count('foul')).toBe(f.fouls[0] + f.fouls[1])
      expect(count('yellow')).toBe(f.yellow[0] + f.yellow[1])
      expect(count('red')).toBe(f.red[0] + f.red[1])
      const chances = Math.max(0, f.shotsOnTarget[0] - m.homeScore) + Math.max(0, f.shotsOnTarget[1] - m.awayScore)
      expect(count('chance')).toBe(chances)
    }
  })

  it('gols usam os minutos REAIS e o placar acumula até o resultado final', () => {
    for (const m of matches) {
      const { events } = footballTimeline(m, teams)
      const goalEvents = events.filter((e) => e.kind === 'goal' || e.kind === 'own-goal')
      const realMinutes = m.football!.goals.map((g) => g.minute).sort((a, b) => a - b)
      expect(goalEvents.map((e) => e.at)).toEqual(realMinutes)
      const last = goalEvents[goalEvents.length - 1]
      if (last) expect(last.score).toEqual([m.homeScore, m.awayScore])
    }
  })

  it('determinístico e ordenado dentro da duração', () => {
    for (const m of matches) {
      const a = footballTimeline(m, teams)
      const b = footballTimeline(m, teams)
      expect(a).toEqual(b) // mesma partida => mesma timeline
      for (let i = 1; i < a.events.length; i++) expect(a.events[i].at).toBeGreaterThanOrEqual(a.events[i - 1].at)
      for (const e of a.events) {
        expect(e.at).toBeGreaterThanOrEqual(0)
        expect(e.at).toBeLessThanOrEqual(a.duration)
      }
    }
  })
})

describe('esportsTimeline — replay por mapa (nunca por round)', () => {
  const { matches, teams } = playedMatches('esports')

  it('um começo e um fim por mapa, placar da série acumulando', () => {
    for (const m of matches) {
      const e = m.esports!
      const { events } = esportsTimeline(m, teams)
      expect(events.filter((x) => x.kind === 'map-start')).toHaveLength(e.maps.length)
      const ends = events.filter((x) => x.kind === 'map-end')
      expect(ends).toHaveLength(e.maps.length)
      expect(ends[ends.length - 1].score).toEqual([m.homeScore, m.awayScore])
      expect(ends[ends.length - 1].highlight).toBe('decisive') // último mapa fecha a série
    }
  })

  it('determinístico e ordenado', () => {
    for (const m of matches) {
      const a = esportsTimeline(m, teams)
      expect(a).toEqual(esportsTimeline(m, teams))
      for (let i = 1; i < a.events.length; i++) expect(a.events[i].at).toBeGreaterThanOrEqual(a.events[i - 1].at)
    }
  })
})
