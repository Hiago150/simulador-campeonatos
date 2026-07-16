// Profundidade da Temporada — tudo DERIVADO dos dados que o motor já guarda
// (years[].champions/scorers/records/slotRankings/tournaments/teamStrengths):
// arcos narrados do ano, prêmios de fim de ano, ídolos da era, confrontos
// históricos, perfil de clube e série de evolução de força. Nada aqui persiste
// texto — regenerar é sempre possível a partir do estado salvo.
import type { Match, Season, SeasonYearEntry, Tournament } from '../types'
import { excitement, winnerOf } from './narration'

const isEsports = (s: Season): boolean => s.sport === 'esports'

function poolName(s: Season, id: string): string {
  return s.teamPool.find((t) => t.id === id)?.name ?? id
}

// ─────────────────────────── Arcos do ano ───────────────────────────────────

export interface YearArc {
  kind: 'dynasty' | 'upset-champion' | 'invincible' | 'giant-fall' | 'dominant-scorer' | 'relegation-drama'
  title: string
  text: string
}

/** partidas de um time num torneio salvo, com vitória/derrota na perspectiva dele */
function teamRecordIn(t: Tournament, teamId: string): { played: number; wins: number; losses: number } {
  let played = 0
  let wins = 0
  let losses = 0
  for (const m of t.matches) {
    if (!m.played || (m.homeId !== teamId && m.awayId !== teamId)) continue
    played++
    const w = winnerOf(m)
    if (w === teamId) wins++
    else if (w) losses++
  }
  return { played, wins, losses }
}

/**
 * Retrospecto narrado de um ano — derivado na hora (não persiste texto).
 * Máximo ~5 arcos, do mais forte pro mais fraco.
 */
export function yearArcs(season: Season, entry: SeasonYearEntry): YearArc[] {
  const out: YearArc[] = []
  const esports = isEsports(season)
  const prevYears = season.years.filter((y) => y.year < entry.year).sort((a, b) => b.year - a.year)

  // Dinastia: campeão do mesmo slot em anos consecutivos (streak >= 2)
  let bestStreak: { teamName: string; slotName: string; streak: number } | null = null
  for (const c of entry.champions) {
    let streak = 1
    for (const py of prevYears) {
      const prev = py.champions.find((x) => x.slotId === c.slotId)
      if (prev && prev.teamId === c.teamId) streak++
      else break
    }
    if (streak >= 2 && (!bestStreak || streak > bestStreak.streak)) {
      bestStreak = { teamName: c.teamName, slotName: c.slotName, streak }
    }
  }
  if (bestStreak) {
    out.push({
      kind: 'dynasty',
      title: `Dinastia em curso`,
      text: `${bestStreak.teamName} conquistou o ${bestStreak.slotName} pela ${bestStreak.streak}ª vez seguida.`
    })
  }

  // Azarão campeão: campeão entre os 40% mais fracos do elenco do campeonato
  for (const c of entry.champions) {
    const t = entry.tournaments?.[c.slotId]
    if (!t || t.teams.length < 6) continue
    const byStrength = [...t.teams].sort((a, b) => b.strength - a.strength)
    const pos = byStrength.findIndex((x) => x.id === c.teamId)
    if (pos >= Math.ceil(byStrength.length * 0.6)) {
      out.push({
        kind: 'upset-champion',
        title: 'Azarão campeão',
        text: `${c.teamName} desafiou a lógica: ${pos + 1}º em força entre ${t.teams.length} participantes, terminou com o título do ${c.slotName}.`
      })
      break // um azarão por ano basta
    }
  }

  // Campanha invicta/perfeita do campeão
  for (const c of entry.champions) {
    const t = entry.tournaments?.[c.slotId]
    if (!t) continue
    const rec = teamRecordIn(t, c.teamId)
    if (rec.played >= 5 && rec.losses === 0) {
      const perfect = rec.wins === rec.played
      out.push({
        kind: 'invincible',
        title: perfect ? 'Campanha perfeita' : 'Campanha invicta',
        text: perfect
          ? `${c.teamName} venceu todas as ${rec.played} partidas do ${c.slotName}.`
          : `${c.teamName} atravessou o ${c.slotName} sem perder (${rec.wins} vitórias em ${rec.played} jogos).`
      })
      break
    }
  }

  // Queda do gigante: campeão do ano anterior fora do top 4 do mesmo slot
  const prev = prevYears[0]
  if (prev) {
    for (const pc of prev.champions) {
      const ranking = entry.slotRankings?.[pc.slotId]
      if (!ranking || ranking.length < 8) continue
      const pos = ranking.indexOf(pc.teamId)
      if (pos >= 4) {
        out.push({
          kind: 'giant-fall',
          title: 'Queda do gigante',
          text: `${pc.teamName}, campeão do ${pc.slotName} no ano passado, despencou pra ${pos + 1}ª posição.`
        })
        break
      }
    }
  }

  // Artilheiro/abatedor dominante: 1º com folga sobre o 2º
  const sorted = [...entry.scorers].sort((a, b) => (esports ? b.kills - a.kills : b.goals - a.goals))
  const [first, second] = sorted
  const val = (x: typeof first) => (esports ? x.kills : x.goals)
  if (first && second && val(second) > 0 && val(first) >= val(second) * 1.5) {
    out.push({
      kind: 'dominant-scorer',
      title: esports ? 'Máquina de abates' : 'Artilheiro implacável',
      text: `${first.name} (${first.teamName}) dominou o ano: ${val(first)} ${esports ? 'abates' : 'gols'}, contra ${val(second)} do segundo colocado.`
    })
  }

  // Rebaixamento dramático: time com título na era caindo de divisão
  for (const mv of entry.movements ?? []) {
    if (mv.kind === 'relegation' && (season.allTimeWins[mv.teamId] ?? 0) > 0) {
      out.push({
        kind: 'relegation-drama',
        title: 'Gigante rebaixado',
        text: `${mv.teamName}, dono de ${season.allTimeWins[mv.teamId]} título(s) na era, caiu do ${mv.fromSlotName} pro ${mv.toSlotName}.`
      })
      break
    }
  }

  return out.slice(0, 5)
}

// ─────────────────────────── Prêmios do ano ─────────────────────────────────

export interface YearAwards {
  playerOfYear?: { playerId: string; name: string; teamId: string; teamName: string; line: string }
  teamOfYear?: { teamId: string; teamName: string; line: string }
  topScorer?: { playerId: string; name: string; teamId: string; teamName: string; value: number; unit: string }
  upsetOfYear?: { slotName: string; winner: string; loser: string; gap: number; score: string }
  gameOfYear?: { slotName: string; label: string; reason: string }
}

function scoreText(m: Match): string {
  let s = `${m.homeScore}–${m.awayScore}`
  if (m.penalties) s += ` (${m.penalties[0]}–${m.penalties[1]} pên.)`
  return s
}

/**
 * Prêmios de fim de ano — critério simples e explicável (decisão de design):
 * título pesa mais, o resto desempata; sem tabela de pontos artificial.
 */
export function yearAwards(season: Season, entry: SeasonYearEntry): YearAwards {
  const esports = isEsports(season)
  const out: YearAwards = {}
  const championTeams = new Set(entry.champions.map((c) => c.teamId))

  // Artilheiro/abatedor do ano
  const sorted = [...entry.scorers].sort((a, b) => (esports ? b.kills - a.kills : b.goals - a.goals))
  const top = sorted[0]
  if (top) {
    out.topScorer = {
      playerId: top.playerId,
      name: top.name,
      teamId: top.teamId,
      teamName: top.teamName,
      value: esports ? top.kills : top.goals,
      unit: esports ? 'abates' : 'gols'
    }
  }

  // Jogador do ano — e-sports: MVPs > abates > título do time;
  // futebol: gols > título do time (não há MVP por partida no futebol)
  if (esports) {
    const mvps = Object.entries(entry.records?.mvpCounts ?? {}).map(([playerId, v]) => ({ playerId, ...v }))
    const killsOf = (pid: string) => entry.scorers.find((s) => s.playerId === pid)?.kills ?? 0
    mvps.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      const kd = killsOf(b.playerId) - killsOf(a.playerId)
      if (kd !== 0) return kd
      return Number(championTeams.has(b.teamId)) - Number(championTeams.has(a.teamId))
    })
    const p = mvps[0]
    if (p) {
      out.playerOfYear = {
        playerId: p.playerId,
        name: p.name,
        teamId: p.teamId,
        teamName: p.teamName,
        line: `${p.count} MVP${p.count > 1 ? 's' : ''} · ${killsOf(p.playerId)} abates${championTeams.has(p.teamId) ? ' · campeão no ano' : ''}`
      }
    }
  } else if (top) {
    const tied = sorted.filter((s) => s.goals === top.goals)
    const pick = tied.find((s) => championTeams.has(s.teamId)) ?? top
    out.playerOfYear = {
      playerId: pick.playerId,
      name: pick.name,
      teamId: pick.teamId,
      teamName: pick.teamName,
      line: `${pick.goals} gols${championTeams.has(pick.teamId) ? ' · campeão no ano' : ''}`
    }
  }

  // Time do ano: mais títulos; desempate por campanha média nos campeonatos disputados
  const titleCount: Record<string, number> = {}
  for (const c of entry.champions) titleCount[c.teamId] = (titleCount[c.teamId] ?? 0) + 1
  const avgCampaign = (teamId: string): number => {
    let sum = 0
    let n = 0
    for (const ranking of Object.values(entry.slotRankings ?? {})) {
      const pos = ranking.indexOf(teamId)
      if (pos >= 0) {
        sum += (pos + 1) / ranking.length
        n++
      }
    }
    return n ? sum / n : 1
  }
  const teams = Object.entries(titleCount).sort(([a, ta], [b, tb]) => tb - ta || avgCampaign(a) - avgCampaign(b))
  const [bestTeam] = teams
  if (bestTeam) {
    const [teamId, titles] = bestTeam
    out.teamOfYear = {
      teamId,
      teamName: poolName(season, teamId),
      line: `${titles} título${titles > 1 ? 's' : ''} no ano`
    }
  }

  // Zebra e Jogo do Ano: o mais extremo entre TODOS os campeonatos do ano,
  // reaproveitando os mesmos critérios já usados por campeonato
  let bestGap = 2
  let bestExc = -1
  for (const [slotId, t] of Object.entries(entry.tournaments ?? {})) {
    const slotName = entry.champions.find((c) => c.slotId === slotId)?.slotName ?? t.name
    const strengthOfT = (id: string | null) => t.teams.find((x) => x.id === id)?.strength ?? 50
    const nameOfT = (id: string | null) => t.teams.find((x) => x.id === id)?.name ?? '—'
    for (const m of t.matches) {
      if (!m.played) continue
      const w = winnerOf(m)
      if (w) {
        const loserId = w === m.homeId ? m.awayId : m.homeId
        const gap = strengthOfT(loserId) - strengthOfT(w)
        if (gap > bestGap) {
          bestGap = gap
          const home = w === m.homeId
          const score = `${home ? m.homeScore : m.awayScore}–${home ? m.awayScore : m.homeScore}`
          out.upsetOfYear = { slotName, winner: nameOfT(w), loser: nameOfT(loserId), gap: Math.round(gap), score }
        }
      }
      const exc = excitement(m)
      if (exc > bestExc) {
        bestExc = exc
        const reason = m.penalties
          ? 'decidido nos pênaltis'
          : m.football
            ? `${m.homeScore + m.awayScore} gols`
            : 'série pegada'
        out.gameOfYear = { slotName, label: `${nameOfT(m.homeId)} ${scoreText(m)} ${nameOfT(m.awayId)}`, reason }
      }
    }
  }

  return out
}

// ─────────────────────────── Ídolos da era ──────────────────────────────────

export interface IdolEntry {
  playerId: string
  name: string
  teamId: string
  teamName: string
  goals: number
  kills: number
  mvps: number
  /** títulos do time do jogador na era (elencos não mudam de clube) */
  titles: number
  bestYear?: { year: number; value: number }
  perYear: Array<{ year: number; value: number }>
}

export function eraIdols(season: Season): IdolEntry[] {
  const esports = isEsports(season)
  const mvpsOf = (pid: string) => season.records?.mvpCounts?.[pid]?.count ?? 0
  const out: IdolEntry[] = season.allTimeScorers.map((s) => {
    const perYear = season.years
      .map((y) => {
        const e = y.scorers.find((x) => x.playerId === s.playerId)
        return { year: y.year, value: e ? (esports ? e.kills : e.goals) : 0 }
      })
      .filter((x) => x.value > 0)
    const bestYear = [...perYear].sort((a, b) => b.value - a.value)[0]
    return {
      playerId: s.playerId,
      name: s.name,
      teamId: s.teamId,
      teamName: s.teamName,
      goals: s.goals,
      kills: s.kills,
      mvps: mvpsOf(s.playerId),
      titles: season.allTimeWins[s.teamId] ?? 0,
      bestYear,
      perYear
    }
  })
  return out.sort((a, b) => (esports ? b.kills - a.kills : b.goals - a.goals))
}

// ─────────────────────── Confrontos históricos da era ───────────────────────

export interface H2HEntry {
  aId: string
  bId: string
  aName: string
  bName: string
  games: number
  aWins: number
  bWins: number
  draws: number
  /** placar agregado (gols ou mapas) */
  aScore: number
  bScore: number
}

export function eraHeadToHead(season: Season, minGames = 2): H2HEntry[] {
  const acc = new Map<string, H2HEntry>()
  for (const y of season.years) {
    for (const t of Object.values(y.tournaments ?? {})) {
      for (const m of t.matches) {
        if (!m.played) continue
        const [aId, bId] = [m.homeId, m.awayId].sort()
        const key = `${aId}|${bId}`
        let e = acc.get(key)
        if (!e) {
          e = {
            aId,
            bId,
            aName: poolName(season, aId),
            bName: poolName(season, bId),
            games: 0,
            aWins: 0,
            bWins: 0,
            draws: 0,
            aScore: 0,
            bScore: 0
          }
          acc.set(key, e)
        }
        e.games++
        const w = winnerOf(m)
        if (w === e.aId) e.aWins++
        else if (w === e.bId) e.bWins++
        else e.draws++
        e.aScore += m.homeId === e.aId ? m.homeScore : m.awayScore
        e.bScore += m.homeId === e.bId ? m.homeScore : m.awayScore
      }
    }
  }
  return [...acc.values()].filter((e) => e.games >= minGames).sort((a, b) => b.games - a.games)
}

// ─────────────────────────── Perfil do clube ────────────────────────────────

export interface ClubProfile {
  teamId: string
  titles: Array<{ slotName: string; count: number; years: number[] }>
  /** campanha por ano: colocação em cada campeonato disputado */
  campaigns: Array<{ year: number; entries: Array<{ slotName: string; pos: number; of: number }> }>
  /** maiores artilheiros/abatedores do clube na era */
  idols: IdolEntry[]
  /** força ao fim de cada ano fechado (quando a foto existe) */
  strengthHistory: Array<{ year: number; strength: number }>
}

export function clubProfile(season: Season, teamId: string): ClubProfile {
  // títulos agrupados por campeonato
  const titleMap = new Map<string, { count: number; years: number[] }>()
  for (const y of season.years) {
    for (const c of y.champions) {
      if (c.teamId !== teamId) continue
      const e = titleMap.get(c.slotName) ?? { count: 0, years: [] }
      e.count++
      e.years.push(y.year)
      titleMap.set(c.slotName, e)
    }
  }
  const titles = [...titleMap.entries()]
    .map(([slotName, v]) => ({ slotName, ...v }))
    .sort((a, b) => b.count - a.count)

  const slotName = (id: string) => season.slots.find((s) => s.id === id)?.name ?? id
  const campaigns = season.years
    .map((y) => ({
      year: y.year,
      entries: Object.entries(y.slotRankings ?? {})
        .map(([sid, ranking]) => ({ slotName: slotName(sid), pos: ranking.indexOf(teamId) + 1, of: ranking.length }))
        .filter((e) => e.pos > 0)
    }))
    .filter((y) => y.entries.length > 0)
    .sort((a, b) => b.year - a.year)

  const idols = eraIdols(season).filter((i) => i.teamId === teamId).slice(0, 5)

  const strengthHistory = season.years
    .filter((y) => y.teamStrengths?.[teamId] != null)
    .map((y) => ({ year: y.year, strength: y.teamStrengths![teamId] }))
    .sort((a, b) => a.year - b.year)

  return { teamId, titles, campaigns, idols, strengthHistory }
}

// ─────────────────────── Evolução da era (gráfico) ──────────────────────────

export interface EraStrengthSeries {
  years: number[]
  series: Array<{ teamId: string; name: string; color: string; values: Array<number | null> }>
}

/** série de força por ano (só anos fechados com foto) dos times mais titulados */
export function eraStrengthSeries(season: Season, maxTeams = 8): EraStrengthSeries {
  const years = season.years
    .filter((y) => y.teamStrengths && Object.keys(y.teamStrengths).length > 0)
    .map((y) => y.year)
    .sort((a, b) => a - b)

  // times em destaque: mais títulos na era; completa com os mais fortes do pool
  const byTitles = Object.entries(season.allTimeWins)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id)
  const picked: string[] = [...byTitles]
  for (const t of [...season.teamPool].sort((a, b) => b.strength - a.strength)) {
    if (picked.length >= maxTeams) break
    if (!picked.includes(t.id)) picked.push(t.id)
  }

  const series = picked.slice(0, maxTeams).map((teamId) => {
    const team = season.teamPool.find((t) => t.id === teamId)
    return {
      teamId,
      name: team?.name ?? teamId,
      color: team?.color ?? '#888',
      values: years.map((yr) => season.years.find((y) => y.year === yr)?.teamStrengths?.[teamId] ?? null)
    }
  })

  return { years, series }
}
