// Modo Assistir — transforma uma partida JÁ simulada numa linha do tempo de
// eventos pra replay "ao vivo". Nada aqui re-simula ou inventa números novos:
// os gols usam os minutos reais; faltas/cartões/chances apenas POSICIONAM no
// tempo os totais que a partida já tem. Determinístico: mesma partida, mesma
// timeline (seed = id da partida).
import type { Match, Team } from '../types'

export interface PlaybackEvent {
  /** futebol: minuto do jogo; e-sports: passo abstrato da sequência */
  at: number
  kind:
    | 'kickoff'
    | 'half'
    | 'fulltime'
    | 'goal'
    | 'own-goal'
    | 'yellow'
    | 'red'
    | 'foul'
    | 'chance'
    | 'penalties'
    | 'map-start'
    | 'map-hot'
    | 'map-ot'
    | 'map-end'
    | 'ace'
    | 'clutch'
    | 'mvp'
  /** 0 = mandante, 1 = visitante (eventos de time) */
  side?: 0 | 1
  text: string
  highlight?: 'ace' | 'decisive'
  /** placar acumulado APÓS o evento (só em gols/fim de mapa) */
  score?: [number, number]
}

export interface Playback {
  kind: 'football' | 'esports'
  /** futebol: minutos (90 ou 120); e-sports: total de passos */
  duration: number
  events: PlaybackEvent[] // ordenados por `at`
}

// ── RNG determinístico (mulberry32 + hash do id) ─────────────────────────────
function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const nameOf = (teams: Record<string, Team>, id: string): string => teams[id]?.name ?? '—'

// ── Futebol: 90' (ou 120') com gols reais como âncora ────────────────────────
export function footballTimeline(m: Match, teams: Record<string, Team>): Playback {
  const f = m.football
  const duration = m.extraTime ? 120 : 90
  const events: PlaybackEvent[] = []
  if (!f) return { kind: 'football', duration, events }

  const rnd = mulberry32(hashSeed(m.id))
  const home = nameOf(teams, m.homeId)
  const away = nameOf(teams, m.awayId)
  const minuteIn = (from: number, to: number) => from + Math.floor(rnd() * (to - from + 1))

  events.push({ at: 0, kind: 'kickoff', text: 'Bola rolando!' })
  events.push({ at: 45, kind: 'half', text: 'Intervalo' })
  if (m.extraTime) events.push({ at: 90, kind: 'half', text: 'Fim do tempo normal — prorrogação' })

  // Gols: minutos REAIS da simulação; virada marcada como decisiva (igual aos Lances)
  let h = 0
  let a = 0
  let leader = 0
  let homeTrailed = false
  let awayTrailed = false
  for (const g of [...f.goals].sort((x, y) => x.minute - y.minute)) {
    const homeGoal = g.teamId === m.homeId
    if (homeGoal) h++
    else a++
    if (h < a) homeTrailed = true
    if (a < h) awayTrailed = true
    const newLeader = Math.sign(h - a)
    const virada =
      (newLeader === 1 && leader !== 1 && homeTrailed) || (newLeader === -1 && leader !== -1 && awayTrailed)
    leader = newLeader
    events.push({
      at: g.minute,
      kind: g.ownGoal ? 'own-goal' : 'goal',
      side: homeGoal ? 0 : 1,
      highlight: virada ? 'decisive' : undefined,
      score: [h, a],
      text: `GOL! ${g.playerName}${g.ownGoal ? ' (contra)' : ''} — ${home} ${h}–${a} ${away}${virada ? ' · virada!' : ''}`
    })
  }

  // Faltas/cartões/chances: POSICIONA no tempo os totais já simulados.
  // Chance clara = finalização no alvo que não virou gol.
  const sides: Array<{ side: 0 | 1; name: string }> = [
    { side: 0, name: home },
    { side: 1, name: away }
  ]
  for (const { side, name } of sides) {
    const goals = side === 0 ? h : a
    for (let i = 0; i < f.fouls[side]; i++)
      events.push({ at: minuteIn(2, duration - 1), kind: 'foul', side, text: `Falta de ${name}` })
    for (let i = 0; i < f.yellow[side]; i++)
      events.push({ at: minuteIn(15, duration - 1), kind: 'yellow', side, text: `Cartão amarelo para ${name}` })
    for (let i = 0; i < f.red[side]; i++)
      events.push({
        at: minuteIn(Math.min(48, duration - 2), duration - 1),
        kind: 'red',
        side,
        highlight: 'decisive',
        text: `EXPULSÃO! ${name} com um a menos`
      })
    const chances = Math.max(0, f.shotsOnTarget[side] - goals)
    for (let i = 0; i < chances; i++)
      events.push({ at: minuteIn(3, duration - 1), kind: 'chance', side, text: `Chance clara de ${name} — defesa!` })
  }

  if (m.penalties) {
    const w = m.penalties[0] > m.penalties[1] ? home : away
    events.push({
      at: duration,
      kind: 'penalties',
      highlight: 'decisive',
      text: `Pênaltis: ${m.penalties[0]}–${m.penalties[1]} para ${w}`
    })
  }
  events.push({ at: duration, kind: 'fulltime', text: `Fim de jogo — ${home} ${h}–${a} ${away}` })

  // ordena por minuto; empate de minuto mantém a ordem de inserção (sort estável)
  events.sort((x, y) => x.at - y.at)
  return { kind: 'football', duration, events }
}

// ── E-sports: ritmo por MAPA (o motor não simula round a round) ──────────────
const STEPS_PER_MAP = 10

export function esportsTimeline(m: Match, teams: Record<string, Team>): Playback {
  const e = m.esports
  const events: PlaybackEvent[] = []
  if (!e) return { kind: 'esports', duration: 1, events }

  const home = nameOf(teams, m.homeId)
  const away = nameOf(teams, m.awayId)
  let sh = 0
  let sa = 0

  e.maps.forEach((mp, i) => {
    const base = i * STEPS_PER_MAP
    events.push({ at: base, kind: 'map-start', text: `Mapa ${i + 1} · ${mp.name} — começou` })
    // destaque do mapa: quem mais matou NESTE mapa (dado real do KDA por mapa)
    const hot = mp.lines && [...mp.lines].sort((x, y) => y.kills - x.kills)[0]
    if (hot && hot.kills > 0) {
      events.push({
        at: base + 4,
        kind: 'map-hot',
        side: hot.teamId === m.homeId ? 0 : 1,
        text: `${hot.name} está quente: ${hot.kills} abates no ${mp.name}`
      })
    }
    // mapa apertado (dois lados com 11+ rounds) = clutch, igual aos Lances
    if (Math.min(mp.home, mp.away) >= 11 && !mp.overtime) {
      events.push({
        at: base + 7,
        kind: 'clutch',
        highlight: 'ace',
        text: `Clutch! ${mp.name} decidido no detalhe`
      })
    }
    if (mp.overtime) {
      events.push({
        at: base + 7,
        kind: 'map-ot',
        highlight: 'decisive',
        text: `${mp.name} foi para a prorrogação`
      })
    }
    const homeWon = mp.home > mp.away
    if (homeWon) sh++
    else sa++
    const closesSeries = i === e.maps.length - 1
    events.push({
      at: base + STEPS_PER_MAP - 1,
      kind: 'map-end',
      side: homeWon ? 0 : 1,
      highlight: closesSeries ? 'decisive' : undefined,
      score: [sh, sa],
      text: `${mp.name}: ${mp.home}–${mp.away} (${homeWon ? home : away})${closesSeries ? ' · fecha a série!' : ''}`
    })
  })

  const tail = e.maps.length * STEPS_PER_MAP
  const top = [...e.lines].sort((x, y) => y.kills - x.kills)[0]
  if (top && top.kills - top.deaths >= 15) {
    events.push({ at: tail, kind: 'ace', highlight: 'ace', text: `Ace decisivo de ${top.name}` })
  }
  if (e.mvp) {
    events.push({
      at: tail + 1,
      kind: 'mvp',
      text: `MVP da série: ${e.mvp.name} (${e.mvp.kills}/${e.mvp.deaths}/${e.mvp.assists})`
    })
  }

  events.sort((x, y) => x.at - y.at)
  return { kind: 'esports', duration: tail + 2, events }
}

/** timeline da partida no esporte certo (null se a partida não tem detalhe) */
export function matchTimeline(m: Match, teams: Record<string, Team>): Playback | null {
  if (m.football) return footballTimeline(m, teams)
  if (m.esports) return esportsTimeline(m, teams)
  return null
}
