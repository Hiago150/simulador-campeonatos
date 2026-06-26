import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChartBig,
  Gauge,
  Pause,
  Play,
  Plus,
  Swords,
  TrendingUp
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis
} from 'recharts'
import { AnimatePresence, motion } from 'framer-motion'
import type { Team, Tournament } from '../types'
import { useApp } from '../store/app'
import { useHistory } from '../store/history'
import { teamMap } from '../engine/selectors'
import {
  groupEvolution,
  historyHeadToHead,
  knockoutEvolution,
  leagueEvolution,
  tournamentHeadToHead,
  type RoundSnapshot
} from '../engine/stats'
import { SPORT_META } from '../lib/meta'
import { Button, EmptyState, Segmented } from '../components/ui'
import { Reveal } from '../components/motionx'
import { TeamBadge } from '../components/TeamBadge'
import { cx } from '../lib/cx'

type Tab = 'evolution' | 'racing' | 'h2h'

export function StatsScreen() {
  const t = useApp((s) => s.current)
  const newTournament = useApp((s) => s.newTournament)
  const go = useApp((s) => s.go)

  if (!t) {
    return (
      <div className="flex h-full items-center justify-center px-8">
        <div className="text-center">
          <EmptyState
            icon={<BarChartBig size={48} />}
            title="Nenhum campeonato para analisar"
            hint="Crie e simule um campeonato para ver gráficos de evolução, confrontos e a corrida pelo título."
          />
          <Button variant="primary" icon={<Plus size={16} />} className="mt-2" onClick={() => newTournament()}>
            Criar campeonato
          </Button>
        </div>
      </div>
    )
  }

  return <StatsBody t={t} go={go} />
}

function StatsBody({ t, go }: { t: Tournament; go: (s: 'tournament') => void }) {
  const teams = useMemo(() => teamMap(t), [t])
  const history = useHistory((s) => s.data)

  const availableTabs: Tab[] = t.format === 'cup' ? ['racing', 'h2h'] : ['evolution', 'racing', 'h2h']
  const [tab, setTab] = useState<Tab>(availableTabs[0])
  const inProgress = t.phase !== 'finished'

  const TAB_META: Record<Tab, { label: string; icon: typeof Activity }> = {
    evolution: { label: 'Evolução', icon: TrendingUp },
    racing: { label: 'Corrida do ranking', icon: Activity },
    h2h: { label: 'Confrontos', icon: Swords }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <Reveal>
            <p className="kicker mb-3">
              <span className="h-1.5 w-1.5 bg-blood-600" />
              Análise do campeonato
            </p>
            <h1 className="display text-5xl text-zinc-100 md:text-6xl">
              Os <span className="italic text-blood-500">números</span>
            </h1>
            <button
              onClick={() => go('tournament')}
              className="mt-3 text-sm text-zinc-500 transition hover:text-blood-300"
            >
              {SPORT_META[t.sport].emoji} {t.name} →
            </button>
          </Reveal>
          {inProgress && (
            <Reveal delay={0.08}>
              <span className="tag animate-pulse-glow bg-amber-950/40 text-amber-300">● Em progresso</span>
            </Reveal>
          )}
        </div>

        <div className="mb-6">
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            options={availableTabs.map((tb) => ({
              value: tb,
              label: (
                <span className="flex items-center gap-1.5">
                  {(() => {
                    const Icon = TAB_META[tb].icon
                    return <Icon size={14} />
                  })()}
                  {TAB_META[tb].label}
                </span>
              )
            }))}
          />
        </div>

        {tab === 'evolution' && <EvolutionTab t={t} teams={teams} />}
        {tab === 'racing' && <RacingTab t={t} teams={teams} />}
        {tab === 'h2h' && <HeadToHeadTab t={t} teams={teams} history={history} />}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
//  Helpers
// ------------------------------------------------------------------

function trimSnaps(snaps: RoundSnapshot[], t: Tournament, groupId?: string): RoundSnapshot[] {
  const played = t.matches.filter((m) => m.played && (groupId ? m.groupId === groupId : !m.groupId))
  const maxR = played.reduce((mx, m) => Math.max(mx, m.round), 0)
  return snaps.filter((s) => s.round <= maxR)
}

function snapTeams(snaps: RoundSnapshot[], teams: Record<string, Team>): Team[] {
  if (snaps.length === 0) return []
  return snaps[snaps.length - 1].rows
    .map((r) => teams[r.teamId])
    .filter(Boolean) as Team[]
}

function useGroupSelection(t: Tournament): [string, (g: string) => void, string[]] {
  const groupIds = (t.groups ?? []).map((g) => g.id)
  const [sel, setSel] = useState(groupIds[0] ?? '')
  return [sel, setSel, groupIds]
}

function GroupPicker({ ids, value, onChange }: { ids: string[]; value: string; onChange: (g: string) => void }) {
  if (ids.length <= 1) return null
  return (
    <div className="mb-4">
      <Segmented
        value={value}
        onChange={onChange}
        options={ids.map((id) => ({ value: id, label: id === '__ko__' ? 'Mata-mata' : `Grupo ${id}` }))}
      />
    </div>
  )
}

// ------------------------------------------------------------------
//  Tab 1 — Evolução de pontos (linha)
// ------------------------------------------------------------------

function EvolutionTab({ t, teams }: { t: Tournament; teams: Record<string, Team> }) {
  const isGroups = t.format === 'groups'
  const [group, setGroup, groupIds] = useGroupSelection(t)

  const snaps = useMemo(() => {
    const raw = isGroups ? (groupEvolution(t)[group] ?? []) : leagueEvolution(t)
    return trimSnaps(raw, t, isGroups ? group : undefined)
  }, [t, isGroups, group])

  const lineTeams = useMemo(() => snapTeams(snaps, teams), [snaps, teams])
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const data = useMemo(
    () =>
      snaps.map((s) => {
        const row: Record<string, number> = { round: s.round }
        for (const r of s.rows) row[r.teamId] = r.points
        return row
      }),
    [snaps]
  )

  if (snaps.length === 0) {
    return <NoData />
  }

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="card p-5">
      {isGroups && <GroupPicker ids={groupIds} value={group} onChange={setGroup} />}
      <p className="mb-1 text-sm font-bold text-white">Evolução de pontos</p>
      <p className="mb-4 text-xs text-zinc-500">Pontos acumulados ao longo das rodadas. Clique num time para ocultar.</p>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="round"
              stroke="#52525e"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickFormatter={(v) => `R${v}`}
            />
            <YAxis stroke="#52525e" tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} width={36} />
            <RTooltip content={<EvoTooltip teams={teams} />} />
            {lineTeams.map((team) => (
              <Line
                key={team.id}
                type="monotone"
                dataKey={team.id}
                name={team.name}
                stroke={team.color}
                strokeWidth={2}
                dot={false}
                hide={hidden.has(team.id)}
                isAnimationActive
                animationDuration={1500}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {lineTeams.map((team) => {
          const off = hidden.has(team.id)
          return (
            <button
              key={team.id}
              onClick={() => toggle(team.id)}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                off ? 'border-white/5 text-zinc-600' : 'border-white/10 text-zinc-200 hover:bg-white/5'
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: off ? '#3f3f46' : team.color }} />
              {team.shortName}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EvoTooltip({
  active,
  payload,
  label,
  teams
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string }[]
  label?: number
  teams: Record<string, Team>
}) {
  if (!active || !payload || payload.length === 0) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value).slice(0, 10)
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 shadow-card backdrop-blur">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">Rodada {label}</p>
      <div className="space-y-0.5">
        {sorted.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="flex-1 text-zinc-300">{teams[p.dataKey]?.shortName ?? p.dataKey}</span>
            <span className="tnum font-bold text-white">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
//  Tab 2 — Corrida do ranking (racing chart animado)
// ------------------------------------------------------------------

function RacingTab({ t, teams }: { t: Tournament; teams: Record<string, Team> }) {
  const isGroups = t.format === 'groups'
  const isCup = t.format === 'cup'
  const hasKO = !!t.bracket && t.bracket.length > 0
  const [group, setGroup, groupIds] = useGroupSelection(t)
  // grupos + "Mata-mata" (quando o chaveamento já existir)
  const pickerIds = isGroups && hasKO ? [...groupIds, '__ko__'] : groupIds

  const snaps = useMemo(() => {
    if (isCup) return knockoutEvolution(t)
    if (isGroups && group === '__ko__') return knockoutEvolution(t)
    if (isGroups) return trimSnaps(groupEvolution(t)[group] ?? [], t, group)
    return trimSnaps(leagueEvolution(t), t)
  }, [t, isGroups, isCup, group])

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // reinicia ao trocar de grupo / dados
  useEffect(() => {
    setIndex(0)
    setPlaying(false)
  }, [group, snaps.length])

  useEffect(() => {
    if (!playing) return
    if (index >= snaps.length - 1) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setIndex((i) => Math.min(i + 1, snaps.length - 1)), 1600 / speed)
    return () => clearTimeout(id)
  }, [playing, index, speed, snaps.length])

  if (snaps.length === 0) return <NoData />

  const current = snaps[Math.min(index, snaps.length - 1)]
  const rows = [...current.rows].sort((a, b) => a.rank - b.rank)
  const maxPts = Math.max(1, ...snaps[snaps.length - 1].rows.map((r) => r.points))
  const atEnd = index >= snaps.length - 1

  return (
    <div className="card p-5">
      {isGroups && <GroupPicker ids={pickerIds} value={group} onChange={setGroup} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">Corrida do ranking</p>
          <p className="text-xs text-zinc-500">
            Rodada <span className="tnum font-bold text-blood-300">{current.round}</span> de {snaps.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (atEnd) setIndex(0)
              setPlaying((p) => !p)
            }}
            className="flex h-10 items-center gap-2 rounded-xl bg-blood-grad px-4 text-sm font-bold text-white shadow-glow-sm transition hover:brightness-110 active:scale-95"
          >
            {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            {playing ? 'Pausar' : atEnd ? 'Repetir' : 'Reproduzir'}
          </button>
          <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-ink-900 p-1">
            <Gauge size={14} className="ml-1 text-zinc-500" />
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cx(
                  'rounded-lg px-2 py-1 text-xs font-bold transition',
                  speed === s ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* barra de scrub */}
      <input
        type="range"
        min={0}
        max={snaps.length - 1}
        value={index}
        onChange={(e) => {
          setPlaying(false)
          setIndex(Number(e.target.value))
        }}
        className="mb-5 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-glow-sm"
        style={{
          background: `linear-gradient(90deg, #e01b1b ${(index / Math.max(1, snaps.length - 1)) * 100}%, #26262d ${
            (index / Math.max(1, snaps.length - 1)) * 100
          }%)`
        }}
      />

      <div className="space-y-2">
        <AnimatePresence>
          {rows.map((r) => {
            const team = teams[r.teamId]
            const pct = (r.points / maxPts) * 100
            return (
              <motion.div
                key={r.teamId}
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 42 }}
                className="flex items-center gap-3"
              >
                <span className="tnum w-5 text-center text-sm font-bold text-zinc-600">{r.rank}</span>
                <TeamBadge team={team} size="sm" />
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-ink-800">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center rounded-lg transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: team?.color ?? '#52525e' }}
                  >
                    <span className="truncate px-2 text-xs font-bold" style={{ color: contrast(team?.color) }}>
                      {team?.shortName}
                    </span>
                  </div>
                </div>
                <span className="tnum w-8 text-right text-sm font-bold text-white">{r.points}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

function contrast(hex?: string): string {
  if (!hex) return '#fff'
  const h = hex.replace('#', '')
  if (h.length < 6) return '#fff'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0a0a0b' : '#ffffff'
}

// ------------------------------------------------------------------
//  Tab 3 — Confrontos diretos (head-to-head)
// ------------------------------------------------------------------

function HeadToHeadTab({
  t,
  teams,
  history
}: {
  t: Tournament
  teams: Record<string, Team>
  history: import('../types').History
}) {
  const ids = t.teams.map((x) => x.id)
  // abre num confronto que de fato aconteceu (senão o usuário cai num par que nunca se enfrentou)
  const firstPlayed = t.matches.find((m) => m.played)
  const [aId, setAId] = useState(firstPlayed?.homeId ?? ids[0])
  const [bId, setBId] = useState(firstPlayed?.awayId ?? ids[1] ?? ids[0])

  const a = teams[aId]
  const b = teams[bId]
  const same = aId === bId

  const local = useMemo(() => tournamentHeadToHead(t, aId, bId), [t, aId, bId])
  const allTime = useMemo(() => historyHeadToHead(history, aId, bId), [history, aId, bId])
  const unit = SPORT_META[t.sport].unit

  const total = local.aWins + local.bWins + local.draws

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-3">
          <TeamSelect label="Time A" value={aId} onChange={setAId} teams={t.teams} />
          <TeamSelect label="Time B" value={bId} onChange={setBId} teams={t.teams} />
        </div>
      </div>

      {same ? (
        <div className="card p-8 text-center text-sm text-zinc-500">Selecione dois times diferentes.</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-4 bg-gradient-to-b from-blood-950/20 to-transparent p-6">
              <div className="flex flex-1 flex-col items-center gap-2">
                <TeamBadge team={a} size="lg" />
                <span className="text-center text-sm font-semibold text-zinc-200">{a?.name}</span>
                <span className="heading text-3xl font-bold text-white">{local.aWins}</span>
              </div>
              <div className="flex flex-col items-center">
                <Swords size={22} className="text-zinc-600" />
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  {local.draws} empate{local.draws === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-1 flex-col items-center gap-2">
                <TeamBadge team={b} size="lg" />
                <span className="text-center text-sm font-semibold text-zinc-200">{b?.name}</span>
                <span className="heading text-3xl font-bold text-white">{local.bWins}</span>
              </div>
            </div>

            {total > 0 ? (
              <div className="px-6 pb-5">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-800">
                  <div style={{ width: `${(local.aWins / total) * 100}%`, backgroundColor: a?.color }} />
                  <div className="bg-zinc-600" style={{ width: `${(local.draws / total) * 100}%` }} />
                  <div style={{ width: `${(local.bWins / total) * 100}%`, backgroundColor: b?.color }} />
                </div>
                <p className="mt-3 text-center text-xs text-zinc-500">
                  No histórico (todas as edições):{' '}
                  <span className="font-bold text-zinc-300">
                    {allTime.aWins} – {allTime.draws} – {allTime.bWins}
                  </span>
                </p>
              </div>
            ) : (
              <p className="px-6 pb-6 text-center text-sm text-zinc-500">
                Estes times ainda não se enfrentaram neste campeonato.
              </p>
            )}
          </div>

          {local.matches.length > 0 && (
            <div className="card p-5">
              <p className="mb-3 text-sm font-bold text-white">Confrontos no campeonato</p>
              <div className="space-y-1.5">
                {local.matches.map((m) => {
                  const homeT = teams[m.homeId]
                  const awayT = teams[m.awayId]
                  const homeWin = m.winnerId ? m.winnerId === m.homeId : m.homeScore > m.awayScore
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2">
                      <span className="w-28 shrink-0 text-[11px] text-zinc-600">{m.stage}</span>
                      <div className="flex flex-1 items-center justify-end gap-2">
                        <span className={cx('text-sm', homeWin ? 'font-bold text-white' : 'text-zinc-400')}>{homeT?.shortName}</span>
                        <TeamBadge team={homeT} size="sm" />
                      </div>
                      <span className="tnum px-2 text-sm font-bold text-white">
                        {m.homeScore} : {m.awayScore}
                      </span>
                      <div className="flex flex-1 items-center gap-2">
                        <TeamBadge team={awayT} size="sm" />
                        <span className={cx('text-sm', !homeWin ? 'font-bold text-white' : 'text-zinc-400')}>{awayT?.shortName}</span>
                      </div>
                      {m.penalties && (
                        <span className="text-[10px] font-semibold text-blood-300">pên {m.penalties[0]}-{m.penalties[1]}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <p className="px-1 text-center text-xs text-zinc-600">
            Placar = {unit === 'gols' ? 'gols' : 'mapas vencidos'}.
          </p>
        </>
      )}
    </div>
  )
}

function TeamSelect({
  label,
  value,
  onChange,
  teams
}: {
  label: string
  value: string
  onChange: (v: string) => void
  teams: Team[]
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
      <div className="flex items-center gap-2">
        <TeamBadge team={teams.find((x) => x.id === value)} size="md" />
        <select className="input flex-1" value={value} onChange={(e) => onChange(e.target.value)}>
          {teams.map((tm) => (
            <option key={tm.id} value={tm.id} className="bg-ink-900">
              {tm.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function NoData() {
  return (
    <div className="card p-10">
      <EmptyState
        icon={<Activity size={40} />}
        title="Sem dados ainda"
        hint="Simule pelo menos uma rodada para ver a evolução do campeonato."
      />
    </div>
  )
}
