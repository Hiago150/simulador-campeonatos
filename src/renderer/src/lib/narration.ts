// Narração & destaques — gera, a partir dos dados da simulação, o feed de lances
// de uma partida, as manchetes/destaques de uma rodada e o resumo de um torneio.
// Tom misto: fatos sóbrios, manchetes mais soltas.
import type { Match, Team, Tournament } from '../types'

const nameOf = (teams: Record<string, Team>, id: string | null | undefined): string =>
  (id ? teams[id]?.name : undefined) ?? '—'

const strengthOf = (teams: Record<string, Team>, id: string | null | undefined): number =>
  (id ? teams[id]?.strength : undefined) ?? 50

/** vencedor de uma partida jogada (id) ou null em empate sem decisão */
function winnerOf(m: Match): string | null {
  if (m.winnerId) return m.winnerId
  if (m.homeScore > m.awayScore) return m.homeId
  if (m.awayScore > m.homeScore) return m.awayId
  return null
}

// ─────────────────────────── Feed de lances (partida) ───────────────────────

export interface Moment {
  icon: string
  text: string
  minute?: number
  tone: 'goal' | 'card' | 'info' | 'map' | 'play'
  /** destaque visual: 'ace' (jogada brilhante, verde) | 'decisive' (mudou o jogo, vermelho) */
  highlight?: 'ace' | 'decisive'
}

export function matchMoments(m: Match, teams: Record<string, Team>): Moment[] {
  const home = nameOf(teams, m.homeId)
  const away = nameOf(teams, m.awayId)
  const out: Moment[] = []

  if (m.football) {
    let h = 0
    let a = 0
    let leader = 0 // quem lidera agora: 1 mandante, -1 visitante, 0 empate
    let homeTrailed = false
    let awayTrailed = false
    const goalMoments: { moment: Moment; scorerIsHome: boolean; nthOfScorer: number }[] = []
    for (const g of [...m.football.goals].sort((x, y) => x.minute - y.minute)) {
      const homeGoal = g.teamId === m.homeId
      if (homeGoal) h++
      else a++
      if (h < a) homeTrailed = true
      if (a < h) awayTrailed = true
      const newLeader = Math.sign(h - a)
      // virada: o gol coloca na frente um time que já esteve atrás no placar
      const virada =
        (newLeader === 1 && leader !== 1 && homeTrailed) ||
        (newLeader === -1 && leader !== -1 && awayTrailed)
      leader = newLeader
      const moment: Moment = {
        minute: g.minute,
        icon: g.ownGoal ? '🔴' : '⚽',
        tone: 'goal',
        highlight: virada ? 'decisive' : undefined,
        text: `${g.minute}' ${g.playerName}${g.ownGoal ? ' (contra)' : ''} — ${home} ${h}–${a} ${away}${
          virada ? ' · virada!' : ''
        }`
      }
      goalMoments.push({ moment, scorerIsHome: homeGoal, nthOfScorer: homeGoal ? h : a })
      out.push(moment)
    }
    // gol do título: sem pênaltis, o (perdedor+1)-ésimo gol do vencedor é o que decide
    if (!m.penalties && h !== a) {
      const homeWon = h > a
      const loserGoals = homeWon ? a : h
      const winning = goalMoments.find(
        (gm) => gm.scorerIsHome === homeWon && gm.nthOfScorer === loserGoals + 1
      )
      if (winning) winning.moment.highlight = 'decisive'
    }
    const [hr, ar] = m.football.red
    if (hr > 0) out.push({ icon: '🟥', tone: 'card', text: `${home} terminou com ${11 - hr} em campo` })
    if (ar > 0) out.push({ icon: '🟥', tone: 'card', text: `${away} terminou com ${11 - ar} em campo` })
    if (m.extraTime) out.push({ icon: '⏱️', tone: 'info', text: 'Empate no tempo normal — foi para a prorrogação' })
    if (m.penalties) {
      const w = m.penalties[0] > m.penalties[1] ? home : away
      out.push({ icon: '🥅', tone: 'info', text: `Pênaltis: ${m.penalties[0]}–${m.penalties[1]} para ${w}` })
    }
    if (out.length === 0) out.push({ icon: '😴', tone: 'info', text: 'Jogo truncado, sem gols.' })
    return out
  }

  if (m.esports) {
    const e = m.esports
    e.maps.forEach((mp, i) => {
      const winnerName = mp.home > mp.away ? home : away
      const min = Math.min(mp.home, mp.away)
      const flavor = mp.overtime ? ' · prorrogação' : min <= 4 ? ' · atropelo' : min >= 11 ? ' · no detalhe' : ''
      const closesSeries = i === e.maps.length - 1 // o último mapa fecha a série
      out.push({
        icon: '🗺️',
        tone: 'map',
        highlight: closesSeries || mp.overtime ? 'decisive' : undefined,
        text: `Mapa ${i + 1} · ${mp.name}: ${mp.home}–${mp.away} (${winnerName})${flavor}${
          closesSeries ? ' · fecha a série' : ''
        }`
      })
    })
    // lances de sabor (o app não simula round a round — são plausíveis)
    const top = [...e.lines].sort((x, y) => y.kills - x.kills)[0]
    if (top) {
      const topTeam = nameOf(teams, top.teamId)
      out.push({ icon: '🔫', tone: 'play', text: `${top.name} (${topTeam}) explodiu com ${top.kills} abates` })
      if (top.kills - top.deaths >= 15)
        out.push({ icon: '💥', tone: 'play', highlight: 'ace', text: `Ace decisivo de ${top.name}` })
    }
    const tightMap = e.maps.find((mp) => Math.min(mp.home, mp.away) >= 11)
    if (tightMap)
      out.push({ icon: '🎯', tone: 'play', highlight: 'ace', text: `Clutch no ${tightMap.name} decidiu a parada` })
    if (e.mvp) {
      out.push({
        icon: '🏅',
        tone: 'info',
        text: `MVP da série: ${e.mvp.name} (${e.mvp.kills}/${e.mvp.deaths}/${e.mvp.assists})`
      })
    }
    return out
  }

  return out
}

// ──────────── Resumo para compartilhar (e-sports): opções de destaque ────────
// Frases neutras e factuais, uma por linha, citando jogador + mapa + ação —
// só a partir de dados que a série realmente tem (sem inventar round/mapa).

export function esportsHighlightOptions(m: Match, teams: Record<string, Team>): string[] {
  if (!m.esports || !m.played) return []
  const e = m.esports
  const home = nameOf(teams, m.homeId)
  const away = nameOf(teams, m.awayId)
  const out: string[] = []

  e.maps.forEach((mp, i) => {
    if (mp.overtime) {
      const winner = mp.home > mp.away ? home : away
      const [hi, lo] = [Math.max(mp.home, mp.away), Math.min(mp.home, mp.away)]
      out.push(`O Mapa ${i + 1} (${mp.name}) foi decidido na prorrogação: ${winner} levou por ${hi}–${lo}.`)
    }
    if (!mp.lines || mp.lines.length === 0) return
    const top = [...mp.lines].sort((a, b) => b.kills - a.kills)[0]
    const teamName = top.teamId === m.homeId ? home : away
    const isAce = top.kills - top.deaths >= 15
    out.push(
      isAce
        ? `No Mapa ${i + 1} (${mp.name}), ${top.name} (${teamName}) fechou com um ace: ${top.kills} abates e ${top.deaths} mortes.`
        : `No Mapa ${i + 1} (${mp.name}), ${top.name} (${teamName}) liderou os abates: ${top.kills}/${top.deaths}/${top.assists}.`
    )
  })

  const last = e.maps[e.maps.length - 1]
  if (last) {
    const winner = last.home > last.away ? home : away
    const [hi, lo] = [Math.max(last.home, last.away), Math.min(last.home, last.away)]
    out.push(`O Mapa ${e.maps.length} (${last.name}) fechou a série: ${winner} venceu por ${hi}–${lo}.`)
  }

  if (e.mvp) {
    const mvpTeam = e.mvp.teamId === m.homeId ? home : away
    out.push(
      `${e.mvp.name} (${mvpTeam}) foi o MVP da série, somando ${e.mvp.kills}/${e.mvp.deaths}/${e.mvp.assists} em ${e.maps.length} mapa(s).`
    )
  }

  return out
}

// ─────────────────── Destaques de uma rodada (zebra + jogo) ──────────────────

export interface RoundHighlight {
  headline: string
  zebra?: { matchId: string; winner: string; loser: string; gap: number; score: string }
  bestGame?: { matchId: string; label: string; reason: string }
}

function scoreText(m: Match): string {
  let s = `${m.homeScore}–${m.awayScore}`
  if (m.penalties) s += ` (${m.penalties[0]}–${m.penalties[1]} pên.)`
  return s
}

/** placar na perspectiva de um time (ex.: vencedor primeiro) */
function scoreFrom(m: Match, teamId: string): string {
  const home = teamId === m.homeId
  let s = `${home ? m.homeScore : m.awayScore}–${home ? m.awayScore : m.homeScore}`
  if (m.penalties) {
    const p = home ? m.penalties : [m.penalties[1], m.penalties[0]]
    s += ` (${p[0]}–${p[1]} pên.)`
  }
  return s
}

function excitement(m: Match): number {
  if (m.football) {
    const total = m.homeScore + m.awayScore
    const margin = Math.abs(m.homeScore - m.awayScore)
    return total * 2 - margin + (m.penalties ? 6 : 0) + (m.extraTime ? 3 : 0)
  }
  if (m.esports) {
    const bestOf = m.esports.bestOf
    const totalRounds = m.esports.maps.reduce((s, mp) => s + mp.home + mp.away, 0)
    const decider = bestOf > 1 && m.esports.maps.length >= bestOf ? 6 : 0
    return totalRounds / 6 + decider
  }
  return 0
}

export function roundHighlights(
  matchIds: string[],
  allMatches: Match[],
  teams: Record<string, Team>
): RoundHighlight | null {
  const ms = allMatches.filter((m) => matchIds.includes(m.id) && m.played)
  if (ms.length === 0) return null

  // maior zebra: favorito derrotado pela maior diferença de força
  let zebra: RoundHighlight['zebra']
  let zebraGap = 2 // só conta se a diferença for relevante
  for (const m of ms) {
    const w = winnerOf(m)
    if (!w) continue
    const loserId = w === m.homeId ? m.awayId : m.homeId
    const gap = strengthOf(teams, loserId) - strengthOf(teams, w)
    if (gap > zebraGap) {
      zebraGap = gap
      zebra = {
        matchId: m.id,
        winner: nameOf(teams, w),
        loser: nameOf(teams, loserId),
        gap: Math.round(gap),
        score: scoreFrom(m, w) // placar na ordem vencedor–perdedor
      }
    }
  }

  // jogo mais emocionante
  let bestGame: RoundHighlight['bestGame']
  let bestScore = -1
  for (const m of ms) {
    const e = excitement(m)
    if (e > bestScore) {
      bestScore = e
      const reason = m.penalties
        ? 'decidido nos pênaltis'
        : m.football
          ? `${m.homeScore + m.awayScore} gols`
          : 'série pegada'
      bestGame = {
        matchId: m.id,
        label: `${nameOf(teams, m.homeId)} ${scoreText(m)} ${nameOf(teams, m.awayId)}`,
        reason
      }
    }
  }

  // manchete (tom solto)
  let headline = 'Rodada movimentada no campeonato.'
  if (zebra && zebra.gap >= 8) headline = `ZEBRA! ${zebra.winner} derruba o favorito ${zebra.loser}.`
  else if (zebra) headline = `Surpresa: ${zebra.winner} bate ${zebra.loser}.`
  else {
    const goleada = ms
      .map((m) => ({ m, margin: Math.abs(m.homeScore - m.awayScore) }))
      .sort((a, b) => b.margin - a.margin)[0]
    if (goleada && goleada.margin >= 3 && goleada.m.football) {
      const w = winnerOf(goleada.m)
      headline = `${nameOf(teams, w)} não teve pena: ${scoreText(goleada.m)}.`
    } else {
      headline = 'Favoritos cumpriram o esperado na rodada.'
    }
  }

  return { headline, zebra, bestGame }
}

// ─────────────────────────── Resumo do torneio ──────────────────────────────

export interface TournamentNarration {
  headline: string
  text: string
  zebra?: RoundHighlight['zebra']
  bestGame?: RoundHighlight['bestGame']
  topScorer?: { name: string; team: string; value: number; unit: string }
}

export function tournamentSummary(t: Tournament, teams: Record<string, Team>): TournamentNarration | null {
  if (t.phase !== 'finished' || !t.champion) return null
  const champ = nameOf(teams, t.champion)
  const isEsports = t.sport === 'esports'

  // destaques sobre TODAS as partidas jogadas
  const allIds = t.matches.filter((m) => m.played).map((m) => m.id)
  const hi = roundHighlights(allIds, t.matches, teams)

  // artilheiro/abatedor do torneio
  const acc = new Map<string, { name: string; teamId: string; value: number }>()
  for (const m of t.matches) {
    if (!m.played) continue
    if (m.football) {
      for (const g of m.football.goals) {
        if (g.ownGoal) continue
        const cur = acc.get(g.playerId) ?? { name: g.playerName, teamId: g.teamId, value: 0 }
        cur.value++
        acc.set(g.playerId, cur)
      }
    } else if (m.esports) {
      for (const l of m.esports.lines) {
        const cur = acc.get(l.playerId) ?? { name: l.name, teamId: l.teamId, value: 0 }
        cur.value += l.kills
        acc.set(l.playerId, cur)
      }
    }
  }
  const top = [...acc.values()].sort((a, b) => b.value - a.value)[0]
  const topScorer = top
    ? { name: top.name, team: nameOf(teams, top.teamId), value: top.value, unit: isEsports ? 'abates' : 'gols' }
    : undefined

  const parts: string[] = [`${champ} é campeão!`]
  if (hi?.zebra && hi.zebra.gap >= 8) {
    parts.push(`A maior zebra foi ${hi.zebra.winner} batendo ${hi.zebra.loser} (${hi.zebra.score}).`)
  }
  if (topScorer) {
    parts.push(
      `${topScorer.name} (${topScorer.team}) terminou como ${isEsports ? 'maior abatedor' : 'artilheiro'} com ${topScorer.value} ${topScorer.unit}.`
    )
  }
  if (hi?.bestGame) parts.push(`Jogo do torneio: ${hi.bestGame.label} (${hi.bestGame.reason}).`)

  return {
    headline: `🏆 ${champ} levanta a taça!`,
    text: parts.join(' '),
    zebra: hi?.zebra,
    bestGame: hi?.bestGame,
    topScorer
  }
}
