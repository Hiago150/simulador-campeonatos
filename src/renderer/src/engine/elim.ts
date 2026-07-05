// Dupla e tripla eliminação — chave superior (winners), inferior (losers),
// última chance (só na tripla) e grande final com reset.
// Modelado como BracketRound[] com referências de origem explícitas (winner/loser),
// então reaproveita o renderer/plumbing do mata-mata simples.
import type { BracketMatch, BracketRound, Match } from '../types'
import { uid } from './rng'
import { nextPowerOf2, roundName } from './bracket'

function mkMatch(homeId: string, awayId: string, roundIndex: number, stage: string): Match {
  return { id: uid('m'), round: roundIndex, stage, homeId, awayId, played: false, homeScore: 0, awayScore: 0 }
}

function node(section: BracketRound['section']): BracketMatch {
  return {
    id: uid('bm'),
    roundIndex: 0,
    slot: 0,
    homeId: null,
    awayId: null,
    matchId: null,
    winnerId: null,
    loserId: null,
    section
  }
}

/**
 * Constrói uma chave de eliminação múltipla.
 * @param seeded lista ordenada por posição (comprimento = potência de 2; null = bye)
 * @param lives 2 = dupla eliminação, 3 = tripla
 */
export function buildElim(seeded: (string | null)[], lives: 2 | 3): { bracket: BracketRound[]; matches: Match[] } {
  const size = seeded.length
  const W = Math.round(Math.log2(size))
  const rounds: BracketRound[] = []
  const matches: Match[] = []
  let ri = 0
  const push = (name: string, section: BracketRound['section'], bms: BracketMatch[]): BracketRound => {
    bms.forEach((b, s) => {
      b.roundIndex = ri
      b.slot = s
    })
    const r: BracketRound = { index: ri, name, section, matches: bms }
    rounds.push(r)
    ri++
    return r
  }

  // ---------------- Winners bracket ----------------
  const wb: BracketRound[] = []
  {
    const cnt = size / 2
    const bms = Array.from({ length: cnt }, () => node('wb'))
    for (let s = 0; s < cnt; s++) {
      const h = seeded[2 * s] ?? null
      const a = seeded[2 * s + 1] ?? null
      const bm = bms[s]
      bm.homeId = h
      bm.awayId = a
      if (h && a) {
        const m = mkMatch(h, a, ri, `Winners · ${roundName(size)}`)
        bm.matchId = m.id
        matches.push(m)
      } else if (h && !a) bm.winnerId = h
      else if (!h && a) bm.winnerId = a
      else bm.bye = true
    }
    wb.push(push(`Winners · ${roundName(size)}`, 'wb', bms))
  }
  for (let r = 1; r < W; r++) {
    const teamsInRound = size / Math.pow(2, r)
    const cnt = teamsInRound / 2
    const bms = Array.from({ length: cnt }, () => node('wb'))
    for (let s = 0; s < cnt; s++) {
      bms[s].homeFrom = { bm: wb[r - 1].matches[2 * s].id, take: 'winner' }
      bms[s].awayFrom = { bm: wb[r - 1].matches[2 * s + 1].id, take: 'winner' }
    }
    wb.push(push(`Winners · ${roundName(teamsInRound)}`, 'wb', bms))
  }
  const wbFinal = wb[W - 1].matches[0]

  // ---------------- Losers bracket (a partir dos perdedores do WB) ----------------
  const lb = buildLowerFrom(wb, 'lb', 'Losers', push)
  const lbFinal = lb.finalBm

  // ---------------- Última chance (tripla) — repescagem dos perdedores do LB ----------------
  let lcbFinal: BracketMatch | undefined
  if (lives === 3) {
    lcbFinal = buildLastChance(lb.rounds, push)
  }

  // ---------------- Grande final ----------------
  let challenger = lbFinal
  if (lives === 3 && lcbFinal) {
    const semi = node('gf')
    semi.homeFrom = { bm: lbFinal.id, take: 'winner' }
    semi.awayFrom = { bm: lcbFinal.id, take: 'winner' }
    push('Semifinal da decisão', 'gf', [semi])
    challenger = semi
  }
  const gf1 = node('gf')
  gf1.homeFrom = { bm: wbFinal.id, take: 'winner' }
  gf1.awayFrom = { bm: challenger.id, take: 'winner' }
  push('Grande Final', 'gf', [gf1])

  const gf2 = node('gf')
  gf2.resetOf = gf1.id
  gf2.homeFrom = { bm: wbFinal.id, take: 'winner' }
  gf2.awayFrom = { bm: challenger.id, take: 'winner' }
  push('Grande Final · Reset', 'gf', [gf2])

  return { bracket: rounds, matches }
}

/** Chave inferior a partir de uma chave superior (perdedores caem). */
function buildLowerFrom(
  upper: BracketRound[],
  section: 'lb' | 'lcb',
  label: string,
  push: (name: string, section: BracketRound['section'], bms: BracketMatch[]) => BracketRound
): { rounds: BracketRound[]; finalBm: BracketMatch } {
  const k = upper.length
  const out: BracketRound[] = []
  let rr = 1

  // R1: pareia os perdedores da 1ª rodada do WB
  const cnt1 = upper[0].matches.length / 2
  const bms1 = Array.from({ length: cnt1 }, () => node(section))
  for (let s = 0; s < cnt1; s++) {
    bms1[s].homeFrom = { bm: upper[0].matches[2 * s].id, take: 'loser' }
    bms1[s].awayFrom = { bm: upper[0].matches[2 * s + 1].id, take: 'loser' }
  }
  out.push(push(`${label} · R${rr++}`, section, bms1))
  let survivors = bms1

  for (let u = 1; u < k; u++) {
    // major: sobreviventes do LB vs perdedores da rodada u do WB
    const cnt = upper[u].matches.length
    const major = Array.from({ length: cnt }, () => node(section))
    for (let s = 0; s < cnt; s++) {
      major[s].homeFrom = { bm: survivors[s].id, take: 'winner' }
      major[s].awayFrom = { bm: upper[u].matches[s].id, take: 'loser' }
    }
    out.push(push(`${label} · R${rr++}`, section, major))
    survivors = major
    if (u < k - 1) {
      // minor: pareia sobreviventes do LB entre si
      const cnt2 = survivors.length / 2
      const minor = Array.from({ length: cnt2 }, () => node(section))
      for (let s = 0; s < cnt2; s++) {
        minor[s].homeFrom = { bm: survivors[2 * s].id, take: 'winner' }
        minor[s].awayFrom = { bm: survivors[2 * s + 1].id, take: 'winner' }
      }
      out.push(push(`${label} · R${rr++}`, section, minor))
      survivors = minor
    }
  }
  return { rounds: out, finalBm: survivors[0] }
}

/** "Última chance": gauntlet sobre os perdedores do LB (droppers mais antigos entram primeiro). */
function buildLastChance(
  lbRounds: BracketRound[],
  push: (name: string, section: BracketRound['section'], bms: BracketMatch[]) => BracketRound
): BracketMatch | undefined {
  const drops = lbRounds.flatMap((r) => r.matches.map((m) => ({ bm: m.id, take: 'loser' as const })))
  if (drops.length < 2) return undefined
  let n = 1
  const g0 = node('lcb')
  g0.homeFrom = drops[0]
  g0.awayFrom = drops[1]
  push(`Última chance · ${n++}`, 'lcb', [g0])
  let prev = g0
  for (let i = 2; i < drops.length; i++) {
    const g = node('lcb')
    g.homeFrom = { bm: prev.id, take: 'winner' }
    g.awayFrom = drops[i]
    push(`Última chance · ${n++}`, 'lcb', [g])
    prev = g
  }
  return prev
}

// ============================================================
//  Avanço
// ============================================================

export function advanceElim(
  bracketIn: BracketRound[],
  matchesIn: Match[]
): { bracket: BracketRound[]; matches: Match[]; champion?: string } {
  const bracket = bracketIn.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m })) }))
  const matches = matchesIn.slice()
  const byId = new Map<string, BracketMatch>()
  for (const r of bracket) for (const bm of r.matches) byId.set(bm.id, bm)
  const roundOf = new Map<string, BracketRound>()
  for (const r of bracket) for (const bm of r.matches) roundOf.set(bm.id, r)
  const findMatch = (id: string): Match | undefined => matches.find((m) => m.id === id)
  const decided = (bm: BracketMatch): boolean => bm.winnerId != null || bm.bye === true
  const resolve = (feed: { bm: string; take: 'winner' | 'loser' }): { ready: boolean; id: string | null } => {
    const s = byId.get(feed.bm)
    if (!s || !decided(s)) return { ready: false, id: null }
    return { ready: true, id: feed.take === 'winner' ? s.winnerId : (s.loserId ?? null) }
  }

  let changed = true
  let guard = 0
  while (changed && guard < 80) {
    changed = false
    guard++
    // 1) registra vencedor/perdedor dos confrontos já jogados
    for (const bm of byId.values()) {
      if (!decided(bm) && bm.matchId) {
        const m = findMatch(bm.matchId)
        if (m?.played) {
          const w = m.winnerId ?? (m.homeScore > m.awayScore ? m.homeId : m.awayId)
          bm.winnerId = w
          bm.loserId = w === bm.homeId ? bm.awayId : bm.homeId
          changed = true
        }
      }
    }
    // 2) resolve origens → times, byes e cria as partidas
    for (const bm of byId.values()) {
      if (decided(bm) || bm.matchId) continue
      if (!bm.homeFrom && !bm.awayFrom) continue
      // reset da grande final: só se o desafiante (visitante) venceu o confronto original
      if (bm.resetOf) {
        const g1 = byId.get(bm.resetOf)
        if (!g1 || g1.winnerId == null) continue
        if (g1.winnerId !== g1.awayId) continue
      }
      const h = bm.homeFrom ? resolve(bm.homeFrom) : { ready: true, id: bm.homeId }
      const a = bm.awayFrom ? resolve(bm.awayFrom) : { ready: true, id: bm.awayId }
      if (!h.ready || !a.ready) continue
      bm.homeId = h.id
      bm.awayId = a.id
      if (h.id && a.id) {
        const stage = roundOf.get(bm.id)?.name ?? 'Mata-mata'
        const m = mkMatch(h.id, a.id, bm.roundIndex, stage)
        bm.matchId = m.id
        matches.push(m)
        changed = true
      } else if (h.id && !a.id) {
        bm.winnerId = h.id
        bm.bye = true
        changed = true
      } else if (!h.id && a.id) {
        bm.winnerId = a.id
        bm.bye = true
        changed = true
      } else {
        bm.bye = true
        changed = true
      }
    }
  }

  // campeão: grande final (com reset)
  let champion: string | undefined
  const gf2 = [...byId.values()].find((bm) => bm.resetOf)
  const gf1 = gf2 ? byId.get(gf2.resetOf!) : undefined
  if (gf1 && gf1.winnerId) {
    if (gf1.winnerId === gf1.homeId) champion = gf1.winnerId // campeão dos winners fechou
    else if (gf2 && gf2.winnerId) champion = gf2.winnerId // desafiante venceu → decidiu no reset
  }
  return { bracket, matches, champion }
}

/** ids de todas as partidas reais da chave de eliminação */
export function elimMatchIds(bracket: BracketRound[]): Set<string> {
  const set = new Set<string>()
  for (const r of bracket) for (const bm of r.matches) if (bm.matchId) set.add(bm.matchId)
  return set
}

/** partidas prontas para jogar agora (ambos os lados definidos e não jogadas) */
export function readyElimMatches(t: { bracket?: BracketRound[]; matches: Match[] }): string[] {
  if (!t.bracket) return []
  const ids: string[] = []
  for (const r of t.bracket) {
    for (const bm of r.matches) {
      if (bm.winnerId || !bm.matchId) continue
      const m = t.matches.find((x) => x.id === bm.matchId)
      if (m && !m.played) ids.push(m.id)
    }
  }
  return ids
}

/** número de "vidas" do formato de eliminação */
export function elimLives(format: string): 2 | 3 {
  return format === 'triple-elim' ? 3 : 2
}
