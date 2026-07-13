import { describe, it, expect } from 'vitest'
import { matchMoments, roundHighlights, esportsHighlightOptions } from './narration'
import { createTournament, simulateAll } from '../engine/tournament'
import { baseConfig, mkTeams } from '../test/fixtures'
import type { EsportsMap, Goal, Match, Team } from '../types'

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

describe('esportsHighlightOptions — resumo para compartilhar', () => {
  function playedSeries(bestOf: 1 | 3 | 5) {
    const t = simulateAll(
      createTournament({
        name: 'Highlights',
        sport: 'esports',
        format: 'cup',
        teams: mkTeams(8, 'esports'),
        config: baseConfig({ bestOf, game: 'cs2' })
      })
    )
    const teams: Record<string, Team> = {}
    for (const tm of t.teams) teams[tm.id] = tm
    return { matches: t.matches.filter((m) => m.played && m.esports), teams }
  }

  it('só gera opções para partidas de e-sports já jogadas', () => {
    const teams = { home: team('home', 80), away: team('away', 80) }
    const unplayed: Match = {
      id: 'x',
      round: 1,
      stage: 'R1',
      homeId: 'home',
      awayId: 'away',
      played: false,
      homeScore: 0,
      awayScore: 0
    } as Match
    expect(esportsHighlightOptions(unplayed, teams)).toEqual([])

    const football = footballMatch({ homeScore: 1, awayScore: 0 })
    expect(esportsHighlightOptions(football, teams)).toEqual([])
  })

  it('cada opção cita jogador + mapa/momento + ação, sem inventar rounds, e cabe em 30 palavras', () => {
    const { matches, teams } = playedSeries(5)
    for (const m of matches) {
      const options = esportsHighlightOptions(m, teams)
      const e = m.esports!
      expect(options.length).toBeGreaterThan(0)
      for (const text of options) {
        const words = text.trim().split(/\s+/).length
        expect(words).toBeLessThanOrEqual(30)
        // nunca cita "round" (o motor não rastreia round a round — só mapa)
        expect(text.toLowerCase()).not.toContain('round ')
      }
      // a última opção sempre resume o MVP da série (dado real, não inventado)
      if (e.mvp) {
        expect(options[options.length - 1]).toContain(e.mvp.name)
      }
    }
  })

  it('marca ace quando o saldo de abates do topo do mapa é ≥ 15', () => {
    // várias rodadas de torneios pra não depender de sorte de uma única série
    let sawAce = false
    for (let round = 0; round < 8; round++) {
      const { matches, teams } = playedSeries(5)
      for (const m of matches) {
        const options = esportsHighlightOptions(m, teams)
        m.esports!.maps.forEach((mp, i) => {
          if (!mp.lines?.length) return
          const top = [...mp.lines].sort((a, b) => b.kills - a.kills)[0]
          const isAce = top.kills - top.deaths >= 15
          const mapOption = options.find((t) => t.startsWith(`No Mapa ${i + 1} `))
          expect(mapOption).toBeTruthy()
          if (isAce) {
            sawAce = true
            expect(mapOption).toContain('ace')
          }
        })
      }
    }
    expect(sawAce).toBe(true) // em ~8 torneios de BO5, algum mapa deve ter ace
  })
})

describe('prorrogação — destaque narrativo sem emoji', () => {
  function esportsMatch(maps: EsportsMap[]): Match {
    return {
      id: 'e1',
      round: 1,
      stage: 'R1',
      homeId: 'home',
      awayId: 'away',
      played: true,
      homeScore: maps.filter((mp) => mp.home > mp.away).length,
      awayScore: maps.filter((mp) => mp.home < mp.away).length,
      esports: {
        bestOf: 3,
        maps,
        mvp: { playerId: 'p1', name: 'Top', teamId: 'home', kills: 20, deaths: 5, assists: 3 },
        lines: [],
        totalKills: [0, 0]
      }
    } as Match
  }

  it('mapa de prorrogação vira momento decisivo, sem emoji no texto', () => {
    const teams = { home: team('home', 80), away: team('away', 80) }
    const m = esportsMatch([{ name: 'Ascent', home: 15, away: 13, overtime: true }])
    const moments = matchMoments(m, teams)
    const mapMoment = moments.find((mo) => mo.text.includes('Ascent'))
    expect(mapMoment).toBeTruthy()
    expect(mapMoment!.highlight).toBe('decisive')
    expect(mapMoment!.text).toContain('prorrogação')
    // eslint-disable-next-line no-control-regex
    const emojiRange = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    expect(emojiRange.test(mapMoment!.text)).toBe(false)
  })

  it('resumo para compartilhar cita a prorrogação em texto plano', () => {
    const teams = { home: team('home', 80), away: team('away', 80) }
    const m = esportsMatch([{ name: 'Bind', home: 12, away: 14, overtime: true }])
    const options = esportsHighlightOptions(m, teams)
    const otOption = options.find((t) => t.includes('prorrogação'))
    expect(otOption).toBeTruthy()
    expect(otOption).toContain('Bind')
  })
})
