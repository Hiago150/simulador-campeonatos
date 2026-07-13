import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { BestOf, Match, Sport, Team } from '../types'
import { Modal, StrengthBar } from './ui'
import { TeamBadge } from './TeamBadge'
import { cx } from '../lib/cx'
import { matchMoments, esportsHighlightOptions, type Moment } from '../lib/narration'
import { matchTimeline, type PlaybackEvent } from '../engine/playback'
import {
  Check, Copy, Crosshair, Dices, Flame, Goal, Hand, Info, Map as MapIcon, Pause, Play,
  Share2, Square, Star, Target, TrendingDown, TrendingUp, X, Zap
} from 'lucide-react'

/** ícone do lance: destaques ganham cor de acento (verde = brilho, vermelho = decisivo) */
function MomentIcon({ mo }: { mo: Moment }) {
  if (mo.highlight === 'ace')
    return <Star size={15} className="shrink-0 text-win-400" aria-label="Jogada de destaque" />
  if (mo.highlight === 'decisive')
    return <Flame size={15} className="shrink-0 text-blood-400" aria-label="Momento decisivo" />
  switch (mo.tone) {
    case 'goal':
      return <Goal size={15} className="shrink-0 text-zinc-300" />
    case 'card':
      return <Square size={13} className="mt-0.5 shrink-0 fill-blood-500 text-blood-500" />
    case 'map':
      return <MapIcon size={15} className="shrink-0 text-zinc-400" />
    case 'play':
      return <Zap size={15} className="shrink-0 text-zinc-300" />
    default:
      return <Info size={15} className="shrink-0 text-zinc-500" />
  }
}

// ─────────────────────────────── Modo Assistir ───────────────────────────────

/** ícone por tipo de evento do replay (mesma paleta dos Lances) */
function PlaybackIcon({ ev }: { ev: PlaybackEvent }) {
  switch (ev.kind) {
    case 'goal':
      return <Goal size={15} className="shrink-0 text-win-400" />
    case 'own-goal':
      return <Goal size={15} className="shrink-0 text-blood-400" />
    case 'yellow':
      return <Square size={13} className="shrink-0 fill-gold-500 text-gold-500" />
    case 'red':
      return <Square size={13} className="shrink-0 fill-blood-500 text-blood-500" />
    case 'foul':
      return <Hand size={14} className="shrink-0 text-zinc-500" />
    case 'chance':
      return <Target size={14} className="shrink-0 text-zinc-300" />
    case 'map-start':
      return <MapIcon size={15} className="shrink-0 text-zinc-400" />
    case 'map-end':
      return <MapIcon size={15} className="shrink-0 text-zinc-200" />
    case 'map-hot':
      return <Zap size={15} className="shrink-0 text-zinc-300" />
    case 'ace':
    case 'clutch':
      return <Star size={15} className="shrink-0 text-win-400" />
    case 'mvp':
      return <Crosshair size={15} className="shrink-0 text-gold-400" />
    case 'penalties':
    case 'map-ot':
      return <Flame size={15} className="shrink-0 text-blood-400" />
    default:
      return <Info size={15} className="shrink-0 text-zinc-500" />
  }
}

const SPEEDS = [1, 2, 4] as const
// velocidade-base do relógio por segundo real: futebol anda 2 min/s; e-sports 1 passo/s
const BASE_RATE = { football: 2, esports: 1 } as const

function PlaybackView({
  match,
  home,
  away,
  onExit
}: {
  match: Match
  home?: Team
  away?: Team
  onExit: () => void
}) {
  const teams: Record<string, Team> = {}
  if (home) teams[match.homeId] = home
  if (away) teams[match.awayId] = away
  const pb = useMemo(() => matchTimeline(match, teams), [match.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [clock, setClock] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)

  const duration = pb?.duration ?? 1
  const done = clock >= duration

  useEffect(() => {
    if (!playing || done || !pb) return
    const iv = setInterval(() => {
      setClock((c) => Math.min(c + BASE_RATE[pb.kind] * speed * 0.1, duration))
    }, 100)
    return () => clearInterval(iv)
  }, [playing, done, speed, duration, pb])

  if (!pb) return null

  const visible = pb.events.filter((e) => e.at <= clock)
  const score = [...visible].reverse().find((e) => e.score)?.score ?? [0, 0]
  const mapsTotal = match.esports?.maps.length ?? 0
  const clockLabel =
    pb.kind === 'football'
      ? `${Math.min(Math.floor(clock), duration)}'`
      : `Mapa ${Math.min(Math.floor(clock / 10) + 1, mapsTotal)} de ${mapsTotal}`

  return (
    <div>
      {/* Placar ao vivo — o placar final fica escondido durante o replay */}
      <div className="border-b border-white/5 bg-gradient-to-b from-blood-950/30 to-transparent px-6 pb-4 pt-6">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={cx('absolute inline-flex h-full w-full rounded-full bg-blood-500 opacity-75', !done && 'animate-ping')} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blood-500" />
          </span>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-blood-300">
            {done ? 'Replay encerrado' : 'Assistindo'} · {clockLabel}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 flex-col items-center gap-2">
            <TeamBadge team={home} size="lg" />
            <span className="text-center text-sm font-semibold text-zinc-200">{home?.name}</span>
          </div>
          <div className="heading tnum px-2 text-4xl font-bold text-white">
            {score[0]} <span className="text-zinc-600">:</span> {score[1]}
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <TeamBadge team={away} size="lg" />
            <span className="text-center text-sm font-semibold text-zinc-200">{away?.name}</span>
          </div>
        </div>

        {/* Progresso + controles */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => (done ? (setClock(0), setPlaying(true)) : setPlaying((p) => !p))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blood-600/60 bg-blood-950/40 text-blood-200 transition hover:bg-blood-900/40"
            aria-label={done ? 'Assistir de novo' : playing ? 'Pausar' : 'Continuar'}
          >
            {done || !playing ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
            <div className="h-full rounded-full bg-blood-500/80 transition-[width]" style={{ width: `${(clock / duration) * 100}%` }} />
          </div>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cx(
                'tnum rounded-full border px-2 py-0.5 text-[11px] font-semibold transition',
                speed === s ? 'border-blood-600 bg-blood-950/40 text-blood-200' : 'border-white/10 text-zinc-500 hover:text-zinc-200'
              )}
            >
              {s}x
            </button>
          ))}
          <button
            onClick={onExit}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:text-zinc-100"
            aria-label="Sair do replay"
            title="Sair do replay"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Feed ao vivo — evento mais recente no topo */}
      <div className="max-h-[45vh] space-y-1.5 overflow-y-auto px-6 py-4">
        {[...visible].reverse().map((ev, i) => (
          <motion.div
            key={`${ev.at}-${ev.kind}-${visible.length - i}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cx(
              'flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm',
              ev.highlight === 'ace'
                ? 'border-l-2 border-win-500 bg-win-950/40'
                : ev.highlight === 'decisive'
                  ? 'border-l-2 border-blood-500 bg-blood-950/25'
                  : ev.kind === 'goal' || ev.kind === 'map-end'
                    ? 'bg-ink-900/80'
                    : 'bg-ink-900/40'
            )}
          >
            <span className="tnum mt-0.5 w-8 shrink-0 text-right text-[11px] text-zinc-600">
              {pb.kind === 'football' ? `${ev.at}'` : ''}
            </span>
            <span className="mt-0.5 shrink-0">
              <PlaybackIcon ev={ev} />
            </span>
            <span
              className={cx(
                'leading-snug',
                ev.highlight || ev.kind === 'goal' ? 'font-medium text-zinc-100' : 'text-zinc-400'
              )}
            >
              {ev.text}
            </span>
          </motion.div>
        ))}
        {visible.length === 0 && <p className="px-3 py-2 text-xs text-zinc-600">Aquecimento…</p>}
      </div>
    </div>
  )
}

type MomentFilter = 'all' | 'ace' | 'decisive'

function MomentsFeed({ match, home, away }: { match: Match; home?: Team; away?: Team }) {
  const teams: Record<string, Team> = {}
  if (home) teams[match.homeId] = home
  if (away) teams[match.awayId] = away
  const moments = matchMoments(match, teams)
  const [filter, setFilter] = useState<MomentFilter>('all')
  if (moments.length === 0) return null

  const hasAce = moments.some((mo) => mo.highlight === 'ace')
  const hasDecisive = moments.some((mo) => mo.highlight === 'decisive')
  const shown = filter === 'all' ? moments : moments.filter((mo) => mo.highlight === filter)

  // chips que filtram E servem de legenda (cor ↔ significado)
  const chip = (value: MomentFilter, label: ReactNode, activeCls: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      className={cx(
        'flex min-h-[28px] items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition',
        filter === value ? activeCls : 'border-white/10 text-zinc-500 hover:text-zinc-200'
      )}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <p className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Lances</p>
        {(hasAce || hasDecisive) && chip('all', 'Tudo', 'border-white/30 bg-white/[0.06] text-zinc-100')}
        {hasAce &&
          chip(
            'ace',
            <>
              <Star size={11} className="text-win-400" /> Destaques
            </>,
            'border-win-700/60 bg-win-950/60 text-win-300'
          )}
        {hasDecisive &&
          chip(
            'decisive',
            <>
              <Flame size={11} className="text-blood-400" /> Decisivos
            </>,
            'border-blood-700/60 bg-blood-950/40 text-blood-300'
          )}
      </div>
      <div className="space-y-1.5">
        {shown.map((mo, i) => (
          <div
            key={i}
            title={
              mo.highlight === 'ace'
                ? 'Jogada de destaque'
                : mo.highlight === 'decisive'
                  ? 'Momento decisivo'
                  : undefined
            }
            className={cx(
              'flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm transition hover:bg-white/[0.04]',
              mo.highlight === 'ace'
                ? 'border-l-2 border-win-500 bg-win-950/40'
                : mo.highlight === 'decisive'
                  ? 'border-l-2 border-blood-500 bg-blood-950/25'
                  : 'bg-ink-900/50'
            )}
          >
            <span className="mt-0.5 shrink-0">
              <MomentIcon mo={mo} />
            </span>
            <span
              className={cx(
                'leading-snug',
                mo.highlight
                  ? 'font-medium text-zinc-100'
                  : mo.tone === 'goal' || mo.tone === 'play'
                    ? 'text-zinc-200'
                    : 'text-zinc-400'
              )}
            >
              {mo.text}
            </span>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="px-3 py-2 text-xs text-zinc-600">Nenhum lance nessa categoria.</p>
        )}
      </div>
    </div>
  )
}

/** bullets neutros (jogador + mapa + ação) prontos pra copiar e compartilhar fora do app */
function ShareSummary({ match, home, away }: { match: Match; home?: Team; away?: Team }) {
  const teams: Record<string, Team> = {}
  if (home) teams[match.homeId] = home
  if (away) teams[match.awayId] = away
  const options = esportsHighlightOptions(match, teams)
  const [open, setOpen] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  if (options.length === 0) return null

  const copy = async (text: string, i: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(i)
      setTimeout(() => setCopiedIdx((cur) => (cur === i ? null : cur)), 1500)
    } catch {
      // clipboard indisponível (ex.: contexto sem permissão) — ignora silenciosamente
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-ink-900/60">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Share2 size={15} className="shrink-0 text-zinc-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Resumo para compartilhar
        </span>
        <span className="ml-auto text-[11px] text-zinc-600">
          {open ? 'ocultar' : `${options.length} opções`}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 px-4 pb-4">
          {options.map((text, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-ink-950/50 px-3 py-2 text-sm text-zinc-300">
              <span className="flex-1 leading-snug">{text}</span>
              <button
                onClick={() => copy(text, i)}
                title="Copiar"
                className="mt-0.5 shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
              >
                {copiedIdx === i ? <Check size={14} className="text-win-400" /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1
  const hp = (home / total) * 100
  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="tnum font-bold text-zinc-200">
          {home}
          {suffix}
        </span>
        <span className="uppercase tracking-wide text-zinc-500">{label}</span>
        <span className="tnum font-bold text-zinc-200">
          {away}
          {suffix}
        </span>
      </div>
      <div className="flex h-1.5 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-ink-700">
          <div className="h-full rounded-full bg-blood-500/70" style={{ width: `${hp}%` }} />
        </div>
        <div className="flex flex-1 overflow-hidden rounded-full bg-ink-700">
          <div className="h-full rounded-full bg-zinc-500/70" style={{ width: `${100 - hp}%` }} />
        </div>
      </div>
    </div>
  )
}

export function MatchModal({
  match,
  home,
  away,
  sport,
  bestOf,
  form,
  onClose,
  onSimulate,
  seedLabels
}: {
  match: Match | null
  home?: Team
  away?: Team
  sport: Sport
  /** melhor-de-X — só faz sentido pra e-sports; usado na prévia antes de simular */
  bestOf?: BestOf
  /** forma (embalado/má fase) por time — opcional, mesma fonte da classificação */
  form?: Record<string, 'hot' | 'cold' | null>
  onClose: () => void
  /** simula a partida sem sair do modal — usado pelos botões da prévia */
  onSimulate?: (matchId: string) => void
  /** selo de seed (ex.: "EMEA #2") — opcional, visível só aqui no detalhe da partida */
  seedLabels?: Record<string, string>
}) {
  const open = !!match
  const [watching, setWatching] = useState(false)
  // "Assistir" clicado antes de simular: dispara a simulação e entra no replay
  // assim que o resultado ficar pronto (match.played vira true no próximo render)
  const [pendingWatch, setPendingWatch] = useState(false)

  // replay fecha junto com o modal / troca de partida
  useEffect(() => {
    if (!open) {
      setWatching(false)
      setPendingWatch(false)
    }
  }, [open, match?.id])

  useEffect(() => {
    if (pendingWatch && match?.played) {
      setWatching(true)
      setPendingWatch(false)
    }
  }, [pendingWatch, match?.played])

  const handleWatch = () => {
    if (!match) return
    if (match.played) {
      setWatching(true)
    } else {
      setPendingWatch(true)
      onSimulate?.(match.id)
    }
  }

  if (match && !match.played) {
    return (
      <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
        <MatchPreview
          match={match}
          home={home}
          away={away}
          sport={sport}
          bestOf={bestOf}
          form={form}
          seedLabels={seedLabels}
          onWatch={handleWatch}
          onSimulate={() => onSimulate?.(match.id)}
        />
      </Modal>
    )
  }

  if (match && watching && (match.football || match.esports)) {
    return (
      <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
        <PlaybackView key={match.id} match={match} home={home} away={away} onExit={() => setWatching(false)} />
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
      {match && (
        <div>
          {/* Cabeçalho */}
          <div className="border-b border-white/5 bg-gradient-to-b from-blood-950/30 to-transparent px-6 pb-5 pt-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-blood-300">
              {match.stage}
            </p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-1 flex-col items-center gap-2">
                <TeamBadge team={home} size="lg" seedLabel={home && seedLabels?.[home.id]} />
                <span className="text-center text-sm font-semibold text-zinc-200">{home?.name}</span>
              </div>
              <div className="flex flex-col items-center px-2">
                <div className="heading tnum text-4xl font-bold text-white">
                  {match.homeScore} <span className="text-zinc-600">:</span> {match.awayScore}
                </div>
                {match.penalties && (
                  <span className="mt-1 rounded-full bg-blood-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-blood-200">
                    Pênaltis {match.penalties[0]} - {match.penalties[1]}
                  </span>
                )}
                {match.extraTime && !match.penalties && (
                  <span className="mt-1 text-[11px] text-zinc-500">após prorrogação</span>
                )}
              </div>
              <div className="flex flex-1 flex-col items-center gap-2">
                <TeamBadge team={away} size="lg" seedLabel={away && seedLabels?.[away.id]} />
                <span className="text-center text-sm font-semibold text-zinc-200">{away?.name}</span>
              </div>
            </div>
            {(match.football || match.esports) && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleWatch}
                  className="flex items-center gap-2 rounded-full border border-blood-600/60 bg-blood-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-blood-200 transition hover:bg-blood-900/40"
                >
                  <Play size={13} /> Assistir
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[55vh] space-y-5 overflow-y-auto px-6 py-5">
            {sport === 'esports' && match.esports ? (
              // e-sports: KDA (soma da série) é a primeira coisa; lances depois
              <>
                <EsportsBody key={match.id} match={match} home={home} away={away} />
                <MomentsFeed match={match} home={home} away={away} />
                <ShareSummary match={match} home={home} away={away} />
              </>
            ) : (
              <>
                <MomentsFeed match={match} home={home} away={away} />
                {match.football && <FootballBody match={match} home={home} away={away} />}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────── Prévia (antes de simular) ───────────────────────────

function TeamStrengthRow({ team, form }: { team?: Team; form?: Record<string, 'hot' | 'cold' | null> }) {
  if (!team) return <span className="text-xs text-zinc-600">A definir</span>
  const f = form?.[team.id]
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="truncate text-xs font-semibold text-zinc-300">{team.name}</span>
        {f === 'hot' && <TrendingUp size={12} className="shrink-0 text-win-400" aria-label="Embalado" />}
        {f === 'cold' && <TrendingDown size={12} className="shrink-0 text-blood-400" aria-label="Má fase" />}
      </div>
      <StrengthBar value={team.strength} />
    </div>
  )
}

function MatchPreview({
  match,
  home,
  away,
  sport,
  bestOf,
  form,
  seedLabels,
  onWatch,
  onSimulate
}: {
  match: Match
  home?: Team
  away?: Team
  sport: Sport
  bestOf?: BestOf
  form?: Record<string, 'hot' | 'cold' | null>
  seedLabels?: Record<string, string>
  onWatch: () => void
  onSimulate: () => void
}) {
  return (
    <div className="px-6 py-6">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {match.stage} · a decidir
      </p>
      <div className="flex items-center justify-center gap-3">
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamBadge team={home} size="lg" seedLabel={home && seedLabels?.[home.id]} />
          <span className="text-center text-sm font-semibold text-zinc-200">{home?.name ?? 'A definir'}</span>
        </div>
        <span className="heading px-1 text-xl font-bold text-zinc-700">vs</span>
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamBadge team={away} size="lg" seedLabel={away && seedLabels?.[away.id]} />
          <span className="text-center text-sm font-semibold text-zinc-200">{away?.name ?? 'A definir'}</span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/5 bg-ink-900/60 px-4 py-3">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Força</p>
        <div className="grid grid-cols-2 gap-4">
          <TeamStrengthRow team={home} form={form} />
          <TeamStrengthRow team={away} form={form} />
        </div>
      </div>

      {sport === 'esports' && bestOf && (
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Melhor de {bestOf} — os mapas saem ao simular ou assistir.
        </p>
      )}

      {!home || !away ? (
        <p className="mt-5 text-center text-xs text-zinc-600">Times ainda não definidos.</p>
      ) : (
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={onWatch}
            className="flex items-center gap-2 rounded-full border border-blood-600/60 bg-blood-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blood-200 transition hover:bg-blood-900/40"
          >
            <Play size={13} /> Assistir
          </button>
          <button
            onClick={onSimulate}
            className="flex items-center gap-2 rounded-full bg-blood-grad px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-glow-sm transition hover:brightness-110"
          >
            <Dices size={13} /> Simular
          </button>
        </div>
      )}
    </div>
  )
}

function FootballBody({ match }: { match: Match; home?: Team; away?: Team }) {
  const f = match.football!
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/5 bg-ink-900/60 px-4 py-2">
        <StatRow label="Posse de bola" home={f.possession[0]} away={f.possession[1]} suffix="%" />
        <StatRow label="Finalizações" home={f.shots[0]} away={f.shots[1]} />
        <StatRow label="No alvo" home={f.shotsOnTarget[0]} away={f.shotsOnTarget[1]} />
        <StatRow label="Escanteios" home={f.corners[0]} away={f.corners[1]} />
        <StatRow label="Faltas" home={f.fouls[0]} away={f.fouls[1]} />
        <StatRow label="Cartões amarelos" home={f.yellow[0]} away={f.yellow[1]} />
        {(f.red[0] > 0 || f.red[1] > 0) && <StatRow label="Cartões vermelhos" home={f.red[0]} away={f.red[1]} />}
      </div>
    </div>
  )
}

function EsportsBody({ match, home, away }: { match: Match; home?: Team; away?: Team }) {
  const e = match.esports!
  // 'series' = soma de todos os mapas (visão padrão); número = índice do mapa
  const [view, setView] = useState<'series' | number>('series')
  const hasMapLines = e.maps.some((m) => m.lines && m.lines.length > 0)
  const mapView = typeof view === 'number' ? e.maps[view] : undefined
  const lines = mapView?.lines ?? e.lines

  return (
    <div className="space-y-5">
      {/* Estatísticas dos jogadores — total da série primeiro; cada mapa via chips */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <p className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Jogadores</p>
          <button
            onClick={() => setView('series')}
            className={cx(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition',
              view === 'series'
                ? 'border-blood-600 bg-blood-950/40 text-blood-200'
                : 'border-white/10 text-zinc-400 hover:text-zinc-100'
            )}
          >
            Série (total)
          </button>
          {hasMapLines &&
            e.maps.map((m, i) => (
              <button
                key={i}
                onClick={() => setView(i)}
                className={cx(
                  'tnum rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition',
                  view === i
                    ? 'border-blood-600 bg-blood-950/40 text-blood-200'
                    : 'border-white/10 text-zinc-400 hover:text-zinc-100'
                )}
              >
                {m.name} {m.home}–{m.away}
              </button>
            ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { team: home, teamId: match.homeId },
            { team: away, teamId: match.awayId }
          ].map((col, idx) => {
            const teamLines = lines.filter((l) => l.teamId === col.teamId)
            const kills = teamLines.reduce((s, l) => s + l.kills, 0)
            return (
              <div key={idx} className="rounded-xl border border-white/5 bg-ink-900/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <TeamBadge team={col.team} size="sm" />
                  <span className="truncate text-xs font-semibold text-zinc-300">{col.team?.name}</span>
                  <span className="tnum ml-auto shrink-0 text-[11px] text-zinc-500">{kills} abates</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-600">
                      <th className="text-left font-medium">Jogador</th>
                      <th className="tnum font-medium">K</th>
                      <th className="tnum font-medium">D</th>
                      <th className="tnum font-medium">A</th>
                      <th className="tnum font-medium" title="Saldo de abates (K − D)">+/−</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamLines
                      .slice()
                      .sort((a, b) => b.kills - a.kills)
                      .map((l) => {
                        const diff = l.kills - l.deaths
                        return (
                          <tr key={l.playerId} className="text-zinc-300">
                            <td className="truncate py-0.5 pr-1">{l.name}</td>
                            <td className="tnum text-center font-semibold text-white">{l.kills}</td>
                            <td className="tnum text-center text-zinc-500">{l.deaths}</td>
                            <td className="tnum text-center text-zinc-500">{l.assists}</td>
                            <td
                              className={cx(
                                'tnum text-center font-semibold',
                                diff > 0 ? 'text-win-400' : diff < 0 ? 'text-blood-300' : 'text-zinc-500'
                              )}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-600">
          {mapView
            ? `KDA apenas do mapa ${(view as number) + 1} · ${mapView.name} (${mapView.home}–${mapView.away}).`
            : 'Soma de todos os mapas da série.'}
        </p>
      </div>

      {e.mvp && (
        <div className="flex items-center gap-3 rounded-xl border border-gold-600/30 bg-gold-950/40 px-4 py-3">
          <Crosshair size={18} className="text-gold-400" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-400">MVP da série</p>
            <p className="text-sm font-bold text-white">
              {e.mvp.name}{' '}
              <span className="tnum ml-1 font-normal text-zinc-400">
                {e.mvp.kills}/{e.mvp.deaths}/{e.mvp.assists}
              </span>
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Mapas · Melhor de {e.bestOf}
        </p>
        <div className="space-y-1.5">
          {e.maps.map((m, i) => {
            const homeWon = m.home > m.away
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-white/5 bg-ink-900/60 px-3 py-2">
                <span className="w-20 text-xs font-semibold text-zinc-400">{m.name}</span>
                <span className={cx('tnum text-sm font-bold', homeWon ? 'text-white' : 'text-zinc-500')}>{m.home}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                  <div
                    className="h-full bg-blood-500/60"
                    style={{ width: `${(m.home / (m.home + m.away || 1)) * 100}%` }}
                  />
                </div>
                <span className={cx('tnum text-sm font-bold', !homeWon ? 'text-white' : 'text-zinc-500')}>{m.away}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
