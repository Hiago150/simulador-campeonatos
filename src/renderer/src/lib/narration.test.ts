import { describe, it, expect } from 'vitest'
import { matchMoments, roundHighlights } from './narration'
import type { Goal, Match, Team } from '../types'

const team = (id: string, strength: number): Team => ({
  id,
  name: id.toUpperCase(),
  shortName: id.slice(0, 3).toUpperCase(),
  strength,
  category: 'custom',
  sport: 'football',
  color: '#888'
})

const goal = (minute: number, teamId: string, name: string): Goal => ({
  minute,
  teamId,
  playerId: `${teamId}-${minute}`,
  playerName: name
})

function footballMatch(over: Partial<Match> & { homeScore: number; awayScore: number }): Match {
  return {
    id: 'm1',
    round: 1,
    stage: 'Rodada 1',
    homeId: 'home',
    awayId: 'away',
    played: true,
    football: {
      goals: [],
      possession: [50, 50],
      shots: [0, 0],
      shotsOnTarget: [0, 0],
      corners: [0, 0],
      fouls: [0, 0],
      yellow: [0, 0],
      red: [0, 0]
    },
    ...over
  } as Match
}

describe('matchMoments — futebol', () => {
  it('mostra o placar correndo a cada gol', () => {
    const teams = { home: team('home', 80), away: team('away', 80) }
    const m = footballMatch({
      homeScore: 1,
      awayScore: 1,
      football: {
        goals: [goal(10, 'away', 'Zé'), goal(30, 'home', 'Téo')],
        possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
        corners: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0]
      }
    })
    const texts = matchMoments(m, teams).map((x) => x.text)
    expect(texts[0]).toContain('HOME 0–1 AWAY')
    expect(texts[1]).toContain('HOME 1–1 AWAY')
  })

  it('detecta virada (time que estava atrás vira o jogo)', () => {
    const teams = { home: team('home', 80), away: team('away', 80) }
    // 0–1, 1–1, 2–1 → o gol do 2–1 é a virada do mandante
    const m = footballMatch({
      homeScore: 2,
      awayScore: 1,
      football: {
        goals: [goal(10, 'away', 'Zé'), goal(30, 'home', 'Téo'), goal(80, 'home', 'Rui')],
        possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
        corners: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0]
      }
    })
    const texts = matchMoments(m, teams).map((x) => x.text)
    expect(texts.filter((t) => t.includes('virada')).length).toBe(1)
    expect(texts[2]).toContain('virada')
  })

  it('marca o gol do título como decisivo (e a virada também)', () => {
    const teams = { home: team('home', 80), away: team('away', 80) }
    // 0–1, 1–1, 2–1: o 3º gol é virada E gol do título (vencedor 2, perdedor 1 → 2º gol do vencedor decide)
    const m = footballMatch({
      homeScore: 2,
      awayScore: 1,
      football: {
        goals: [goal(10, 'away', 'Zé'), goal(30, 'home', 'Téo'), goal(80, 'home', 'Rui')],
        possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
        corners: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0]
      }
    })
    const ms = matchMoments(m, teams)
    expect(ms[2].highlight).toBe('decisive') // gol da virada e do título
    expect(ms[0].highlight).toBeUndefined()
    // 3–1 sem virada: o 2º gol do vencedor (perdedor fez 1) é o decisivo
    const m2 = footballMatch({
      homeScore: 3,
      awayScore: 1,
      football: {
        goals: [goal(5, 'home', 'A'), goal(20, 'home', 'B'), goal(50, 'away', 'C'), goal(70, 'home', 'D')],
        possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
        corners: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0]
      }
    })
    const ms2 = matchMoments(m2, teams)
    expect(ms2[1].highlight).toBe('decisive') // 2º gol do mandante
    expect(ms2[3].highlight).toBeUndefined()
  })

  it('não marca virada quando o favorito só amplia', () => {
    const teams = { home: team('home', 80), away: team('away', 80) }
    const m = footballMatch({
      homeScore: 2,
      awayScore: 0,
      football: {
        goals: [goal(10, 'home', 'A'), goal(40, 'home', 'B')],
        possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
        corners: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0]
      }
    })
    const texts = matchMoments(m, teams).map((x) => x.text)
    expect(texts.some((t) => t.includes('virada'))).toBe(false)
  })
})

describe('roundHighlights — zebra na perspectiva do vencedor', () => {
  it('placar vem na ordem vencedor–perdedor mesmo com o azarão visitante', () => {
    // favorito (90) é mandante e PERDE pro azarão (60) visitante por 2–3
    const teams = { fav: team('fav', 90), zeb: team('zeb', 60) }
    const m = footballMatch({
      id: 'mz',
      homeId: 'fav',
      awayId: 'zeb',
      homeScore: 2,
      awayScore: 3
    })
    const hi = roundHighlights(['mz'], [m], teams)
    expect(hi?.zebra).toBeTruthy()
    expect(hi?.zebra?.winner).toBe('ZEB')
    expect(hi?.zebra?.loser).toBe('FAV')
    // 3–2 (gols do vencedor primeiro), não "2–3"
    expect(hi?.zebra?.score).toBe('3–2')
  })
})
