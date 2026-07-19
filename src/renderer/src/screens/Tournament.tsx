import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Dices,
  Download,
  Eye,
  FastForward,
  Goal,
  LayoutGrid,
  MoreHorizontal,
  RotateCcw,
  StepForward,
  Trophy
} from 'lucide-react'
import type { Match, Team, Tournament } from '../types'
import { useApp } from '../store/app'
import { useHistory } from '../store/history'
import { useSeasons } from '../store/season'
import { FORMAT_META, GAME_META, SPORT_META } from '../lib/meta'
import {
  currentRoundInfo,
  teamFormLevel
} from '../engine/tournament'
import {
  groupStandings,
  leagueStandings,
  matchesByRound,
  progress,
  teamMap,
  tournamentScorers
} from '../engine/selectors'
import { StandingsTable } from '../components/StandingsTable'
import { MatchCard } from '../components/MatchCard'
import { MatchModal } from '../components/MatchModal'
import { Bracket } from '../components/Bracket'
import { ConfirmDialog } from '../components/ConfirmDialog'
import Silk from '../components/Silk'
import {
  matchMoments,
  roundHighlights,
  tournamentSummary,
  type Moment,
  type RoundHighlight,
  type TournamentNarration
} from '../lib/narration'
import { Button, Modal } from '../components/ui'
import { TeamBadge } from '../components/TeamBadge'
import { cx } from '../lib/cx'

function formMapOf(t: Tournament): Record<string, 'hot' | 'cold' | null> | undefined {
  if (!t.config.momentum) return undefined
  const map: Record<string, 'hot' | 'cold' | null> = {}
  for (const tm of t.teams) map[tm.id] = teamFormLevel(t, tm.id)
  return map
}

function chaosLabel(config: Tournament['config']): string | null {
  const c = config.chaos ?? (config.pureRandom ? 1 : 0)
  if (c >= 1) return 'Loteria'
  if (c >= 0.7) return 'Caótico'
  if (c >= 0.35) return 'Equilibrado'
  return null
}

export function TournamentScreen() {
  const t = useApp((s) => s.current)
  const simRound = useApp((s) => s.simRound)
  const simPhase = useApp((s) => s.simPhase)
  const simAll = useApp((s) => s.simAll)
  const simMatch = useApp((s) => s.simMatch)
  const concludeTournament = useApp((s) => s.concludeTournament)
  const reset = useApp((s) => s.reset)
  const exportCurrent = useApp((s) => s.exportCurrent)
  const go = useApp((s) => s.go)
  const closeTournament = useApp((s) => s.closeTournament)
  const clearCurrentTournament = useApp((s) => s.clearCurrentTournament)
  const setToast = useApp((s) => s.setToast)
  const reviewMode = useApp((s) => s.reviewMode)
  const committedIds = useHistory((s) => s.committedIds)

  const activeSeason = useSeasons((s) => s.activeSeason)
  const pendingTournamentId = useSeasons((s) => s.pendingTournamentId)
  const recordSlotResult = useSeasons((s) => s.recordSlotResult)

  const mcTarget = useApp((s) => s.mcTarget)
  const mcDone = useApp((s) => s.mcDone)
  const mcTally = useApp((s) => s.mcTally)
  const mcRunOnce = useApp((s) => s.mcRunOnce)
  const mcRunAll = useApp((s) => s.mcRunAll)
  const lastRoundIds = useApp((s) => s.lastRoundIds)

  // guarda só o id — o objeto Match é derivado de t.matches a cada render,
  // então o modal reflete ao vivo o resultado assim que uma partida é simulada
  // (necessário pro botão "Assistir" da prévia: simula e já entra no replay)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [mcView, setMcView] = useState<'play' | 'mc'>('play')
  const [confirmReset, setConfirmReset] = useState(false)

  const teams = useMemo(() => (t ? teamMap(t) : {}), [t])
  const selectedMatch = selectedMatchId ? t?.matches.find((m) => m.id === selectedMatchId) ?? null : null
  const roundInfo = useMemo(() => (t ? currentRoundInfo(t) : { label: '', matchIds: [] }), [t])
  const prog = useMemo(() => (t ? progress(t) : { played: 0, total: 0 }), [t])
  const narrSummary = useMemo(() => (t ? tournamentSummary(t, teams) : null), [t, teams])
  const roundHi = useMemo(
    () => (t && lastRoundIds.length ? roundHighlights(lastRoundIds, t.matches, teams) : null),
    [t, teams, lastRoundIds]
  )

  if (!t) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Nenhum campeonato ativo.
      </div>
    )
  }

  const meta = FORMAT_META[t.format]
  const finished = t.phase === 'finished'
  const concluded = committedIds.includes(t.id)
  const champ = t.champion ? teams[t.champion] : undefined
  const pct = prog.total > 0 ? Math.round((prog.played / prog.total) * 100) : 0
  const mcActive = mcTarget > 0
  const mcComplete = mcActive && mcDone >= mcTarget

  // Season-aware: if this tournament is the active season slot, record and go back to season
  const isSeasonTournament = !!activeSeason && activeSeason.status === 'playing' && t.id === pendingTournamentId

  const handleConclude = () => {
    if (isSeasonTournament) {
      // temporada é isolada do histórico global — só registra na própria temporada.
      // Só navega/limpa o `current` se o registro deu certo — se recordSlotResult
      // falhar, ficamos na tela do campeonato (sem perder nada) em vez de sumir
      // pra Home com a temporada travada um passo atrás.
      const ok = recordSlotResult(t)
      if (!ok) {
        setToast('Não foi possível concluir esse campeonato — tente novamente')
        return
      }
      clearCurrentTournament()
      go('season')
    } else {
      concludeTournament()
    }
  }

  const handleClose = () => {
    if (isSeasonTournament) go('season')
    else if (reviewMode) {
      clearCurrentTournament()
      go('season')
    } else closeTournament()
  }

  // Refazer apaga todos os resultados — confirma só se já houver progresso
  const handleReset = () => {
    if (prog.played > 0) setConfirmReset(true)
    else reset()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/5 bg-ink-950/60 px-4 py-4 md:px-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={handleClose}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-zinc-400 hover:text-white md:mt-1"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="display text-2xl leading-tight text-zinc-100 md:text-4xl">{t.name}</h1>
              {/* Badges informativas — só no desktop; no mobile o espaço é do que é usável */}
              <div className="mt-1.5 hidden flex-wrap items-center gap-2 md:flex">
                <span className="tag bg-ink-800 text-zinc-300">
                  {SPORT_META[t.sport].emoji} {SPORT_META[t.sport].label}
                </span>
                {t.sport === 'esports' && t.config.game && (
                  <span className="tag bg-ink-800 text-zinc-300">
                    {GAME_META[t.config.game].emoji} {GAME_META[t.config.game].short}
                  </span>
                )}
                <span className="tag bg-ink-800 text-zinc-300">{meta.label}</span>
                {chaosLabel(t.config) && (
                  <span className="tag bg-blood-950/50 text-blood-300">🎲 {chaosLabel(t.config)}</span>
                )}
                {t.config.momentum && <span className="tag bg-ink-800 text-zinc-300">🔥 Forma</span>}
                <span className="tag bg-ink-800 text-zinc-500">{t.teams.length} times</span>
              </div>
            </div>
          </div>

          {/* Ações — no mobile quebram pra uma linha própria, largura natural,
              alinhadas à esquerda; no desktop voltam a alinhar à direita */}
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <HeaderMenu
              items={[
                ...(reviewMode ? [] : [{ label: 'Refazer', icon: <RotateCcw size={15} />, onClick: handleReset }]),
                { label: 'Exportar', icon: <Download size={15} />, onClick: exportCurrent }
              ]}
            />
            {!finished && !mcActive && (
              <Button
                icon={<FastForward size={15} />}
                disabled={roundInfo.matchIds.length === 0}
                className="whitespace-nowrap"
                onClick={simRound}
              >
                Simular {roundInfo.label.split(' · ')[0].toLowerCase()}
              </Button>
            )}
            {!finished && !mcActive && t.phase === 'group' && (
              <Button icon={<LayoutGrid size={15} />} className="whitespace-nowrap" onClick={simPhase}>
                <span className="hidden sm:inline">Simular fase de grupos</span>
                <span className="sm:hidden">Fase de grupos</span>
              </Button>
            )}
            {!finished && !mcActive && (
              <Button
                variant="primary"
                icon={<Dices size={17} />}
                className="whitespace-nowrap"
                onClick={simAll}
              >
                Aleatorizar tudo
              </Button>
            )}
            {isSeasonTournament && (
              <span className="tag border-blood-700/40 text-blood-300">
                <CalendarDays size={11} /> Temporada — campeonato {(activeSeason?.currentSlotIndex ?? 0) + 1}/{activeSeason?.slots.length}
              </span>
            )}
            {reviewMode && (
              <span className="tag border-amber-700/40 text-amber-300">
                <Eye size={11} /> Revisão — resultado já registrado
              </span>
            )}
            {finished && !concluded && !reviewMode && (!t.fromSeason || isSeasonTournament) && (
              <Button
                variant="primary"
                icon={<Check size={16} />}
                className="animate-pulse-glow whitespace-nowrap"
                onClick={handleConclude}
              >
                {isSeasonTournament ? 'Concluir e avançar' : 'Concluir campeonato'}
              </Button>
            )}
            {finished && concluded && (
              <span className="tag border-win-700/40 text-win-400">
                <Check size={12} /> Concluído
              </span>
            )}
          </div>
        </div>

        {/* Progresso */}
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-blood-grad transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tnum shrink-0 text-xs font-semibold text-zinc-500">
            {prog.played}/{prog.total} partidas
          </span>
        </div>

        {/* Monte Carlo — modo de simulação em massa (substitui os controles normais) */}
        {mcActive && (
          <div className="mt-3 rounded-xl border border-blood-800/30 bg-blood-950/15 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blood-300">
                <Dices size={14} /> Monte Carlo
              </span>
              <span className="tnum rounded-full bg-ink-900/70 px-2 py-0.5 text-xs font-semibold text-zinc-300">
                {mcDone} / {mcTarget}
              </span>
              <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
                <Button
                  icon={<StepForward size={15} />}
                  disabled={mcComplete}
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    mcRunOnce()
                    setMcView('play')
                  }}
                >
                  Simular 1×
                </Button>
                <Button
                  variant="primary"
                  icon={<Dices size={16} />}
                  disabled={mcComplete}
                  wrapperClassName="flex-1 sm:flex-none"
                  onClick={() => {
                    mcRunAll()
                    setMcView('mc')
                  }}
                >
                  Rodar tudo ({mcTarget}×)
                </Button>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
              Re-simula o campeonato inteiro várias vezes para ver quem mais vira campeão — não altera o histórico.
            </p>
          </div>
        )}
      </div>

      {/* Banner de campeão — a glória é dourada. No desktop fica fixo aqui; no
          mobile ele desce pro topo do conteúdo (md:hidden lá embaixo) e rola junto. */}
      {finished && champ && <ChampionBanner champ={champ} className="hidden md:block" />}

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
        {finished && champ && <ChampionBanner champ={champ} compact className="mb-5 md:hidden" />}
        {mcActive && (
          <div className="mb-5 inline-flex rounded-xl border border-white/5 bg-ink-900 p-1">
            {(['play', 'mc'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMcView(v)}
                className={cx(
                  'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                  mcView === v ? 'bg-blood-grad text-white shadow-glow-sm' : 'text-zinc-400 hover:text-zinc-100'
                )}
              >
                {v === 'play' ? (
                  <>
                    <LayoutGrid size={14} /> Campeonato
                  </>
                ) : (
                  <>
                    <BarChart3 size={14} /> Monte Carlo
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {(!mcActive || mcView === 'play') && (
          <>
            <LiveScorers t={t} teams={teams} />
            <NarrationPanel
              summary={finished ? narrSummary : null}
              round={!finished ? roundHi : null}
              onOpen={(id) => setSelectedMatchId(id)}
            />
            {t.format === 'league' && (
              <LeagueView t={t} teams={teams} currentIds={roundInfo.matchIds} onSim={simMatch} onOpen={(m) => setSelectedMatchId(m.id)} />
            )}
            {t.format === 'swiss' && (
              <SwissView t={t} teams={teams} currentIds={roundInfo.matchIds} onSim={simMatch} onOpen={(m) => setSelectedMatchId(m.id)} />
            )}
            {t.format === 'cup' && (
              <CupView t={t} teams={teams} currentIds={roundInfo.matchIds} onSim={simMatch} onOpen={(m) => setSelectedMatchId(m.id)} />
            )}
            {(t.format === 'double-elim' || t.format === 'triple-elim') && (
              <CupView t={t} teams={teams} currentIds={roundInfo.matchIds} onSim={simMatch} onOpen={(m) => setSelectedMatchId(m.id)} />
            )}
            {t.format === 'groups' && (
              <GroupsView t={t} teams={teams} currentIds={roundInfo.matchIds} onSim={simMatch} onOpen={(m) => setSelectedMatchId(m.id)} />
            )}
            {t.format === 'league-playoffs' && t.phase === 'league' && (
              <LeagueView t={t} teams={teams} currentIds={roundInfo.matchIds} onSim={simMatch} onOpen={(m) => setSelectedMatchId(m.id)} />
            )}
            {t.format === 'league-playoffs' && t.phase !== 'league' && (
              <CupView t={t} teams={teams} currentIds={roundInfo.matchIds} onSim={simMatch} onOpen={(m) => setSelectedMatchId(m.id)} />
            )}
          </>
        )}

        {mcActive && mcView === 'mc' && (
          <MonteCarloPanel
            tally={mcTally}
            done={mcDone}
            target={mcTarget}
            teams={teams}
            complete={mcComplete}
            onRunAll={() => mcRunAll()}
          />
        )}
      </div>

      <MatchModal
        match={selectedMatch}
        home={selectedMatch ? teams[selectedMatch.homeId] : undefined}
        away={selectedMatch ? teams[selectedMatch.awayId] : undefined}
        sport={t.sport}
        bestOf={t.config.bestOf}
        form={formMapOf(t)}
        onClose={() => setSelectedMatchId(null)}
        onSimulate={simMatch}
        seedLabels={t.seedLabels}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Refazer o campeonato?"
        message="Isso apaga todos os resultados já simulados e recomeça do zero. Esta ação não pode ser desfeita."
        confirmLabel="Refazer tudo"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          reset()
          setConfirmReset(false)
        }}
      />
    </div>
  )
}

// ---------- Subcomponentes ----------

// Menu "⋯" para ações secundárias (Salvar, Exportar) — desafoga o cabeçalho
function HeaderMenu({ items }: { items: { label: string; icon: ReactNode; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button icon={<MoreHorizontal size={15} />} onClick={() => setOpen((o) => !o)}>
        Mais
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-ink-900 py-1 shadow-card">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                it.onClick()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NarrationPanel({
  summary,
  round,
  onOpen
}: {
  summary: TournamentNarration | null
  round: RoundHighlight | null
  onOpen: (matchId: string) => void
}) {
  if (summary) {
    return (
      <div className="mb-5 rounded-xl border border-blood-800/30 bg-gradient-to-r from-blood-950/30 to-transparent p-4">
        <p className="display mb-1 text-xl text-zinc-100">{summary.headline}</p>
        <p className="text-sm leading-relaxed text-zinc-400">{summary.text}</p>
        {(summary.zebra || summary.bestGame) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.zebra && summary.zebra.gap >= 8 && (
              <button
                onClick={() => onOpen(summary.zebra!.matchId)}
                className="rounded-full border border-amber-700/40 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-900/30"
              >
                🐴 Zebra: {summary.zebra.winner} {summary.zebra.score} {summary.zebra.loser}
              </button>
            )}
            {summary.bestGame && (
              <button
                onClick={() => onOpen(summary.bestGame!.matchId)}
                className="rounded-full border border-blood-700/40 bg-blood-950/30 px-3 py-1 text-xs font-semibold text-blood-200 transition hover:bg-blood-900/40"
              >
                🔥 Jogo do torneio: {summary.bestGame.label}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (round) {
    return (
      <div className="mb-5 rounded-xl border border-white/5 bg-ink-900/50 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-100">
          <span className="text-blood-400">📰</span> {round.headline}
        </p>
        {(round.zebra || round.bestGame) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {round.zebra && (
              <button
                onClick={() => onOpen(round.zebra!.matchId)}
                className="flex items-center gap-2 rounded-xl border border-amber-700/30 bg-amber-950/15 px-3 py-2 text-left transition hover:border-amber-600/50"
              >
                <span>🐴</span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-amber-400/80">Zebra da rodada</p>
                  <p className="truncate text-xs font-semibold text-zinc-200">
                    {round.zebra.winner} {round.zebra.score} {round.zebra.loser}
                  </p>
                </div>
              </button>
            )}
            {round.bestGame && (
              <button
                onClick={() => onOpen(round.bestGame!.matchId)}
                className="flex items-center gap-2 rounded-xl border border-blood-700/30 bg-blood-950/15 px-3 py-2 text-left transition hover:border-blood-600/50"
              >
                <span>🔥</span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-blood-300/80">Jogo da rodada</p>
                  <p className="truncate text-xs font-semibold text-zinc-200">{round.bestGame.label}</p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}

function MonteCarloPanel({
  tally,
  done,
  target,
  teams,
  complete,
  onRunAll
}: {
  tally: Record<string, number>
  done: number
  target: number
  teams: Record<string, Team>
  complete: boolean
  onRunAll: () => void
}) {
  const ranked = Object.entries(tally).sort(([, a], [, b]) => b - a)
  const max = ranked.length ? ranked[0][1] : 0

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="kicker mb-1">
            <Dices size={13} className="text-blood-400" /> Monte Carlo
          </p>
          <h2 className="display text-3xl text-zinc-100">Ranking de campeões</h2>
        </div>
        <span className="tnum rounded-full bg-ink-800 px-3 py-1 text-sm font-bold text-zinc-300">
          {done}/{target}
        </span>
      </div>

      {done === 0 ? (
        <div className="card p-8 text-center">
          <p className="mb-4 text-sm text-zinc-500">
            Nenhuma simulação ainda. Rode o campeonato várias vezes para ver quem vence com mais frequência.
          </p>
          {!complete && (
            <Button variant="primary" icon={<Dices size={16} />} onClick={onRunAll}>
              Aleatorizar tudo ({target}×)
            </Button>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-white/5 p-2">
          {ranked.map(([id, wins], i) => {
            const team = teams[id]
            const winPct = done > 0 ? Math.round((wins / done) * 100) : 0
            return (
              <div key={id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="tnum w-5 text-right text-xs font-bold text-zinc-600">{i + 1}</span>
                <TeamBadge team={team} size="sm" />
                <span className="flex-1 truncate text-sm font-semibold text-zinc-100">{team?.name ?? id}</span>
                <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-ink-800 sm:block">
                  <div
                    className="h-full rounded-full bg-blood-grad"
                    style={{ width: `${max ? (wins / max) * 100 : 0}%` }}
                  />
                </div>
                <span className="tnum w-10 text-right text-sm font-bold text-blood-300">{wins}</span>
                <span className="tnum w-12 text-right text-xs text-zinc-500">{winPct}%</span>
              </div>
            )
          })}
          {!complete ? (
            <div className="px-3 py-3">
              <Button variant="primary" icon={<Dices size={16} />} onClick={onRunAll}>
                Rodar as restantes ({target - done}×)
              </Button>
            </div>
          ) : (
            <p className="px-3 py-3 text-center text-xs text-win-400">
              Monte Carlo concluído — {target} simulações.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface ViewProps {
  t: Tournament
  teams: Record<string, import('../types').Team>
  currentIds: string[]
  onSim: (id: string) => void
  onOpen: (m: Match) => void
}

function RoundsList({
  t,
  matches,
  teams,
  currentIds,
  onSim,
  onOpen,
  allowReRoll
}: {
  t: Tournament
  matches: Match[]
  teams: Record<string, import('../types').Team>
  currentIds: string[]
  onSim: (id: string) => void
  onOpen: (m: Match) => void
  allowReRoll: boolean
}) {
  const byRound = useMemo(() => matchesByRound(matches), [matches])
  const entries = [...byRound.entries()]
  const currentSet = new Set(currentIds)
  const currentRound = entries.find(([, ms]) => ms.some((m) => currentSet.has(m.id)))?.[0]
  const many = entries.length > 4

  const [open, setOpen] = useState<Set<number>>(() =>
    many ? new Set(currentRound != null ? [currentRound] : []) : new Set(entries.map(([r]) => r))
  )

  // mantém a rodada atual aberta conforme ela avança
  useEffect(() => {
    if (many && currentRound != null) {
      setOpen((prev) => (prev.has(currentRound) ? prev : new Set(prev).add(currentRound)))
    }
  }, [many, currentRound])

  const allOpen = entries.length > 0 && entries.every(([r]) => open.has(r))

  const toggle = (r: number) =>
    setOpen((prev) => {
      const n = new Set(prev)
      if (n.has(r)) n.delete(r)
      else n.add(r)
      return n
    })

  return (
    <div className="space-y-2.5">
      {many && (
        <div className="flex justify-end">
          <button
            onClick={() =>
              setOpen(
                allOpen
                  ? new Set(currentRound != null ? [currentRound] : [])
                  : new Set(entries.map(([r]) => r))
              )
            }
            className="text-xs text-zinc-500 underline transition hover:text-zinc-200"
          >
            {allOpen ? 'Recolher rodadas' : `Ver todas as ${entries.length} rodadas`}
          </button>
        </div>
      )}
      {entries.map(([round, ms]) => {
        const isCurrent = ms.some((m) => currentSet.has(m.id))
        const isOpen = open.has(round)
        const label = ms[0]?.stage.split(' · ')[0] ?? `Rodada ${round}`
        const played = ms.filter((m) => m.played).length
        return (
          <div key={round} className={cx(many && 'overflow-hidden rounded-xl border border-paper/[0.07]')}>
            {many ? (
              <button
                onClick={() => toggle(round)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/[0.02]"
              >
                <ChevronRight
                  size={14}
                  className={cx('shrink-0 text-zinc-600 transition-transform', isOpen && 'rotate-90')}
                />
                <span
                  className={cx(
                    'text-xs font-bold uppercase tracking-wide',
                    isCurrent ? 'text-blood-300' : 'text-zinc-400'
                  )}
                >
                  {label}
                </span>
                {isCurrent && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blood-500" />}
                <span className="tnum ml-auto text-[11px] text-zinc-600">
                  {played}/{ms.length}
                </span>
              </button>
            ) : (
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cx(
                    'text-xs font-bold uppercase tracking-wide',
                    isCurrent ? 'text-blood-300' : 'text-zinc-500'
                  )}
                >
                  {label}
                </span>
                {isCurrent && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blood-500" />}
              </div>
            )}
            {isOpen && (
              <div className={cx('grid gap-2', many && 'p-2 pt-0')}>
                {ms.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    home={teams[m.homeId]}
                    away={teams[m.awayId]}
                    sport={t.sport}
                    onSimulate={() => onSim(m.id)}
                    onReRoll={allowReRoll && m.played ? () => onSim(m.id) : undefined}
                    onOpen={() => onOpen(m)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Split responsivo: no desktop (min-[960px]) mostra as duas colunas lado a lado
// como sempre; no mobile vira uma aba por toque (só um painel por vez, sem rolagem
// gigante). Rende ambos os painéis e controla visibilidade por CSS — o desktop
// fica idêntico ao de antes.
function SplitTabs({
  gridClass,
  left,
  right
}: {
  gridClass: string
  left: { label: string; node: ReactNode }
  right: { label: string; node: ReactNode }
}) {
  const [active, setActive] = useState<'left' | 'right'>('left')
  const panels = [
    { key: 'left' as const, ...left },
    { key: 'right' as const, ...right }
  ]
  return (
    <div>
      <div className="mb-4 flex rounded-xl border border-white/5 bg-ink-900 p-1 min-[960px]:hidden">
        {panels.map((p) => (
          <button
            key={p.key}
            onClick={() => setActive(p.key)}
            className={cx(
              'flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
              active === p.key ? 'bg-blood-grad text-white shadow-glow-sm' : 'text-zinc-400 hover:text-zinc-100'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className={cx('grid items-start gap-5', gridClass)}>
        {panels.map((p) => (
          <div key={p.key} className={cx(active !== p.key && 'hidden', 'min-[960px]:block')}>
            {p.node}
          </div>
        ))}
      </div>
    </div>
  )
}

function LeagueView({ t, teams, currentIds, onSim, onOpen }: ViewProps) {
  const rows = useMemo(() => leagueStandings(t), [t])
  return (
    <SplitTabs
      gridClass="min-[960px]:grid-cols-[1fr_minmax(340px,430px)]"
      left={{
        label: 'Classificação',
        node: (
          <div className="card p-4">
            <p className="mb-2 hidden text-sm font-bold text-white min-[960px]:block">Classificação</p>
            <StandingsTable rows={rows} teams={teams} sport={t.sport} form={formMapOf(t)} seedLabels={t.seedLabels} />
          </div>
        )
      }}
      right={{
        label: 'Partidas',
        node: (
          <div>
            <p className="mb-3 hidden text-sm font-bold text-white min-[960px]:block">Partidas</p>
            <RoundsList
              t={t}
              matches={t.matches}
              teams={teams}
              currentIds={currentIds}
              onSim={onSim}
              onOpen={onOpen}
              allowReRoll={t.phase !== 'finished'}
            />
          </div>
        )
      }}
    />
  )
}

function SwissView({ t, teams, currentIds, onSim, onOpen }: ViewProps) {
  const rows = useMemo(
    () =>
      leagueStandings(t).map((r, i) => ({ ...r, rank: i + 1 })),
    [t]
  )
  return (
    <SplitTabs
      gridClass="min-[960px]:grid-cols-[1fr_minmax(340px,430px)]"
      left={{
        label: 'Classificação',
        node: (
          <div className="card p-4">
            <p className="mb-2 hidden text-sm font-bold text-white min-[960px]:block">Classificação · Suíço</p>
            <StandingsTable rows={rows} teams={teams} sport={t.sport} form={formMapOf(t)} />
          </div>
        )
      }}
      right={{
        label: 'Rodadas',
        node: (
          <div>
            <p className="mb-3 hidden text-sm font-bold text-white min-[960px]:block">Rodadas</p>
            <RoundsList
              t={t}
              matches={t.matches}
              teams={teams}
              currentIds={currentIds}
              onSim={onSim}
              onOpen={onOpen}
              allowReRoll={false}
            />
          </div>
        )
      }}
    />
  )
}

function CupView({ t, teams, currentIds, onSim, onOpen }: ViewProps) {
  // confrontos em evidência: a fase atual — ou a decisão, se já acabou
  const stage = useMemo(() => {
    const ids = new Set(currentIds)
    let ms = t.matches.filter((m) => ids.has(m.id))
    // currentIds só traz as NÃO jogadas — expande pra fase inteira (mesmo `stage`)
    // pra partida simulada não sumir da seção na hora (ficava "esvaziando")
    if (ms.length > 0) {
      const stages = new Set(ms.map((m) => m.stage))
      ms = t.matches.filter((m) => stages.has(m.stage))
    }
    if (ms.length === 0 && t.phase === 'finished' && t.bracket?.length) {
      const finalRound = t.bracket[t.bracket.length - 1]
      const finalIds = new Set(
        finalRound.matches.flatMap((bm) => [bm.matchId, ...(bm.legIds ?? [])]).filter(Boolean)
      )
      ms = t.matches.filter((m) => finalIds.has(m.id))
    }
    return ms
  }, [t, currentIds])

  if (!t.bracket) return null
  const finished = t.phase === 'finished'
  // na eliminação múltipla os confrontos em aberto podem vir de seções
  // diferentes (Winners + Losers) — o rótulo lista todas, não só a primeira
  const stageLabel = [...new Set(stage.map((m) => m.stage.split(' · ')[0]))].join(' + ')

  return (
    <div className="space-y-5">
      {stage.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-2 w-2 bg-blood-600" />
            <h3 className="heading text-base font-bold uppercase tracking-[0.14em] text-zinc-100">
              {finished ? 'A decisão' : stageLabel || 'Fase atual'}
            </h3>
            {!finished && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blood-500" />}
            <span className="tnum ml-auto text-xs text-zinc-600">
              {stage.filter((m) => m.played).length}/{stage.length}
            </span>
          </div>
          <div className={cx('grid gap-2.5', stage.length > 1 && 'xl:grid-cols-2')}>
            {stage.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                home={teams[m.homeId]}
                away={teams[m.awayId]}
                sport={t.sport}
                onSimulate={() => onSim(m.id)}
                onOpen={() => onOpen(m)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Chaveamento</p>
        <Bracket
          bracket={t.bracket}
          matches={t.matches}
          teams={teams}
          sport={t.sport}
          champion={t.champion}
          onSimulate={onSim}
          onOpen={onOpen}
          seedLabels={t.seedLabels}
        />
      </div>
    </div>
  )
}

function GroupsView({ t, teams, currentIds, onSim, onOpen }: ViewProps) {
  const standings = useMemo(() => groupStandings(t), [t])
  const groupMatches = useMemo(() => t.matches.filter((m) => m.groupId), [t])
  const hasBracket = !!t.bracket
  const [tab, setTab] = useState<'groups' | 'bracket'>(t.phase === 'knockout' || t.phase === 'finished' ? 'bracket' : 'groups')

  return (
    <div>
      {hasBracket && (
        <div className="mb-5 inline-flex rounded-xl border border-white/5 bg-ink-900 p-1">
          {(['groups', 'bracket'] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={cx(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                tab === tb ? 'bg-blood-grad text-white shadow-glow-sm' : 'text-zinc-400 hover:text-zinc-100'
              )}
            >
              {tb === 'groups' ? 'Fase de grupos' : 'Mata-mata'}
            </button>
          ))}
        </div>
      )}

      {(!hasBracket || tab === 'groups') && (
        // visão "dia de jogo": partidas da rodada ao lado das tabelas — simula
        // e vê o resultado + classificação mudando sem rolar a página
        <SplitTabs
          gridClass="min-[960px]:grid-cols-[1fr_minmax(360px,430px)]"
          left={{
            label: 'Grupos',
            node: (
              <div className="grid gap-4 lg:grid-cols-2">
                {(t.groups ?? []).map((g) => (
                  <div key={g.id} className="card p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                      <span className="h-1.5 w-1.5 bg-blood-600" /> {g.name}
                    </p>
                    <StandingsTable
                      rows={standings[g.id] ?? []}
                      teams={teams}
                      sport={t.sport}
                      qualifyCount={t.config.qualifiersPerGroup}
                      compact
                      form={formMapOf(t)}
                      seedLabels={t.seedLabels}
                    />
                  </div>
                ))}
              </div>
            )
          }}
          right={{
            label: 'Partidas',
            node: (
              <div>
                <p className="mb-3 hidden text-sm font-bold text-white min-[960px]:block">Partidas</p>
                <RoundsList
                  t={t}
                  matches={groupMatches}
                  teams={teams}
                  currentIds={currentIds}
                  onSim={onSim}
                  onOpen={onOpen}
                  allowReRoll={t.phase === 'group'}
                />
              </div>
            )
          }}
        />
      )}

      {hasBracket && tab === 'bracket' && (
        <CupView t={t} teams={teams} currentIds={currentIds} onSim={onSim} onOpen={onOpen} />
      )}
    </div>
  )
}

// Banner de campeão — dourado, com fundo Silk. `compact` encolhe pro mobile.
function ChampionBanner({
  champ,
  compact,
  className
}: {
  champ: import('../types').Team
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cx(
        'animate-fade-up relative isolate overflow-hidden border-gold-600/25',
        compact ? 'rounded-xl border px-4 py-3' : 'border-b px-6 py-4',
        className
      )}
    >
      {/* Fundo "Silk" animado (mesmo efeito da Home), tonalizado em dourado */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Silk color="#96691d" speed={1.8} scale={1.5} noiseIntensity={1} rotation={0} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-gold-950/75 via-gold-950/35 to-ink-950/60" />
      </div>
      <div className={cx('flex items-center', compact ? 'gap-3' : 'gap-4')}>
        <Trophy
          size={compact ? 22 : 28}
          className="shrink-0 text-gold-400 drop-shadow-[0_0_10px_rgba(224,175,80,0.4)]"
        />
        <TeamBadge team={champ} size={compact ? 'md' : 'lg'} />
        <div className="min-w-0">
          <p
            className={cx(
              'font-semibold uppercase tracking-[0.3em] text-gold-400',
              compact ? 'text-[10px]' : 'text-[11px]'
            )}
          >
            Campeão
          </p>
          <p
            className={cx(
              'display truncate bg-gold-grad bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(224,175,80,0.3)]',
              compact ? 'text-2xl' : 'text-4xl'
            )}
          >
            {champ.name}
          </p>
        </div>
      </div>
    </div>
  )
}

// Artilharia / abates ao vivo — visível em todos os formatos, atualiza a cada rodada.
// Clicável: abre uma tabela completa de todos os artilheiros/goleadores do torneio.
function LiveScorers({ t, teams }: { t: Tournament; teams: Record<string, import('../types').Team> }) {
  const [open, setOpen] = useState(false)
  const top = useMemo(() => tournamentScorers(t, 6), [t])
  const all = useMemo(() => tournamentScorers(t, Infinity), [t])
  if (top.length === 0) return null
  const football = t.sport === 'football'
  const unit = football ? 'gols' : 'abates'
  const Icon = football ? Goal : Crosshair
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={football ? 'Ver tabela completa de artilheiros' : 'Ver tabela completa de abates'}
        className="card mb-5 flex w-full items-center gap-4 overflow-x-auto px-4 py-3 text-left transition hover:border-blood-500/40 hover:bg-white/[0.02]"
      >
        <span className="kicker shrink-0">
          <Icon size={14} className="text-blood-400" />
          {football ? 'Artilharia' : 'Abates'}
        </span>
        {top.map((s, i) => (
          <div key={s.playerId} className="flex shrink-0 items-center gap-2">
            <span className="tnum text-xs font-bold text-zinc-600">{i + 1}</span>
            <TeamBadge team={teams[s.teamId]} size="sm" />
            <span className="whitespace-nowrap text-sm text-zinc-200">{s.name}</span>
            <span className="tnum text-sm font-bold text-white">
              {s.value}
              {football && s.assists > 0 && (
                <span className="ml-1 text-xs font-semibold text-zinc-500">· {s.assists}A</span>
              )}
            </span>
          </div>
        ))}
        <span className="shrink-0 text-[11px] text-zinc-600">{unit}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-blood-400">
          Ver tabela
          <ChevronRight size={13} />
        </span>
      </button>
      <ScorersModal open={open} onClose={() => setOpen(false)} t={t} teams={teams} scorers={all} />
    </>
  )
}

// Tabela completa de artilheiros/goleadores do torneio (futebol mostra gols + assistências).
function ScorersModal({
  open,
  onClose,
  t,
  teams,
  scorers
}: {
  open: boolean
  onClose: () => void
  t: Tournament
  teams: Record<string, import('../types').Team>
  scorers: ReturnType<typeof tournamentScorers>
}) {
  const football = t.sport === 'football'
  const Icon = football ? Goal : Crosshair
  const [view, setView] = useState<'goals' | 'assists'>('goals')
  const byAssists = view === 'assists' && football
  // "Artilharia" = quem pontuou (gols no futebol / abates no e-sports); "Assistências" reordena
  // pelo mesmo dado, só que priorizando quem deu passe pro gol em vez de quem marcou.
  const rows = byAssists
    ? scorers.filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists)
    : scorers.filter((s) => s.value > 0)
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-xl">
      <div className="border-b border-white/5 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={18} className="shrink-0 text-blood-400" />
          <h2 className="heading shrink-0 text-lg text-white">
            {byAssists ? 'Assistências' : football ? 'Artilharia' : 'Abates'}
          </h2>
          <span className="truncate text-sm text-zinc-600">· {t.name}</span>
        </div>
        {football && (
          <div className="mt-3 inline-flex rounded-xl border border-white/5 bg-ink-900 p-1">
            {(['goals', 'assists'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cx(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition',
                  view === v ? 'bg-blood-grad text-white shadow-glow-sm' : 'text-zinc-400 hover:text-zinc-100'
                )}
              >
                {v === 'goals' ? 'Artilheiros' : 'Assistências'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="max-h-[65vh] overflow-y-auto px-1.5 py-2 sm:px-2">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-6 sm:w-8" />
            <col />
            <col className="w-10 sm:w-14" />
            {football && <col className="w-10 sm:w-14" />}
          </colgroup>
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-zinc-600 sm:text-[11px]">
              <th className="px-1.5 py-2 text-right font-semibold sm:px-2">#</th>
              <th className="px-1.5 py-2 text-left font-semibold sm:px-2">Jogador</th>
              <th className="px-1.5 py-2 text-right font-semibold sm:px-2">{football ? 'Gols' : 'Abates'}</th>
              {football && <th className="px-1.5 py-2 text-right font-semibold sm:px-2">Assist.</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.playerId} className="border-t border-white/5">
                <td className="tnum px-1.5 py-2 text-right text-xs font-bold text-zinc-600 sm:px-2">{i + 1}</td>
                <td className="min-w-0 px-1.5 py-2 sm:px-2">
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <TeamBadge team={teams[s.teamId]} size="sm" className="shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-zinc-100">{s.name}</div>
                      <div className="truncate text-xs text-zinc-600">{teams[s.teamId]?.name ?? '—'}</div>
                    </div>
                  </div>
                </td>
                <td className={cx('tnum px-1.5 py-2 text-right sm:px-2', byAssists ? 'font-semibold text-zinc-400' : 'font-bold text-white')}>
                  {s.value}
                </td>
                {football && (
                  <td className={cx('tnum px-1.5 py-2 text-right sm:px-2', byAssists ? 'font-bold text-white' : 'font-semibold text-zinc-400')}>
                    {s.assists}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
