// Orquestrador — criação de torneios, contexto de simulação e avanço de fases
import type {
  Format,
  Group,
  Match,
  Sport,
  Tournament,
  TournamentConfig,
  TournamentPhase,
  Team
} from '../types'
import { ensureSquad, type RosterOverrides } from './names'
import { shuffle, uid } from './rng'
import { simulateMatch, type SimContext } from './simulate'
import { buildLeagueMatches, roundRobinPairings } from './schedule'
import {
  advanceBracket,
  buildBracket,
  nextPowerOf2,
  standardSeedOrder
} from './bracket'
import { advanceElim, buildElim, elimLives, readyElimMatches } from './elim'
import { computeStandings } from './standings'
import { buildRegionPotGroups } from './regionDraw'

function isElim(f: Format): boolean {
  return f === 'double-elim' || f === 'triple-elim'
}

export interface CreateInput {
  name: string
  sport: Sport
  format: Format
  teams: Team[]
  config: TournamentConfig
  /** elencos de e-sports editados pelo usuário (por jogo + time) */
  rosterOverrides?: RosterOverrides
  /** posição de chegada de cada time (classificado via qualifiesFrom na Temporada) */
  arrivals?: Record<string, { fromSlotId?: string; rank?: number }>
  /** true só quando a própria Temporada está criando este campeonato (nunca no avulso) */
  fromSeason?: boolean
}

const groupLetter = (i: number): string => String.fromCharCode(65 + i)
const pairKey = (a: string, b: string): string => [a, b].sort().join('|')
const isPow2 = (n: number): boolean => n > 0 && (n & (n - 1)) === 0

/** imprevisibilidade 0..1 do config (compat: `pureRandom` antigo => 1) */
export function chaosOf(config: TournamentConfig): number {
  return config.chaos ?? (config.pureRandom ? 1 : 0)
}
/** só a "loteria" (caos máximo) sorteia o chaveamento/grupos sem ligar pra força */
function randomSeed(config: TournamentConfig): boolean {
  return chaosOf(config) >= 1
}
/** ida e volta no mata-mata — só faz sentido no futebol */
function twoLeggedOf(config: TournamentConfig, sport: Sport): boolean {
  return config.twoLeggedKO === true && sport === 'football'
}

type Arrivals = CreateInput['arrivals']

/**
 * Ordena times por posição de chegada (quem se classificou melhor entra em
 * pote melhor), com força bruta como critério de desempate — times sem
 * `arrivals` (ex.: elenco fixo do slot) ficam por último nesse critério e
 * disputam entre si só por força, exatamente como sempre foi.
 */
function orderBySeed(teams: Team[], arrivals?: Arrivals): Team[] {
  const rankOf = (team: Team): number => arrivals?.[team.id]?.rank ?? Number.POSITIVE_INFINITY
  return [...teams].sort((a, b) => rankOf(a) - rankOf(b) || b.strength - a.strength)
}

/** posição original na chave (índice+1 do `cupSeed`), pra priorizar seed no ressorteio da chave inferior */
function seedRankFrom(cupSeed?: (string | null)[]): Map<string, number> | undefined {
  if (!cupSeed) return undefined
  const m = new Map<string, number>()
  cupSeed.forEach((id, i) => {
    if (id) m.set(id, i + 1)
  })
  return m
}

/** selo genérico ("#N") pra times com posição de chegada — potes por região geram um mais rico e substituem este */
function genericSeedLabels(arrivals?: Arrivals): Record<string, string> | undefined {
  if (!arrivals) return undefined
  const out: Record<string, string> = {}
  for (const [teamId, a] of Object.entries(arrivals)) {
    if (a.rank != null) out[teamId] = `#${a.rank}`
  }
  return Object.keys(out).length ? out : undefined
}

// ============================================================
//  Criação
// ============================================================

export function createTournament(input: CreateInput): Tournament {
  const game = input.sport === 'esports' ? input.config.game : undefined
  const teams = input.teams.map((t) => ensureSquad(t, game, input.rosterOverrides))
  const teamIds = teams.map((t) => t.id)
  const now = Date.now()

  const base: Tournament = {
    id: uid('t'),
    name: input.name.trim() || 'Campeonato sem nome',
    sport: input.sport,
    format: input.format,
    createdAt: now,
    updatedAt: now,
    config: input.config,
    teams,
    matches: [],
    phase: 'league',
    ...(input.arrivals
      ? { arrivals: input.arrivals, seedLabels: genericSeedLabels(input.arrivals) }
      : {})
  }

  if (input.format === 'league' || input.format === 'league-playoffs') {
    return {
      ...base,
      matches: buildLeagueMatches(teamIds, input.config.homeAndAway),
      phase: 'league'
    }
  }

  if (input.format === 'cup') {
    const seeded = seedForCup(teams, randomSeed(input.config), input.arrivals)
    const { bracket, matches } = buildBracket(seeded, twoLeggedOf(input.config, input.sport))
    // avança uma vez para resolver byes de imediato
    const adv = advanceBracket(bracket, matches)
    return {
      ...base,
      cupSeed: seeded,
      bracket: adv.bracket,
      matches: adv.matches,
      phase: 'knockout'
    }
  }

  if (isElim(input.format)) {
    const seeded = seedForCup(teams, randomSeed(input.config), input.arrivals)
    const built = buildElim(seeded, elimLives(input.format))
    const adv = advanceElim(built.bracket, built.matches, seedRankFrom(seeded))
    return {
      ...base,
      cupSeed: seeded,
      bracket: adv.bracket,
      matches: adv.matches,
      phase: 'knockout'
    }
  }

  if (input.format === 'groups') {
    // potes por região — só Valorant, só quando a própria Temporada monta o evento
    if (input.fromSeason && input.sport === 'esports' && input.config.game === 'valorant') {
      const regionDraw = buildRegionPotGroups(teams, input.config, input.arrivals)
      if (regionDraw) {
        return {
          ...base,
          groups: regionDraw.groups,
          matches: regionDraw.matches,
          seedLabels: regionDraw.seedLabels,
          phase: 'group'
        }
      }
    }
    const { groups, matches } = buildGroups(teams, input.config, input.arrivals)
    return { ...base, groups, matches, phase: 'group' }
  }

  // swiss
  const swissMatches = buildSwissRound1(teams, randomSeed(input.config), input.arrivals)
  return {
    ...base,
    matches: swissMatches,
    phase: 'swiss',
    swiss: {
      totalRounds: input.config.swissRounds,
      currentRound: 1,
      playedPairs: swissMatches.map((m) => pairKey(m.homeId, m.awayId))
    }
  }
}

function seedForCup(teams: Team[], pureRandom: boolean, arrivals?: Arrivals): (string | null)[] {
  const ordered = pureRandom ? shuffle(teams) : orderBySeed(teams, arrivals)
  const size = nextPowerOf2(ordered.length)
  const order = standardSeedOrder(size)
  return order.map((seed) => ordered[seed - 1]?.id ?? null)
}

function buildGroups(
  teams: Team[],
  config: TournamentConfig,
  arrivals?: Arrivals
): { groups: Group[]; matches: Match[] } {
  const G = config.groupCount
  const ordered = randomSeed(config) ? shuffle(teams) : orderBySeed(teams, arrivals)

  const groups: Group[] = Array.from({ length: G }, (_, i) => ({
    id: groupLetter(i),
    name: `Grupo ${groupLetter(i)}`,
    teamIds: []
  }))

  // distribuição em "serpente" para equilibrar a força entre os grupos
  ordered.forEach((team, idx) => {
    const band = Math.floor(idx / G)
    const pos = idx % G
    const g = band % 2 === 0 ? pos : G - 1 - pos
    groups[g].teamIds.push(team.id)
  })

  const matches: Match[] = []
  for (const grp of groups) {
    const pairings = roundRobinPairings(grp.teamIds, config.homeAndAway)
    for (const p of pairings) {
      matches.push({
        id: uid('m'),
        round: p.round,
        stage: `Grupo ${grp.id} · Rodada ${p.round}`,
        groupId: grp.id,
        homeId: p.homeId,
        awayId: p.awayId,
        played: false,
        homeScore: 0,
        awayScore: 0
      })
    }
  }
  return { groups, matches }
}

function buildSwissRound1(teams: Team[], pureRandom: boolean, arrivals?: Arrivals): Match[] {
  const ordered = pureRandom ? shuffle(teams) : orderBySeed(teams, arrivals)
  const half = Math.floor(ordered.length / 2)
  const matches: Match[] = []
  for (let i = 0; i < half; i++) {
    const home = ordered[i]
    const away = ordered[i + half]
    matches.push({
      id: uid('m'),
      round: 1,
      stage: 'Rodada 1 · Suíço',
      homeId: home.id,
      awayId: away.id,
      played: false,
      homeScore: 0,
      awayScore: 0
    })
  }
  return matches
}

// ============================================================
//  Contexto de simulação
// ============================================================

function bracketMatchIds(t: Tournament): Set<string> {
  const set = new Set<string>()
  if (t.bracket) {
    for (const round of t.bracket) {
      for (const bm of round.matches) {
        if (bm.matchId) set.add(bm.matchId)
        if (bm.legIds) for (const id of bm.legIds) set.add(id)
      }
    }
  }
  return set
}

/** descobre se uma partida é jogo de ida/volta de um confronto agregado */
function legInfo(
  t: Tournament,
  matchId: string
): { isLeg1: boolean; isLeg2: boolean; firstLeg?: { homeGoals: number; awayGoals: number } } {
  if (!t.bracket) return { isLeg1: false, isLeg2: false }
  for (const round of t.bracket) {
    for (const bm of round.matches) {
      if (!bm.legIds || bm.legIds.length !== 2) continue
      if (bm.legIds[0] === matchId) return { isLeg1: true, isLeg2: false }
      if (bm.legIds[1] === matchId) {
        const ida = t.matches.find((m) => m.id === bm.legIds![0])
        // o mando da volta é o visitante da ida → mapeia os gols da ida
        const firstLeg = ida
          ? { homeGoals: ida.awayScore, awayGoals: ida.homeScore }
          : { homeGoals: 0, awayGoals: 0 }
        return { isLeg1: false, isLeg2: true, firstLeg }
      }
    }
  }
  return { isLeg1: false, isLeg2: false }
}

function simContextFor(t: Tournament, match: Match, koSet: Set<string>): SimContext {
  const base = {
    sport: t.sport,
    chaos: chaosOf(t.config),
    bestOf: t.config.bestOf,
    game: t.config.game
  }
  const leg = legInfo(t, match.id)
  if (leg.isLeg1) return { ...base, neutral: true, decisive: false }
  if (leg.isLeg2) return { ...base, neutral: true, decisive: true, firstLeg: leg.firstLeg }
  if (koSet.has(match.id)) return { ...base, neutral: true, decisive: true }
  if (t.format === 'swiss') return { ...base, neutral: true, decisive: false }
  return { ...base, neutral: false, decisive: false }
}

function teamById(t: Tournament, id: string): Team | undefined {
  return t.teams.find((x) => x.id === id)
}

/** força aplicada à "forma": ajusta strength/setores por um delta */
function withForm(team: Team, delta: number): Team {
  if (delta === 0) return team
  const clampS = (v: number): number => Math.max(20, Math.min(99, v))
  return {
    ...team,
    strength: clampS(team.strength + delta),
    attack: team.attack != null ? clampS(team.attack + delta) : team.attack,
    midfield: team.midfield != null ? clampS(team.midfield + delta) : team.midfield,
    defense: team.defense != null ? clampS(team.defense + delta) : team.defense
  }
}

/** resultado de uma partida para um time: +1 vitória, 0 empate, -1 derrota */
function resultFor(m: Match, teamId: string): number {
  if (m.winnerId) return m.winnerId === teamId ? 1 : -1
  const isHome = m.homeId === teamId
  const gf = isHome ? m.homeScore : m.awayScore
  const ga = isHome ? m.awayScore : m.homeScore
  return gf > ga ? 1 : gf < ga ? -1 : 0
}

/** soma dos últimos (até 3) resultados do time no torneio (-3..+3) */
function formScore(t: Tournament, teamId: string, excludeMatchId?: string): number {
  return t.matches
    .filter((m) => m.played && m.id !== excludeMatchId && (m.homeId === teamId || m.awayId === teamId))
    .sort((a, b) => b.round - a.round)
    .slice(0, 3)
    .reduce((s, m) => s + resultFor(m, teamId), 0)
}

function formDelta(t: Tournament, teamId: string, current: Match): number {
  const score = formScore(t, teamId, current.id)
  return Math.max(-9, Math.min(9, score * 3)) // intensidade média
}

/** nível de forma para a UI (🔥/❄️) — só quando a forma está ligada */
export function teamFormLevel(t: Tournament, teamId: string): 'hot' | 'cold' | null {
  if (!t.config.momentum) return null
  const score = formScore(t, teamId)
  if (score >= 2) return 'hot'
  if (score <= -2) return 'cold'
  return null
}

function applyMatchResult(t: Tournament, matchId: string, koSet: Set<string>): Tournament {
  const match = t.matches.find((m) => m.id === matchId)
  if (!match) return t
  let home = teamById(t, match.homeId)
  let away = teamById(t, match.awayId)
  if (!home || !away) return t
  // forma/embalo (opcional): ajusta a força pelo momento dentro do torneio
  if (t.config.momentum) {
    home = withForm(home, formDelta(t, home.id, match))
    away = withForm(away, formDelta(t, away.id, match))
  }
  const ctx = simContextFor(t, match, koSet)
  const simulated = simulateMatch(match, home, away, ctx)
  return {
    ...t,
    matches: t.matches.map((m) => (m.id === matchId ? simulated : m)),
    updatedAt: Date.now()
  }
}

// ============================================================
//  Avanço de fases
// ============================================================

function advanceKnockout(t: Tournament): Tournament {
  if (!t.bracket) return t
  const { bracket, matches, champion } = advanceBracket(t.bracket, t.matches)
  let nt: Tournament = { ...t, bracket, matches }
  if (champion) nt = { ...nt, champion, phase: 'finished' }
  return nt
}

function advanceElimPhase(t: Tournament): Tournament {
  if (!t.bracket) return t
  const { bracket, matches, champion } = advanceElim(t.bracket, t.matches, seedRankFrom(t.cupSeed))
  let nt: Tournament = { ...t, bracket, matches }
  if (champion) nt = { ...nt, champion, phase: 'finished' }
  return nt
}

function allGroupMatchesPlayed(t: Tournament): boolean {
  const gm = t.matches.filter((m) => m.groupId)
  return gm.length > 0 && gm.every((m) => m.played)
}

function seedFromGroups(t: Tournament): (string | null)[] {
  const groups = t.groups ?? []
  const K = t.config.qualifiersPerGroup
  const perGroup = groups.map((g) =>
    computeStandings(
      g.teamIds,
      t.matches.filter((m) => m.groupId === g.id)
    )
  )

  // cruzamento clássico (1º A x 2º B...) quando o total é potência de 2
  if (K === 2 && groups.length >= 2 && isPow2(groups.length * 2)) {
    const seeded: (string | null)[] = []
    for (let i = 0; i < groups.length; i++) {
      const winner = perGroup[i][0]?.teamId ?? null
      const runner = perGroup[(i + 1) % groups.length][1]?.teamId ?? null
      seeded.push(winner)
      seeded.push(runner)
    }
    return seeded
  }

  // fallback: classificados ordenados por posição de chegada (quando existir)
  // + força como desempate, semeados no padrão
  const qualTeams: Team[] = []
  perGroup.forEach((st) => {
    st.slice(0, K).forEach((row) => {
      const team = teamById(t, row.teamId)
      if (team) qualTeams.push(team)
    })
  })
  const quals = orderBySeed(qualTeams, t.arrivals)
  const size = nextPowerOf2(quals.length)
  const order = standardSeedOrder(size)
  return order.map((seed) => quals[seed - 1]?.id ?? null)
}

function advanceGroups(t: Tournament): Tournament {
  let nt = t
  if (nt.phase === 'group' && allGroupMatchesPlayed(nt)) {
    const seeded = seedFromGroups(nt)
    const { bracket, matches } = buildBracket(seeded, twoLeggedOf(nt.config, nt.sport))
    nt = {
      ...nt,
      bracket,
      matches: [...nt.matches, ...matches],
      cupSeed: seeded,
      phase: 'knockout'
    }
  }
  if (nt.phase === 'knockout') nt = advanceKnockout(nt)
  return nt
}

function advanceLeaguePlayoffs(t: Tournament): Tournament {
  if (t.phase === 'league') {
    if (t.matches.length > 0 && t.matches.every((m) => m.played)) {
      const st = computeStandings(
        t.teams.map((x) => x.id),
        t.matches
      )
      const N = Math.max(2, Math.min(t.config.playoffQualifiers ?? 8, st.length))
      const quals = st.slice(0, N).map((r) => r.teamId)
      const size = nextPowerOf2(quals.length)
      const order = standardSeedOrder(size)
      const seeded = order.map((seed) => quals[seed - 1] ?? null)
      const { bracket, matches } = buildBracket(seeded, twoLeggedOf(t.config, t.sport))
      return {
        ...t,
        bracket,
        matches: [...t.matches, ...matches],
        cupSeed: seeded,
        phase: 'knockout'
      }
    }
    return t
  }
  if (t.phase === 'knockout') return advanceKnockout(t)
  return t
}

function advanceLeague(t: Tournament): Tournament {
  if (t.matches.length > 0 && t.matches.every((m) => m.played)) {
    const st = computeStandings(
      t.teams.map((x) => x.id),
      t.matches
    )
    return { ...t, champion: st[0]?.teamId, phase: 'finished' }
  }
  return t
}

function greedyPairSwiss(ordered: string[], playedSet: Set<string>): [string, string][] {
  const remaining = [...ordered]
  const pairs: [string, string][] = []
  while (remaining.length > 1) {
    const a = remaining.shift() as string
    let idx = remaining.findIndex((b) => !playedSet.has(pairKey(a, b)))
    if (idx < 0) idx = 0
    const b = remaining.splice(idx, 1)[0]
    pairs.push([a, b])
  }
  return pairs
}

function advanceSwiss(t: Tournament): Tournament {
  if (!t.swiss) return t
  const cur = t.swiss.currentRound
  const roundMatches = t.matches.filter((m) => m.round === cur)
  if (roundMatches.length === 0 || !roundMatches.every((m) => m.played)) return t

  if (cur < t.swiss.totalRounds) {
    const standings = computeStandings(
      t.teams.map((x) => x.id),
      t.matches.filter((m) => m.played)
    )
    const ordered = standings.map((r) => r.teamId)
    const playedSet = new Set(t.swiss.playedPairs)
    const pairs = greedyPairSwiss(ordered, playedSet)
    const nextRound = cur + 1
    const newMatches: Match[] = pairs.map(([h, a]) => ({
      id: uid('m'),
      round: nextRound,
      stage: `Rodada ${nextRound} · Suíço`,
      homeId: h,
      awayId: a,
      played: false,
      homeScore: 0,
      awayScore: 0
    }))
    return {
      ...t,
      matches: [...t.matches, ...newMatches],
      swiss: {
        ...t.swiss,
        currentRound: nextRound,
        playedPairs: [...t.swiss.playedPairs, ...pairs.map(([a, b]) => pairKey(a, b))]
      }
    }
  }

  // última rodada concluída → campeão pela classificação
  const st = computeStandings(
    t.teams.map((x) => x.id),
    t.matches
  )
  return { ...t, champion: st[0]?.teamId, phase: 'finished' }
}

function runAdvance(t: Tournament): Tournament {
  switch (t.format) {
    case 'league':
      return advanceLeague(t)
    case 'cup':
      return advanceKnockout(t)
    case 'groups':
      return advanceGroups(t)
    case 'swiss':
      return advanceSwiss(t)
    case 'league-playoffs':
      return advanceLeaguePlayoffs(t)
    case 'double-elim':
    case 'triple-elim':
      return advanceElimPhase(t)
    default:
      return t
  }
}

// ============================================================
//  Rodada atual (para os botões de ação)
// ============================================================

export interface RoundInfo {
  label: string
  matchIds: string[]
}

export function currentRoundInfo(t: Tournament): RoundInfo {
  if (t.phase === 'finished') return { label: 'Encerrado', matchIds: [] }

  if ((t.format === 'league' || t.format === 'league-playoffs') && t.phase === 'league') {
    const leagueMatches = t.matches.filter((m) => !m.groupId)
    const unplayed = leagueMatches.filter((m) => !m.played)
    if (unplayed.length === 0) return { label: 'Fase de pontos concluída', matchIds: [] }
    const minRound = Math.min(...unplayed.map((m) => m.round))
    const maxRound = Math.max(...leagueMatches.map((m) => m.round))
    const ids = unplayed.filter((m) => m.round === minRound).map((m) => m.id)
    return { label: `Rodada ${minRound} de ${maxRound}`, matchIds: ids }
  }

  if (t.phase === 'group') {
    const unplayed = t.matches.filter((m) => m.groupId && !m.played)
    if (unplayed.length === 0) return { label: 'Fase de grupos concluída', matchIds: [] }
    const minRound = Math.min(...unplayed.map((m) => m.round))
    const maxRound = Math.max(...t.matches.filter((m) => m.groupId).map((m) => m.round))
    const ids = unplayed.filter((m) => m.round === minRound).map((m) => m.id)
    return { label: `Rodada ${minRound} de ${maxRound} · Grupos`, matchIds: ids }
  }

  if (isElim(t.format) && t.bracket) {
    const ids = readyElimMatches(t)
    return { label: ids.length > 0 ? 'Confrontos em aberto' : 'Mata-mata', matchIds: ids }
  }

  if (t.phase === 'knockout' && t.bracket) {
    for (const round of t.bracket) {
      const idaIds: string[] = []
      const voltaIds: string[] = []
      const singleIds: string[] = []
      for (const bm of round.matches) {
        if (bm.winnerId) continue
        if (bm.legIds && bm.legIds.length === 2) {
          const ida = t.matches.find((m) => m.id === bm.legIds![0])
          const volta = t.matches.find((m) => m.id === bm.legIds![1])
          if (ida && !ida.played) idaIds.push(ida.id)
          else if (volta && !volta.played) voltaIds.push(volta.id)
        } else if (bm.matchId) {
          const m = t.matches.find((x) => x.id === bm.matchId)
          if (m && !m.played) singleIds.push(m.id)
        }
      }
      if (idaIds.length > 0) return { label: `${round.name} · Ida`, matchIds: idaIds }
      if (voltaIds.length > 0) return { label: `${round.name} · Volta`, matchIds: voltaIds }
      if (singleIds.length > 0) return { label: round.name, matchIds: singleIds }
    }
    return { label: 'Mata-mata', matchIds: [] }
  }

  if (t.format === 'swiss' && t.swiss) {
    const cur = t.swiss.currentRound
    const ids = t.matches.filter((m) => m.round === cur && !m.played).map((m) => m.id)
    return { label: `Rodada ${cur} de ${t.swiss.totalRounds} · Suíço`, matchIds: ids }
  }

  return { label: '', matchIds: [] }
}

// ============================================================
//  Ações públicas
// ============================================================

export function simulateOne(t: Tournament, matchId: string): Tournament {
  const koSet = bracketMatchIds(t)
  const updated = applyMatchResult(t, matchId, koSet)
  return runAdvance(updated)
}

export function simulateRound(t: Tournament): Tournament {
  const info = currentRoundInfo(t)
  if (info.matchIds.length === 0) return t
  const koSet = bracketMatchIds(t)
  let nt = t
  for (const id of info.matchIds) nt = applyMatchResult(nt, id, koSet)
  return runAdvance(nt)
}

export function simulateAll(t: Tournament): Tournament {
  let nt = t
  let guard = 0
  while (nt.phase !== 'finished' && guard < 2000) {
    const info = currentRoundInfo(nt)
    if (info.matchIds.length === 0) break
    const koSet = bracketMatchIds(nt)
    for (const id of info.matchIds) nt = applyMatchResult(nt, id, koSet)
    nt = runAdvance(nt)
    guard++
  }
  return nt
}

function clearMatch(m: Match): Match {
  return {
    ...m,
    played: false,
    homeScore: 0,
    awayScore: 0,
    winnerId: undefined,
    extraTime: undefined,
    penalties: undefined,
    football: undefined,
    esports: undefined
  }
}

export function resetResults(t: Tournament): Tournament {
  const now = Date.now()
  if (t.format === 'league') {
    return { ...t, matches: t.matches.map(clearMatch), champion: undefined, phase: 'league', updatedAt: now }
  }
  if (t.format === 'league-playoffs') {
    const koSet = bracketMatchIds(t)
    const leagueMatches = t.matches.filter((m) => !koSet.has(m.id)).map(clearMatch)
    return {
      ...t,
      matches: leagueMatches,
      bracket: undefined,
      cupSeed: undefined,
      champion: undefined,
      phase: 'league',
      updatedAt: now
    }
  }
  if (t.format === 'groups') {
    const groupMatches = t.matches.filter((m) => m.groupId).map(clearMatch)
    return {
      ...t,
      matches: groupMatches,
      bracket: undefined,
      cupSeed: undefined,
      champion: undefined,
      phase: 'group',
      updatedAt: now
    }
  }
  if (t.format === 'cup' && t.cupSeed) {
    const { bracket, matches } = buildBracket(t.cupSeed, twoLeggedOf(t.config, t.sport))
    const adv = advanceBracket(bracket, matches)
    return {
      ...t,
      bracket: adv.bracket,
      matches: adv.matches,
      champion: undefined,
      phase: 'knockout',
      updatedAt: now
    }
  }
  if (isElim(t.format) && t.cupSeed) {
    const built = buildElim(t.cupSeed, elimLives(t.format))
    const adv = advanceElim(built.bracket, built.matches, seedRankFrom(t.cupSeed))
    return {
      ...t,
      bracket: adv.bracket,
      matches: adv.matches,
      champion: undefined,
      phase: 'knockout',
      updatedAt: now
    }
  }
  if (t.format === 'swiss' && t.swiss) {
    const r1 = t.matches.filter((m) => m.round === 1).map(clearMatch)
    return {
      ...t,
      matches: r1,
      champion: undefined,
      phase: 'swiss',
      swiss: {
        ...t.swiss,
        currentRound: 1,
        playedPairs: r1.map((m) => pairKey(m.homeId, m.awayId))
      },
      updatedAt: now
    }
  }
  return t
}
