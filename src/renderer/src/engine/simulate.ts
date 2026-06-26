// Simulação de partidas — futebol e e-sports
import type {
  BestOf,
  EsportsDetail,
  EsportsGame,
  EsportsMap,
  EsportsPlayerLine,
  FootballDetail,
  Goal,
  Match,
  Player,
  Sport,
  Team
} from '../types'
import { clamp, poisson, randInt, winProbability } from './rng'
import { sectorsOf } from './strength'

export interface SimContext {
  sport: Sport
  /** imprevisibilidade 0..1 — 0 = a força manda, 1 = loteria (ignora a força) */
  chaos: number
  bestOf: BestOf
  /** e-sports: jogo disputado (pool de mapas) */
  game?: EsportsGame
  /** mata-mata em campo neutro (sem mando de campo) */
  neutral: boolean
  /** precisa terminar com um vencedor (prorrogação + pênaltis) */
  decisive: boolean
  /** jogo de volta: gols do jogo de ida (já mapeados para mando deste jogo) */
  firstLeg?: { homeGoals: number; awayGoals: number }
}

/** mistura o valor "pela força" com o "neutro" conforme o caos (1 => neutro) */
function blend(full: number, neutral: number, chaos: number): number {
  return neutral + (full - neutral) * (1 - chaos)
}

const POS_WEIGHT: Record<Player['position'], number> = {
  FWD: 5,
  MID: 3,
  DEF: 1,
  GK: 0.05
}

function pickScorer(team: Team): Player {
  const squad = team.squad ?? []
  if (squad.length === 0) {
    return { id: `${team.id}_anon`, name: 'Desconhecido', position: 'FWD' }
  }
  const total = squad.reduce((s, p) => s + POS_WEIGHT[p.position], 0)
  let roll = Math.random() * total
  for (const p of squad) {
    roll -= POS_WEIGHT[p.position]
    if (roll <= 0) return p
  }
  return squad[squad.length - 1]
}

function buildGoals(count: number, team: Team, opponent: Team, minMin: number, maxMin: number): Goal[] {
  const goals: Goal[] = []
  for (let i = 0; i < count; i++) {
    const minute = randInt(minMin, maxMin)
    if (Math.random() < 0.02) {
      // gol contra
      const scorer = pickScorer(opponent)
      goals.push({
        minute,
        teamId: team.id,
        playerId: scorer.id,
        playerName: scorer.name,
        ownGoal: true
      })
    } else {
      const scorer = pickScorer(team)
      goals.push({ minute, teamId: team.id, playerId: scorer.id, playerName: scorer.name })
    }
  }
  return goals.sort((a, b) => a.minute - b.minute)
}

function penaltyShootout(sHome: number, sAway: number, chaos: number): [number, number] {
  const pH = blend(clamp(0.75 + (sHome - sAway) / 600, 0.62, 0.86), 0.75, chaos)
  const pA = blend(clamp(0.75 + (sAway - sHome) / 600, 0.62, 0.86), 0.75, chaos)
  let h = 0
  let a = 0
  // 5 cobranças
  for (let i = 0; i < 5; i++) {
    if (Math.random() < pH) h++
    if (Math.random() < pA) a++
  }
  // morte súbita
  let guard = 0
  while (h === a && guard < 30) {
    const hh = Math.random() < pH ? 1 : 0
    const aa = Math.random() < pA ? 1 : 0
    h += hh
    a += aa
    guard++
  }
  if (h === a) h++ // desempate de segurança
  return [h, a]
}

function simulateFootball(home: Team, away: Team, ctx: SimContext): Partial<Match> {
  const sH = home.strength
  const sA = away.strength
  // setores: ataque de um lado mede-se contra a defesa do outro;
  // o meio-campo entra como controle (pesa nos dois e domina a posse).
  const hSec = sectorsOf(home)
  const aSec = sectorsOf(away)
  const homeAtk = hSec.attack * 0.72 + hSec.midfield * 0.28
  const awayAtk = aSec.attack * 0.72 + aSec.midfield * 0.28
  const homeDef = hSec.defense * 0.72 + hSec.midfield * 0.28
  const awayDef = aSec.defense * 0.72 + aSec.midfield * 0.28
  const expHome = blend((homeAtk - awayDef) / 100, 0, ctx.chaos)
  const expAway = blend((awayAtk - homeDef) / 100, 0, ctx.chaos)
  const homeAdv = ctx.neutral ? 0 : 0.22
  const base = 1.35
  const lambdaHome = clamp(base * Math.exp(0.9 * expHome + homeAdv), 0.18, 4.5)
  const lambdaAway = clamp(base * Math.exp(0.9 * expAway), 0.14, 4.5)

  let homeScore = poisson(lambdaHome)
  let awayScore = poisson(lambdaAway)
  const goals: Goal[] = [
    ...buildGoals(homeScore, home, away, 1, 90),
    ...buildGoals(awayScore, away, home, 1, 90)
  ]

  let extraTime = false
  let penalties: [number, number] | undefined
  let winnerId: string | undefined

  if (ctx.decisive) {
    // agregado (ida e volta) ou só este jogo, quando não há jogo de ida
    const fl = ctx.firstLeg
    let aggH = homeScore + (fl?.homeGoals ?? 0)
    let aggA = awayScore + (fl?.awayGoals ?? 0)
    if (aggH === aggA) {
      extraTime = true
      const etH = poisson(lambdaHome * 0.34)
      const etA = poisson(lambdaAway * 0.34)
      homeScore += etH
      awayScore += etA
      aggH += etH
      aggA += etA
      goals.push(...buildGoals(etH, home, away, 91, 120))
      goals.push(...buildGoals(etA, away, home, 91, 120))
      if (aggH === aggA) {
        penalties = penaltyShootout(sH, sA, ctx.chaos)
        winnerId = penalties[0] > penalties[1] ? home.id : away.id
      } else {
        winnerId = aggH > aggA ? home.id : away.id
      }
    } else {
      winnerId = aggH > aggA ? home.id : away.id
    }
  }

  goals.sort((a, b) => a.minute - b.minute)

  // estatísticas — posse comandada pelo meio-campo
  const shareHome = blend(hSec.midfield / (hSec.midfield + aSec.midfield), 0.5, ctx.chaos)
  const possHome = clamp(Math.round(50 + (shareHome - 0.5) * 42 + randInt(-6, 6)), 29, 71)
  const possAway = 100 - possHome
  const shotsHome = clamp(Math.round(possHome / 8 + homeScore * 2 + randInt(2, 7)), homeScore + 1, 30)
  const shotsAway = clamp(Math.round(possAway / 8 + awayScore * 2 + randInt(2, 7)), awayScore + 1, 30)
  const sotHome = clamp(Math.round(shotsHome * (0.32 + Math.random() * 0.2)), homeScore, shotsHome)
  const sotAway = clamp(Math.round(shotsAway * (0.32 + Math.random() * 0.2)), awayScore, shotsAway)
  const foulsHome = randInt(6, 16)
  const foulsAway = randInt(6, 16)

  const detail: FootballDetail = {
    goals,
    possession: [possHome, possAway],
    shots: [shotsHome, shotsAway],
    shotsOnTarget: [sotHome, sotAway],
    corners: [
      clamp(Math.round(possHome / 12) + randInt(0, 4), 0, 14),
      clamp(Math.round(possAway / 12) + randInt(0, 4), 0, 14)
    ],
    fouls: [foulsHome, foulsAway],
    yellow: [clamp(Math.round(foulsHome / 6) + randInt(0, 2), 0, 6), clamp(Math.round(foulsAway / 6) + randInt(0, 2), 0, 6)],
    red: [Math.random() < 0.06 ? 1 : 0, Math.random() < 0.06 ? 1 : 0]
  }

  return { homeScore, awayScore, extraTime, penalties, winnerId, football: detail, played: true }
}

const MAP_POOLS: Record<EsportsGame, string[]> = {
  cs2: ['Mirage', 'Inferno', 'Nuke', 'Overpass', 'Ancient', 'Anubis', 'Vertigo', 'Dust II'],
  valorant: ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Sunset', 'Icebox', 'Breeze', 'Abyss']
}

function kdaForTeam(
  team: Team,
  roundsWonShare: number,
  mapsPlayed: number,
  chaos: number
): EsportsPlayerLine[] {
  const squad = team.squad ?? []
  return squad.map((p, idx) => {
    const roleBoost = idx === 0 ? 1.18 : idx === 1 ? 1.08 : idx === 4 ? 0.85 : 1
    const winBoost = blend(0.78 + roundsWonShare * 0.5, 1, chaos)
    const deathFactor = blend(1.3 - roundsWonShare * 0.5, 1, chaos)
    const kills = Math.max(0, Math.round((randInt(12, 24) * mapsPlayed * roleBoost * winBoost) / 1.6))
    const deaths = Math.max(1, Math.round((randInt(12, 22) * mapsPlayed * deathFactor) / 1.6))
    const assists = Math.round((randInt(2, 8) * mapsPlayed) / 1.6)
    return { playerId: p.id, name: p.name, teamId: team.id, kills, deaths, assists }
  })
}

function simulateEsports(home: Team, away: Team, ctx: SimContext): Partial<Match> {
  const bestOf: BestOf = ctx.bestOf
  const needed = Math.ceil(bestOf / 2)
  const sH = home.strength
  const sA = away.strength
  const homeAdv = ctx.neutral ? 0 : 1.5
  const pHomeMap = blend(winProbability(sH + homeAdv, sA, 26), 0.5, ctx.chaos)

  const maps: EsportsMap[] = []
  let hMaps = 0
  let aMaps = 0
  const pool = [...(MAP_POOLS[ctx.game ?? 'cs2'] ?? MAP_POOLS.cs2)].sort(() => Math.random() - 0.5)
  let mi = 0
  while (hMaps < needed && aMaps < needed) {
    const homeWins = Math.random() < pHomeMap
    // placar do mapa: vencedor 13; perdedor cai conforme a dominância do vencedor
    // (times muito favoritos => resultados mais elásticos; equilíbrio/zebra => acirrado)
    const winnerStr = homeWins ? sH : sA
    const loserStr = homeWins ? sA : sH
    const gap = blend(winnerStr - loserStr, 0, ctx.chaos)
    const loserRounds = clamp(Math.round(11 - gap * 0.26 + randInt(-3, 2)), 1, 11)
    maps.push({
      name: pool[mi % pool.length],
      home: homeWins ? 13 : loserRounds,
      away: homeWins ? loserRounds : 13
    })
    if (homeWins) hMaps++
    else aMaps++
    mi++
  }

  const totalRoundsHome = maps.reduce((s, m) => s + m.home, 0)
  const totalRoundsAway = maps.reduce((s, m) => s + m.away, 0)
  const allRounds = Math.max(1, totalRoundsHome + totalRoundsAway)
  const mapsPlayed = maps.length

  const homeLines = kdaForTeam(home, totalRoundsHome / allRounds, mapsPlayed, ctx.chaos)
  const awayLines = kdaForTeam(away, totalRoundsAway / allRounds, mapsPlayed, ctx.chaos)
  const lines = [...homeLines, ...awayLines]

  const rating = (l: EsportsPlayerLine) => l.kills + l.assists * 0.4 - l.deaths * 0.3
  const mvp = lines.reduce((best, l) => (rating(l) > rating(best) ? l : best), lines[0])

  const detail: EsportsDetail = {
    bestOf,
    maps,
    mvp,
    lines,
    totalKills: [
      homeLines.reduce((s, l) => s + l.kills, 0),
      awayLines.reduce((s, l) => s + l.kills, 0)
    ]
  }

  const winnerId = hMaps > aMaps ? home.id : away.id
  return { homeScore: hMaps, awayScore: aMaps, winnerId, esports: detail, played: true }
}

export function simulateMatch(match: Match, home: Team, away: Team, ctx: SimContext): Match {
  const result =
    ctx.sport === 'football'
      ? simulateFootball(home, away, ctx)
      : simulateEsports(home, away, ctx)
  return { ...match, ...result }
}
