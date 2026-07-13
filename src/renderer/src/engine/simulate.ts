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

/** amostra de rounds vencidos pelo mandante em `n` rounds, cada um com prob. `p` */
function binomialSample(n: number, p: number): number {
  let k = 0
  for (let i = 0; i < n; i++) if (Math.random() < p) k++
  return k
}

/**
 * Prorrogação do Valorant (regra oficial): parciais de 2 rounds (1 ataque +
 * 1 defesa) repetidos até alguém abrir 2 rounds de vantagem. Resolvido por
 * renovação (sem loop de round a round): cada parcial termina de forma
 * decisiva com prob. `p²+(1-p)²`; o vencedor do parcial decisivo sai da
 * probabilidade condicional `p²/(p²+(1-p)²)`. O nº de parciais empatados
 * antes do decisivo é sorteado (limitado a 5, pra manter placares plausíveis
 * tipo 15-13/19-17). Retorna só os rounds ganhos NA prorrogação (somar à
 * base de 12 de cada lado).
 */
function resolveValorantOT(pRound: number): { home: number; away: number } {
  const pContinue = 2 * pRound * (1 - pRound)
  let splits = 0
  while (Math.random() < pContinue && splits < 5) splits++
  const pHomeDecisive = pRound ** 2 / (pRound ** 2 + (1 - pRound) ** 2)
  const homeWinsDecisive = Math.random() < pHomeDecisive
  return homeWinsDecisive ? { home: splits + 2, away: splits } : { home: splits, away: splits + 2 }
}

/**
 * Prorrogação do CS2 (regra oficial): parciais de 6 rounds (3 terrorista +
 * 3 contraterrorista); quem fizer 4 primeiro fecha o parcial; 3-3 repete
 * outro parcial. Cada parcial é um binomial(6, p); parcial decisivo por
 * rejection-sampling (redesenha se cair em 3-3) — mesmo resultado que
 * derivar o binomial condicional na mão, mais simples. Limitado a 3
 * parciais empatados antes do 4º forçar uma decisão (evita loop infinito
 * em casos extremos). Retorna só os rounds da prorrogação.
 */
function resolveCS2OT(pRound: number): { home: number; away: number } {
  const maxFrames = 4
  let home = 0
  let away = 0
  for (let frame = 0; frame < maxFrames; frame++) {
    let k = binomialSample(6, pRound)
    if (frame === maxFrames - 1) {
      let attempts = 0
      while (k === 3 && attempts < 30) {
        k = binomialSample(6, pRound)
        attempts++
      }
    }
    if (k !== 3) return { home: home + k, away: away + (6 - k) }
    home += 3
    away += 3
  }
  return { home: home + 3, away: away + 3 } // inatingível — o último parcial força decisão
}

/** reparte `total` entre pesos preservando a soma exata (maiores restos ganham +1) */
function distribute(total: number, weights: number[]): number[] {
  const sumW = weights.reduce((s, w) => s + w, 0) || 1
  const raw = weights.map((w) => (total * w) / sumW)
  const out = raw.map(Math.floor)
  let rest = total - out.reduce((s, v) => s + v, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && rest > 0; k++, rest--) out[order[k].i]++
  return out
}

// peso por papel no time: estrela mata mais, âncora/suporte menos
const ROLE_KILL_W = [1.28, 1.12, 1, 0.9, 0.75]

/**
 * "Forma do dia" de cada jogador na SÉRIE (persiste entre os mapas): a maioria
 * fica perto de 1, mas há dias inspirados (~1.65, o cara carrega) e dias de
 * pesadelo (~0.45, some do jogo) — é o que abre os saldos +/− pra valer.
 */
function rollSeriesForm(team: Team): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of (team.squad ?? []).slice(0, 5)) {
    let form = 0.6 + (Math.random() + Math.random()) * 0.4 // triangular ~1.0
    const r = Math.random()
    if (r < 0.12) form += 0.25 // dia inspirado
    else if (r > 0.88) form -= 0.2 // dia pra esquecer
    out.set(p.id, clamp(form, 0.45, 1.65))
  }
  return out
}

/**
 * KDA de UM mapa, coerente com o placar: ~7–8 mortes por round disputado,
 * kills de um time = mortes do outro, e o vencedor abate um pouco mais
 * (vantagem achatada pelo fator zebra). A forma do dia espalha os destaques:
 * quem está voando mata mais e morre menos; quem está apagado, o contrário.
 */
function mapKda(
  home: Team,
  away: Team,
  mp: EsportsMap,
  chaos: number,
  homeForm: Map<string, number>,
  awayForm: Map<string, number>
): EsportsPlayerLine[] {
  const rounds = mp.home + mp.away
  const totalDeaths = Math.round(rounds * (6.9 + Math.random() * 1.2))
  const margin = (mp.home - mp.away) / Math.max(1, rounds)
  const homeShare = clamp(
    blend(0.5 + margin * 0.18, 0.5, chaos) + (Math.random() - 0.5) * 0.04,
    0.38,
    0.62
  )
  const homeKills = Math.round(totalDeaths * homeShare)
  const awayKills = totalDeaths - homeKills

  const lineFor = (
    team: Team,
    kills: number,
    deaths: number,
    form: Map<string, number>
  ): EsportsPlayerLine[] => {
    const squad = (team.squad ?? []).slice(0, 5)
    const killW = squad.map(
      (p, idx) => ROLE_KILL_W[idx] * (form.get(p.id) ?? 1) * (0.8 + Math.random() * 0.4)
    )
    // mortes variam menos que abates (todo mundo morre ~1x por round no máx.),
    // mas quem está em dia bom morre um pouco menos — é isso que cria o +/−
    const deathW = squad.map(
      (p) => clamp(1.18 - 0.18 * (form.get(p.id) ?? 1), 0.85, 1.18) * (0.92 + Math.random() * 0.16)
    )
    const ks = distribute(kills, killW)
    const ds = distribute(deaths, deathW)
    return squad.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      teamId: team.id,
      kills: ks[i],
      deaths: ds[i],
      assists: Math.round(ks[i] * (0.3 + Math.random() * 0.35))
    }))
  }
  return [
    ...lineFor(home, homeKills, awayKills, homeForm),
    ...lineFor(away, awayKills, homeKills, awayForm)
  ]
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
  // forma do dia por jogador — sorteada uma vez e mantida na série inteira
  const homeForm = rollSeriesForm(home)
  const awayForm = rollSeriesForm(away)
  let mi = 0
  while (hMaps < needed && aMaps < needed) {
    // chance real de terminar empatado em 12-12 na regulamentação — maior
    // quanto mais parelho o confronto, ~zero em jogos de goleada
    const pTie = clamp(0.3 * (1 - 4 * (pHomeMap - 0.5) ** 2), 0, 0.3)
    let mp: EsportsMap
    if (Math.random() < pTie) {
      // pHomeMap reaproveitado como proxy de prob. por round na prorrogação
      // (o motor não modela round a round fora da OT)
      const ot = ctx.game === 'valorant' ? resolveValorantOT(pHomeMap) : resolveCS2OT(pHomeMap)
      mp = { name: pool[mi % pool.length], home: 12 + ot.home, away: 12 + ot.away, overtime: true }
    } else {
      const homeWins = Math.random() < pHomeMap
      // placar do mapa: vencedor 13; perdedor cai conforme a dominância do vencedor
      // (times muito favoritos => resultados mais elásticos; equilíbrio/zebra => acirrado)
      const winnerStr = homeWins ? sH : sA
      const loserStr = homeWins ? sA : sH
      const gap = blend(winnerStr - loserStr, 0, ctx.chaos)
      const loserRounds = clamp(Math.round(11 - gap * 0.26 + randInt(-3, 2)), 1, 11)
      mp = {
        name: pool[mi % pool.length],
        home: homeWins ? 13 : loserRounds,
        away: homeWins ? loserRounds : 13
      }
    }
    mp.lines = mapKda(home, away, mp, ctx.chaos, homeForm, awayForm)
    maps.push(mp)
    if (mp.home > mp.away) hMaps++
    else aMaps++
    mi++
  }

  // KDA da série = soma dos mapas (o que garante números coerentes com os rounds)
  const byPlayer = new Map<string, EsportsPlayerLine>()
  for (const mp of maps) {
    for (const l of mp.lines ?? []) {
      const cur = byPlayer.get(l.playerId)
      if (cur) {
        cur.kills += l.kills
        cur.deaths += l.deaths
        cur.assists += l.assists
      } else {
        byPlayer.set(l.playerId, { ...l })
      }
    }
  }
  const lines = [...byPlayer.values()]

  const rating = (l: EsportsPlayerLine) => l.kills + l.assists * 0.4 - l.deaths * 0.3
  const mvp = lines.reduce((best, l) => (rating(l) > rating(best) ? l : best), lines[0])

  const detail: EsportsDetail = {
    bestOf,
    maps,
    mvp,
    lines,
    totalKills: [
      lines.filter((l) => l.teamId === home.id).reduce((s, l) => s + l.kills, 0),
      lines.filter((l) => l.teamId === away.id).reduce((s, l) => s + l.kills, 0)
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
