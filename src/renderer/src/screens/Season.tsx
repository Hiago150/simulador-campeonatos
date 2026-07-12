import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Crown,
  Flag,
  Flame,
  Layers,
  Medal,
  Play,
  Plus,
  Search,
  Swords,
  TrendingDown,
  TrendingUp,
  Trash2,
  Trophy,
  Users,
  Wand2,
  X
} from 'lucide-react'
import type {
  BestOf,
  DivisionBoundary,
  EsportsGame,
  Format,
  Season,
  SeasonSlot,
  SeasonYearEntry,
  Sport,
  Team,
  TeamCategory,
  TournamentConfig
} from '../types'
import { useApp } from '../store/app'
import { useSeasons, resolveSlotTeamIds } from '../store/season'
import { useHistory } from '../store/history'
import { presetsForSport } from '../data/teams'
import { collectionsForSport, collectionsGrouped } from '../data/collections'
import { seasonPresetsGrouped, type SeasonPreset } from '../data/season-presets'
import { FORMAT_META, GAME_META, SPORT_META, FORMATS, ESPORTS_GAMES } from '../lib/meta'
import { Button, Segmented, Stepper, Toggle } from '../components/ui'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { TeamBadge } from '../components/TeamBadge'
import { cx } from '../lib/cx'
import { uid } from '../engine/rng'

type MainView = 'list' | 'wizard' | 'hub' | 'summary' | 'finale' | 'hall' | 'form' | 'year-detail'

function viewForStatus(status: Season['status']): MainView {
  if (status === 'completed') return 'finale'
  if (status === 'year-summary') return 'summary'
  return 'hub'
}

export function SeasonScreen() {
  const activeSeason = useSeasons((s) => s.activeSeason)

  const [view, setView] = useState<MainView>(() =>
    activeSeason ? viewForStatus(activeSeason.status) : 'list'
  )
  const [detailYear, setDetailYear] = useState<number | null>(null)

  const goToSeason = (s: Season) => setView(viewForStatus(s.status))
  const backToStatus = () => setView(activeSeason ? viewForStatus(activeSeason.status) : 'list')

  if (view === 'wizard') return <SeasonWizard onBack={() => setView('list')} onDone={(s) => goToSeason(s)} />
  if (view === 'hub')
    return <SeasonHub onLeave={() => setView('list')} onHall={() => setView('hall')} onForm={() => setView('form')} />
  if (view === 'summary')
    return <SeasonYearSummary onNext={() => setView('hub')} onLeave={() => setView('list')} onHall={() => setView('hall')} />
  if (view === 'finale')
    return <SeasonFinale onLeave={() => setView('list')} onHall={() => setView('hall')} />
  if (view === 'form') return <SeasonFormScreen onBack={backToStatus} />
  if (view === 'hall')
    return (
      <SeasonHallOfFame
        onBack={backToStatus}
        onYear={(y) => {
          setDetailYear(y)
          setView('year-detail')
        }}
      />
    )
  if (view === 'year-detail' && detailYear != null)
    return <SeasonYearDetail year={detailYear} onBack={() => setView('hall')} />
  return <SeasonList onNew={() => setView('wizard')} onResume={(s) => goToSeason(s)} />
}

// ─── Helpers de recordes ────────────────────────────────────────────────────

/** maior sequência de anos consecutivos com pelo menos um título, por time */
function longestTitleStreak(
  years: SeasonYearEntry[]
): { teamId: string; teamName: string; streak: number } | null {
  const sorted = [...years].sort((a, b) => a.year - b.year)
  const running: Record<string, { count: number; lastYear: number; name: string }> = {}
  let best: { teamId: string; teamName: string; streak: number } | null = null
  for (const y of sorted) {
    const winnersThisYear = new Set(y.champions.map((c) => c.teamId))
    for (const c of y.champions) {
      const r = running[c.teamId]
      if (r && r.lastYear === y.year - 1) {
        r.count++
        r.lastYear = y.year
      } else if (!r || r.lastYear !== y.year) {
        running[c.teamId] = { count: 1, lastYear: y.year, name: c.teamName }
      }
      const cur = running[c.teamId]
      if (!best || cur.count > best.streak) best = { teamId: c.teamId, teamName: cur.name, streak: cur.count }
    }
    // zera quem não ganhou neste ano (quebra de sequência)
    for (const id of Object.keys(running)) {
      if (!winnersThisYear.has(id) && running[id].lastYear < y.year) delete running[id]
    }
  }
  return best
}

// ─── Lista de temporadas ────────────────────────────────────────────────────

function SeasonList({ onNew, onResume }: { onNew: () => void; onResume: (s: Season) => void }) {
  const { seasons, setActiveSeason, deleteSeason, renameSeason } = useSeasons()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Season | null>(null)

  const handleResume = (s: Season) => {
    setActiveSeason(s.id)
    onResume(s)
  }

  const startRename = (s: Season) => {
    setRenaming(s.id)
    setRenameVal(s.name)
  }

  const confirmRename = (id: string) => {
    if (renameVal.trim()) renameSeason(id, renameVal.trim())
    setRenaming(null)
  }

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="kicker mb-3">
              <span className="h-1.5 w-1.5 bg-blood-600" />
              Modo Temporada
            </p>
            <h1 className="display text-5xl text-zinc-100">Temporadas</h1>
          </div>
          <Button variant="primary" icon={<Plus size={15} />} onClick={onNew}>
            Nova temporada
          </Button>
        </div>

        {seasons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <CalendarDays size={40} className="text-zinc-700" />
            <p className="text-zinc-400">Nenhuma temporada criada ainda.</p>
            <p className="text-sm text-zinc-600">
              Uma temporada define uma sequência de campeonatos que se repete por vários anos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {seasons.map((s) => {
              const sport = SPORT_META[s.sport]
              const game = s.game ? GAME_META[s.game] : null
              const totalSlotsDone = (s.currentYear - 1) * s.slots.length + s.currentSlotIndex
              const totalSlots = s.period * s.slots.length
              const pct = totalSlots > 0 ? Math.round((totalSlotsDone / totalSlots) * 100) : 0
              const statusLabel =
                s.status === 'completed'
                  ? 'Encerrada'
                  : s.status === 'year-summary'
                    ? `Ano ${s.currentYear} — resumo`
                    : `Ano ${s.currentYear}/${s.period} · Campeonato ${s.currentSlotIndex + 1}/${s.slots.length}`

              return (
                <div key={s.id} className="panel p-4">
                  {renaming === s.id ? (
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        className="input flex-1"
                        value={renameVal}
                        autoFocus
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename(s.id)
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                      />
                      <Button onClick={() => confirmRename(s.id)}>Salvar</Button>
                      <button onClick={() => setRenaming(null)} className="text-zinc-500 hover:text-zinc-200">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <button
                          className="display text-xl text-zinc-100 hover:text-blood-300 transition-colors"
                          onClick={() => startRename(s)}
                          title="Clique para renomear"
                        >
                          {s.name}
                        </button>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="tag">
                            {sport.emoji} {sport.label}
                          </span>
                          {game && (
                            <span className="tag">
                              {game.emoji} {game.short}
                            </span>
                          )}
                          <span className="tag">{s.period} anos</span>
                          <span className="tag">{s.slots.length} campeonatos/ano</span>
                          <span className="tag">{s.teamPool.length} times</span>
                          <span
                            className={cx(
                              'tag',
                              s.status === 'completed'
                                ? 'border-win-700/40 text-win-400'
                                : 'border-blood-700/40 text-blood-300'
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmDelete(s)}
                        className="mt-1 text-zinc-600 hover:text-blood-400 transition-colors"
                        title="Excluir temporada"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-blood-grad transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="tnum text-xs text-zinc-500">{pct}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">Criada em {fmt(s.createdAt)}</span>
                    {s.status !== 'completed' && (
                      <Button variant="primary" icon={<Play size={13} />} onClick={() => handleResume(s)}>
                        Continuar
                      </Button>
                    )}
                    {s.status === 'completed' && (
                      <Button onClick={() => handleResume(s)}>Ver resumo final</Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir temporada?"
        message={`“${confirmDelete?.name ?? ''}” e todo o seu histórico (anos, campeões, artilharia) serão apagados. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteSeason(confirmDelete.id)
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}

// ─── Wizard de criação ──────────────────────────────────────────────────────

type WizardStep = 'basic' | 'teams' | 'championships' | 'review'
const STEPS: WizardStep[] = ['basic', 'teams', 'championships', 'review']
const STEP_LABEL: Record<WizardStep, string> = {
  basic: 'Básico',
  teams: 'Times',
  championships: 'Campeonatos',
  review: 'Revisão'
}

const PERIOD_OPTIONS = [5, 10, 15, 20, 30]

const SEASON_CAT_LABEL: Record<TeamCategory, string> = {
  club: 'Clubes',
  national: 'Seleções',
  custom: 'Meus times'
}

function defaultConfig(sport: Sport, game?: EsportsGame): TournamentConfig {
  return {
    pureRandom: false,
    homeAndAway: false,
    bestOf: 3,
    game: sport === 'esports' ? (game ?? 'cs2') : undefined,
    groupCount: 4,
    qualifiersPerGroup: 2,
    swissRounds: 5
  }
}

function SeasonWizard({ onBack, onDone }: { onBack: () => void; onDone: (s: Season) => void }) {
  const customTeams = useApp((st) => st.customTeams)
  const teamOverrides = useApp((st) => st.teamOverrides)
  const createSeason = useSeasons((s) => s.createSeason)

  const [step, setStep] = useState<WizardStep>('basic')
  const [name, setName] = useState('Minha Temporada')
  const [sport, setSport] = useState<Sport>('football')
  const [game, setGame] = useState<EsportsGame>('cs2')
  const [period, setPeriod] = useState(10)
  const [poolIds, setPoolIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [slots, setSlots] = useState<SeasonSlot[]>([])
  const [boundaries, setBoundaries] = useState<DivisionBoundary[]>([])
  const [catFilter, setCatFilter] = useState<TeamCategory | 'all'>('all')
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  // marca os campeonatos com elenco próprio (preenchido por preset)
  const [presetApplied, setPresetApplied] = useState(false)

  const pool = useMemo<Team[]>(
    () =>
      [...presetsForSport(sport), ...customTeams.filter((t) => t.sport === sport)].map((t) =>
        teamOverrides[t.id] ? { ...t, ...teamOverrides[t.id] } : t
      ),
    [sport, customTeams, teamOverrides]
  )

  const seasonPresetGroups = useMemo(() => seasonPresetsGrouped(sport), [sport])
  const collections = useMemo(() => collectionsForSport(sport), [sport])
  const collectionGroups = useMemo(() => collectionsGrouped(sport), [sport])

  const cats = useMemo(() => {
    const set = new Set(pool.map((t) => t.category))
    return (['club', 'national', 'custom'] as TeamCategory[]).filter((c) => set.has(c))
  }, [pool])

  const filtered = useMemo(() => {
    const colIds = collectionId ? collections.find((c) => c.id === collectionId)?.teamIds : undefined
    const colSet = colIds ? new Set(colIds) : undefined
    return pool.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (colSet && !colSet.has(t.id)) return false
      return true
    })
  }, [pool, search, catFilter, collectionId, collections])

  const selectedTeams = useMemo(() => pool.filter((t) => poolIds.includes(t.id)), [pool, poolIds])

  const toggleTeam = (id: string) =>
    setPoolIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const changeSport = (sp: Sport) => {
    setSport(sp)
    setPoolIds([])
    setSlots([])
    setBoundaries([])
    setCatFilter('all')
    setCollectionId(null)
    setPresetApplied(false)
  }

  const applyPreset = (p: SeasonPreset) => {
    setSport(p.sport)
    if (p.game) setGame(p.game)
    setName(p.label)
    setPeriod(p.period)
    setCatFilter('all')
    setCollectionId(null)
    setSearch('')
    // ids nascem antes pra que qualifiesFrom (índice no preset) vire slotId real
    const slotIds = p.slots.map(() => uid('slot'))
    const built: SeasonSlot[] = p.slots.map((sl, i) => ({
      id: slotIds[i],
      name: sl.name,
      format: sl.format,
      teamIds: sl.teamIds.length > 0 ? sl.teamIds : undefined,
      qualifiesFrom: sl.qualifiesFrom?.map((q) => ({
        slotId: slotIds[q.slot],
        count: q.count,
        offset: q.offset
      })),
      config: {
        ...defaultConfig(p.sport, p.game),
        ...sl.config,
        game: p.sport === 'esports' ? p.game ?? 'cs2' : undefined
      }
    }))
    setSlots(built)
    const available = new Set([
      ...presetsForSport(p.sport).map((t) => t.id),
      ...customTeams.filter((t) => t.sport === p.sport).map((t) => t.id)
    ])
    const union = Array.from(new Set(p.slots.flatMap((sl) => sl.teamIds))).filter((id) => available.has(id))
    setPoolIds(union)
    setPresetApplied(true)
    setPresetsOpen(false)
  }

  const addSlot = () => {
    if (slots.length >= 10) return
    setSlots((prev) => [
      ...prev,
      {
        id: uid('slot'),
        name: `Campeonato ${prev.length + 1}`,
        format: 'league',
        config: defaultConfig(sport, sport === 'esports' ? game : undefined)
      }
    ])
  }

  const updateSlot = (idx: number, patch: Partial<SeasonSlot>) =>
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))

  const removeSlot = (idx: number) => {
    const removed = slots[idx]
    setSlots((prev) => prev.filter((_, i) => i !== idx))
    // remove ligações que apontavam pro slot excluído
    if (removed) setBoundaries((prev) => prev.filter((b) => b.upperSlotId !== removed.id && b.lowerSlotId !== removed.id))
  }

  // ligações válidas: slots existem, são diferentes e ambos têm elenco próprio
  const validBoundaries = useMemo(
    () =>
      boundaries.filter((b) => {
        if (b.upperSlotId === b.lowerSlotId || b.count < 1) return false
        const upper = slots.find((s) => s.id === b.upperSlotId)
        const lower = slots.find((s) => s.id === b.lowerSlotId)
        return !!upper?.teamIds?.length && !!lower?.teamIds?.length
      }),
    [boundaries, slots]
  )

  const stepIdx = STEPS.indexOf(step)

  const canNext = useMemo(() => {
    if (step === 'basic') return name.trim().length > 0
    if (step === 'teams') return poolIds.length >= 2
    if (step === 'championships') return slots.length > 0 && slots.every((s) => s.name.trim())
    return true
  }, [step, name, poolIds, slots])

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1])
  }

  const handleBack = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1])
    else onBack()
  }

  const handleCreate = () => {
    const s = createSeason({
      name: name.trim(),
      sport,
      game: sport === 'esports' ? game : undefined,
      period,
      slots,
      divisionBoundaries: validBoundaries.length ? validBoundaries : undefined,
      teamPool: selectedTeams
    })
    onDone(s)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <button onClick={handleBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-6">
          <h1 className="display text-4xl text-zinc-100">
            Nova <span className="italic text-blood-500">temporada</span>
          </h1>
          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done = i < stepIdx
              const active = s === step
              return (
                <div key={s} className="flex items-center">
                  <div
                    className={cx(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                      active ? 'bg-blood-600 text-white' : done ? 'bg-blood-950 text-blood-400' : 'bg-ink-800 text-zinc-500'
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cx(
                      'mx-2 text-[11px] font-semibold uppercase tracking-wide',
                      active ? 'text-zinc-200' : done ? 'text-blood-400' : 'text-zinc-600'
                    )}
                  >
                    {STEP_LABEL[s]}
                  </span>
                  {i < STEPS.length - 1 && <div className="mr-2 h-px w-6 bg-white/10" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step: Básico */}
        {step === 'basic' && (
          <div className="flex flex-col gap-4">
            {/* Presets de temporada (recolhido) */}
            <div>
              <button
                onClick={() => setPresetsOpen((o) => !o)}
                className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-ink-850/60 px-3 py-2.5 text-left transition hover:border-blood-600/40"
              >
                <Wand2 size={14} className="text-blood-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Modelos de temporada
                </span>
                <span className="text-[11px] text-zinc-600">— monta a sequência e os times</span>
                <ChevronDown
                  size={16}
                  className={cx('ml-auto text-zinc-500 transition-transform', presetsOpen && 'rotate-180')}
                />
              </button>
              {presetsOpen && (
                <div className="mt-2 space-y-4 rounded-xl border border-white/5 bg-ink-900/40 p-3">
                  {seasonPresetGroups.map((grp) => (
                    <div key={grp.group}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        {grp.group}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {grp.items.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => applyPreset(p)}
                            title={p.description}
                            className="group flex flex-col gap-1 rounded-xl border border-white/5 bg-ink-850/60 p-3 text-left transition hover:border-blood-600/50 hover:bg-blood-950/15"
                          >
                            <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-100">
                              <span>{p.emoji}</span>
                              <span className="truncate">{p.label}</span>
                            </span>
                            <span className="line-clamp-2 text-[11px] leading-snug text-zinc-500">{p.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {presetApplied && (
              <div className="rounded-xl border border-blood-800/30 bg-blood-950/15 px-3 py-2 text-[11px] text-zinc-400">
                Preset aplicado: cada campeonato já tem seu elenco. Você pode revisar tudo nos próximos passos.
              </div>
            )}

            <div className="panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Nome da temporada</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Era Dorada"
                autoFocus
              />
            </div>
            <div className="panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Modalidade</label>
              <Segmented
                value={sport}
                onChange={changeSport}
                options={(['football', 'esports'] as Sport[]).map((sp) => ({
                  value: sp,
                  label: (
                    <span className="flex items-center gap-1.5">
                      {SPORT_META[sp].emoji} {SPORT_META[sp].label}
                    </span>
                  )
                }))}
              />
            </div>
            {sport === 'esports' && (
              <div className="panel p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Jogo</label>
                <Segmented
                  value={game}
                  onChange={setGame}
                  options={ESPORTS_GAMES.map((g) => ({
                    value: g,
                    label: (
                      <span className="flex items-center gap-1.5">
                        {GAME_META[g].emoji} {GAME_META[g].label}
                      </span>
                    )
                  }))}
                />
              </div>
            )}
            <div className="panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Duração (anos)
              </label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cx(
                      'h-9 w-16 rounded-xl border text-sm font-bold transition',
                      period === p
                        ? 'border-blood-600/60 bg-blood-950/25 text-blood-300'
                        : 'border-white/5 bg-ink-800 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                Cada ano simula todos os campeonatos definidos na sequência.
              </p>
            </div>
          </div>
        )}

        {/* Step: Times */}
        {step === 'teams' && (
          <div className="panel flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Users size={16} className="text-blood-400" /> Pool de times
                <span className="tnum rounded-full bg-blood-950/50 px-2 py-0.5 text-xs text-blood-200">
                  {poolIds.length}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPoolIds(filtered.map((t) => t.id))}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Todos ({filtered.length})
                </button>
                <button
                  onClick={() => setPoolIds([])}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                className="input pl-8"
                placeholder="Buscar time…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filtro por categoria */}
            {cats.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {(['all', ...cats] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCatFilter(c)}
                    className={cx(
                      'rounded-full px-3 py-1 text-xs font-semibold transition',
                      catFilter === c ? 'bg-blood-grad text-white' : 'bg-ink-800 text-zinc-400 hover:text-zinc-100'
                    )}
                  >
                    {c === 'all' ? 'Todos' : SEASON_CAT_LABEL[c]}
                  </button>
                ))}
              </div>
            )}

            {/* Coleções prontas (recolhido) */}
            {collections.length > 0 && (
              <div>
                <button
                  onClick={() => setCollectionsOpen((o) => !o)}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-ink-850/60 px-3 py-2 text-left transition hover:border-blood-600/40"
                >
                  <Layers size={13} className="text-blood-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Coleções
                  </span>
                  {collectionId && (
                    <span className="rounded-full bg-blood-950/50 px-2 py-0.5 text-[10px] font-semibold text-blood-200">
                      {collections.find((c) => c.id === collectionId)?.label}
                    </span>
                  )}
                  <ChevronDown
                    size={15}
                    className={cx('ml-auto text-zinc-500 transition-transform', collectionsOpen && 'rotate-180')}
                  />
                </button>
                {collectionsOpen && (
                  <div className="mt-2 space-y-3 rounded-xl border border-white/5 bg-ink-900/40 p-3">
                    {collectionGroups.map((grp) => (
                      <div key={grp.group}>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                          {grp.group}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {grp.items.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setCollectionId((cur) => (cur === c.id ? null : c.id))}
                              className={cx(
                                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                                collectionId === c.id
                                  ? 'border-blood-600 bg-blood-950/40 text-blood-200'
                                  : 'border-paper/10 text-zinc-400 hover:text-zinc-100'
                              )}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {collectionId && (
                      <button
                        onClick={() => setCollectionId(null)}
                        className="text-xs text-zinc-500 underline hover:text-zinc-200"
                      >
                        limpar filtro
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid max-h-[42vh] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
              {filtered.map((t) => {
                const sel = poolIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTeam(t.id)}
                    className={cx(
                      'flex items-center gap-2 rounded-xl border p-2 text-left transition',
                      sel
                        ? 'border-blood-600/50 bg-blood-950/25'
                        : 'border-white/5 bg-ink-800/60 hover:border-white/15'
                    )}
                  >
                    <TeamBadge team={t} size="sm" />
                    <span className="truncate text-xs font-medium text-zinc-200">{t.name}</span>
                  </button>
                )
              })}
            </div>
            {poolIds.length < 2 && (
              <p className="text-xs text-zinc-500">Selecione pelo menos 2 times.</p>
            )}
          </div>
        )}

        {/* Step: Campeonatos */}
        {step === 'championships' && (
          <div className="flex flex-col gap-3">
            {slots.map((slot, idx) => (
              <SlotEditor
                key={slot.id}
                slot={slot}
                index={idx}
                sport={sport}
                game={sport === 'esports' ? game : undefined}
                poolTeams={selectedTeams}
                earlierSlots={slots.slice(0, idx)}
                onChange={(patch) => updateSlot(idx, patch)}
                onDelete={() => removeSlot(idx)}
              />
            ))}
            {slots.length < 10 && (
              <button
                onClick={addSlot}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-4 text-sm text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
              >
                <Plus size={16} /> Adicionar campeonato
              </button>
            )}
            {slots.length === 0 && (
              <p className="text-center text-sm text-zinc-600">
                Adicione pelo menos um campeonato para definir a sequência anual.
              </p>
            )}

            {/* Divisões interligadas (acesso/descenso) */}
            {slots.length >= 2 && (
              <BoundariesEditor slots={slots} boundaries={boundaries} onChange={setBoundaries} />
            )}
          </div>
        )}

        {/* Step: Revisão */}
        {step === 'review' && (
          <div className="panel p-5">
            <h2 className="display mb-4 text-2xl text-zinc-100">{name}</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="tag">{SPORT_META[sport].emoji} {SPORT_META[sport].label}</span>
              {sport === 'esports' && game && <span className="tag">{GAME_META[game].emoji} {GAME_META[game].label}</span>}
              <span className="tag"><CalendarDays size={11} className="inline mr-1" />{period} anos</span>
              <span className="tag"><Users size={11} className="inline mr-1" />{poolIds.length} times</span>
              <span className="tag"><Layers size={11} className="inline mr-1" />{slots.length} campeonatos/ano</span>
            </div>
            <div className="rule mb-4" />
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Sequência anual</p>
            <div className="flex flex-col gap-2">
              {slots.map((s, i) => {
                const fmt = FORMAT_META[s.format]
                const Icon = fmt.icon
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl bg-ink-800/60 px-3 py-2.5">
                    <span className="tnum w-5 text-right text-xs font-bold text-zinc-500">{i + 1}</span>
                    <Icon size={14} className="text-blood-400 shrink-0" />
                    <span className="flex-1 text-sm font-medium text-zinc-200">{s.name}</span>
                    {s.teamIds && s.teamIds.length > 0 && (
                      <span className="tag text-[10px] border-blood-700/40 text-blood-300">
                        {s.teamIds.length} times
                      </span>
                    )}
                    <span className="tag text-[10px]">{fmt.short}</span>
                  </div>
                )
              })}
            </div>
            {validBoundaries.length > 0 && (
              <>
                <div className="rule my-4" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Divisões interligadas
                </p>
                <div className="flex flex-col gap-2">
                  {validBoundaries.map((b, i) => {
                    const upper = slots.find((s) => s.id === b.upperSlotId)
                    const lower = slots.find((s) => s.id === b.lowerSlotId)
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-xl bg-ink-800/60 px-3 py-2.5 text-sm">
                        <TrendingDown size={14} className="shrink-0 text-blood-400" />
                        <span className="text-zinc-300">
                          Os últimos <strong className="text-white">{b.count}</strong> de{' '}
                          <strong className="text-white">{upper?.name}</strong> trocam com os primeiros{' '}
                          <strong className="text-white">{b.count}</strong> de{' '}
                          <strong className="text-white">{lower?.name}</strong> ao fim de cada ano.
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            <p className="mt-4 text-xs text-zinc-600">
              {slots.some((s) => s.teamIds && s.teamIds.length > 0)
                ? `Cada campeonato tem seu próprio elenco; os ${poolIds.length} times do pool são acompanhados por ${period} anos (artilharia e títulos somam todos os campeonatos).`
                : `Esses ${slots.length} campeonatos serão disputados todo ano pelos mesmos ${poolIds.length} times, por ${period} anos.`}
            </p>
          </div>
        )}

        {/* Footer navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button onClick={handleBack}>
            {stepIdx === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          {stepIdx < STEPS.length - 1 ? (
            <Button variant="primary" disabled={!canNext} onClick={handleNext}>
              Próximo <ChevronRight size={15} />
            </Button>
          ) : (
            <Button variant="primary" icon={<Flag size={15} />} onClick={handleCreate}>
              Criar temporada
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Editor de slot ─────────────────────────────────────────────────────────

function SlotEditor({
  slot,
  index,
  sport,
  game,
  poolTeams,
  earlierSlots,
  onChange,
  onDelete
}: {
  slot: SeasonSlot
  index: number
  sport: Sport
  game?: EsportsGame
  /** pool da temporada — origem do elenco próprio do slot */
  poolTeams: Team[]
  /** campeonatos anteriores na sequência do ano — únicas fontes válidas de classificação dinâmica */
  earlierSlots: SeasonSlot[]
  onChange: (patch: Partial<SeasonSlot>) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')

  const updateConfig = (patch: Partial<TournamentConfig>) =>
    onChange({ config: { ...slot.config, ...patch } })

  const slotTeamIds = slot.teamIds ?? []
  const toggleSlotTeam = (id: string) =>
    onChange({
      teamIds: slotTeamIds.includes(id) ? slotTeamIds.filter((x) => x !== id) : [...slotTeamIds, id]
    })
  const filteredPool = poolTeams.filter(
    (t) => !teamSearch || t.name.toLowerCase().includes(teamSearch.toLowerCase())
  )

  // classificação dinâmica: times deste slot vêm dos melhores de campeonato(s) anterior(es)
  const qualifiers = slot.qualifiesFrom ?? []
  const eligibleSources = earlierSlots.filter((s) => (s.teamIds && s.teamIds.length) || s.qualifiesFrom?.length)
  const updateQualifiers = (next: { slotId: string; count: number }[]) =>
    onChange({ qualifiesFrom: next.length ? next : undefined })
  const addQualifier = () => {
    const used = new Set(qualifiers.map((q) => q.slotId))
    const next = eligibleSources.find((s) => !used.has(s.id))
    if (!next) return
    updateQualifiers([...qualifiers, { slotId: next.id, count: 1 }])
  }

  return (
    <div className="panel overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center gap-3 p-4 text-left"
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((x) => !x) }}
      >
        <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blood-950/50 text-xs font-bold text-blood-300">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-200">{slot.name || 'Sem nome'}</span>
        {slot.teamIds && slot.teamIds.length > 0 && (
          <span className="tag text-[10px] border-blood-700/40 text-blood-300">{slot.teamIds.length} times</span>
        )}
        <span className="tag text-[10px]">{FORMAT_META[slot.format].short}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-zinc-600 hover:text-blood-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Nome</label>
            <input
              className="input"
              value={slot.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Nome do campeonato"
            />
          </div>

          <div className="mb-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Formato</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FORMATS.map((f) => {
                const meta = FORMAT_META[f]
                const Icon = meta.icon
                const active = slot.format === f
                return (
                  <button
                    key={f}
                    onClick={() => onChange({ format: f, config: { ...slot.config } })}
                    className={cx(
                      'flex flex-col gap-1 rounded-xl border p-2.5 text-left transition',
                      active ? 'border-blood-600/60 bg-blood-950/20' : 'border-white/5 bg-ink-800/60 hover:border-white/15'
                    )}
                  >
                    <Icon size={14} className={active ? 'text-blood-400' : 'text-zinc-500'} />
                    <span className={cx('text-xs font-bold', active ? 'text-zinc-100' : 'text-zinc-400')}>
                      {meta.short}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Classificação dinâmica: times vêm do resultado de campeonato(s) anterior(es) do mesmo ano */}
          {eligibleSources.length > 0 && (
            <div className="mb-3 rounded-xl border border-white/5 bg-ink-850/60 p-3">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                <TrendingUp size={13} className="text-blood-400" /> Classificação de outro campeonato
              </p>
              {qualifiers.length === 0 ? (
                <p className="mb-2 text-[11px] leading-snug text-zinc-600">
                  Além do elenco fixo, este campeonato pode receber automaticamente colocados de outro(s)
                  já disputados no mesmo ano (ex.: uma Libertadores com clubes fixos + quem subir do
                  Pré, ou uma Intercontinental com o campeão da Libertadores + o campeão da Champions).
                </p>
              ) : (
                <div className="mb-2 flex flex-col gap-2">
                  {qualifiers.map((q, qi) => (
                    <div key={q.slotId} className="flex flex-wrap items-center gap-2">
                      <select
                        className="input w-auto min-w-0 flex-1 py-1.5 text-xs"
                        value={q.slotId}
                        onChange={(e) => {
                          const next = [...qualifiers]
                          next[qi] = { ...q, slotId: e.target.value }
                          updateQualifiers(next)
                        }}
                      >
                        {eligibleSources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <span className="shrink-0 text-xs text-zinc-400">a partir do</span>
                      <Stepper
                        value={(q.offset ?? 0) + 1}
                        min={1}
                        max={32}
                        onChange={(v) => {
                          const next = [...qualifiers]
                          next[qi] = { ...q, offset: v - 1 }
                          updateQualifiers(next)
                        }}
                      />
                      <span className="shrink-0 text-xs text-zinc-400">º, pegando</span>
                      <Stepper
                        value={q.count}
                        min={1}
                        max={16}
                        onChange={(v) => {
                          const next = [...qualifiers]
                          next[qi] = { ...q, count: v }
                          updateQualifiers(next)
                        }}
                      />
                      <button
                        onClick={() => updateQualifiers(qualifiers.filter((_, i) => i !== qi))}
                        className="shrink-0 text-zinc-600 transition-colors hover:text-blood-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {qualifiers.length < eligibleSources.length && (
                <button
                  onClick={addQualifier}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  <Plus size={13} /> Adicionar fonte de classificação
                </button>
              )}
            </div>
          )}

          {/* Elenco próprio do campeonato (subconjunto do pool) — necessário pra ligar divisões.
              Soma-se aos classificados dinâmicos quando ambos existem. */}
          <div className="mb-3">
            <button
              onClick={() => setTeamsOpen((o) => !o)}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-ink-850/60 px-3 py-2 text-left transition hover:border-blood-600/40"
            >
              <Users size={13} className="text-blood-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Elenco próprio
              </span>
              <span className="rounded-full bg-blood-950/50 px-2 py-0.5 text-[10px] font-semibold text-blood-200">
                {slotTeamIds.length > 0 ? `${slotTeamIds.length} times` : 'pool inteiro'}
              </span>
              <ChevronDown
                size={15}
                className={cx('ml-auto text-zinc-500 transition-transform', teamsOpen && 'rotate-180')}
              />
            </button>
            {teamsOpen && (
              <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/5 bg-ink-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      className="input py-1.5 pl-8 text-xs"
                      placeholder="Buscar no pool…"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                    />
                  </div>
                  {slotTeamIds.length > 0 && (
                    <button
                      onClick={() => onChange({ teamIds: undefined })}
                      className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-200"
                    >
                      usar pool inteiro
                    </button>
                  )}
                </div>
                <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
                  {filteredPool.map((t) => {
                    const sel = slotTeamIds.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleSlotTeam(t.id)}
                        className={cx(
                          'flex items-center gap-2 rounded-lg border p-1.5 text-left transition',
                          sel ? 'border-blood-600/50 bg-blood-950/25' : 'border-white/5 bg-ink-800/60 hover:border-white/15'
                        )}
                      >
                        <TeamBadge team={t} size="xs" />
                        <span className="truncate text-[11px] font-medium text-zinc-200">{t.name}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] leading-snug text-zinc-600">
                  Sem seleção, o campeonato usa o pool inteiro da temporada. Pra interligar divisões
                  (acesso/descenso), cada divisão precisa de um elenco próprio.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {sport === 'esports' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400">Série</span>
                <Segmented
                  value={slot.config.bestOf}
                  onChange={(v) => updateConfig({ bestOf: v as BestOf })}
                  options={([1, 3, 5] as BestOf[]).map((b) => ({ value: b, label: `BO${b}` }))}
                />
              </div>
            )}
            {(slot.format === 'league' || slot.format === 'groups') && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400">Ida e volta</span>
                <Toggle checked={slot.config.homeAndAway} onChange={(v) => updateConfig({ homeAndAway: v })} />
              </div>
            )}
            {slot.format === 'groups' && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">Grupos</span>
                  <Stepper
                    value={slot.config.groupCount}
                    min={2}
                    max={16}
                    onChange={(v) => updateConfig({ groupCount: v })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">Classificados/grupo</span>
                  <Stepper
                    value={slot.config.qualifiersPerGroup}
                    min={1}
                    max={4}
                    onChange={(v) => updateConfig({ qualifiersPerGroup: v })}
                  />
                </div>
              </>
            )}
            {slot.format === 'swiss' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400">Rodadas</span>
                <Stepper
                  value={slot.config.swissRounds}
                  min={3}
                  max={12}
                  onChange={(v) => updateConfig({ swissRounds: v })}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">100% aleatório</span>
              <Toggle checked={slot.config.pureRandom} onChange={(v) => updateConfig({ pureRandom: v })} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Divisões interligadas (acesso/descenso) ────────────────────────────────

function BoundariesEditor({
  slots,
  boundaries,
  onChange
}: {
  slots: SeasonSlot[]
  boundaries: DivisionBoundary[]
  onChange: (b: DivisionBoundary[]) => void
}) {
  // só slots com elenco próprio podem participar de uma ligação
  const eligible = slots.filter((s) => s.teamIds && s.teamIds.length > 0)

  const addBoundary = () => {
    const used = new Set(boundaries.flatMap((b) => [b.upperSlotId + '|' + b.lowerSlotId]))
    // sugere o primeiro par de elegíveis ainda não ligado
    let upper = eligible[0]?.id ?? ''
    let lower = eligible[1]?.id ?? ''
    outer: for (const u of eligible) {
      for (const l of eligible) {
        if (u.id !== l.id && !used.has(u.id + '|' + l.id)) {
          upper = u.id
          lower = l.id
          break outer
        }
      }
    }
    onChange([...boundaries, { upperSlotId: upper, lowerSlotId: lower, count: 2 }])
  }

  const update = (idx: number, patch: Partial<DivisionBoundary>) =>
    onChange(boundaries.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  const remove = (idx: number) => onChange(boundaries.filter((_, i) => i !== idx))

  const selectCls =
    'input w-auto min-w-0 flex-1 py-1.5 text-xs'

  return (
    <div className="panel p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
        <TrendingDown size={15} className="text-blood-400" /> Ligar divisões
      </p>
      <p className="mb-3 text-xs leading-snug text-zinc-500">
        Acesso e rebaixamento: ao fim de cada ano, os últimos colocados da divisão de cima trocam de
        lugar com os primeiros da divisão de baixo. Cada divisão precisa ter um <strong>elenco próprio</strong>{' '}
        (defina no campeonato acima).
      </p>

      {eligible.length < 2 ? (
        <p className="rounded-xl bg-ink-800/60 px-3 py-2.5 text-xs text-zinc-500">
          Defina o elenco próprio de pelo menos 2 campeonatos para poder interligá-los.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {boundaries.map((b, i) => {
            const invalid =
              b.upperSlotId === b.lowerSlotId ||
              !eligible.some((s) => s.id === b.upperSlotId) ||
              !eligible.some((s) => s.id === b.lowerSlotId)
            return (
              <div
                key={i}
                className={cx(
                  'flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5',
                  invalid ? 'border-amber-500/40 bg-amber-950/10' : 'border-white/5 bg-ink-800/60'
                )}
              >
                <select
                  className={selectCls}
                  value={b.upperSlotId}
                  onChange={(e) => update(i, { upperSlotId: e.target.value })}
                >
                  {eligible.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (superior)
                    </option>
                  ))}
                </select>
                <span className="shrink-0 text-xs text-zinc-500">↕</span>
                <select
                  className={selectCls}
                  value={b.lowerSlotId}
                  onChange={(e) => update(i, { lowerSlotId: e.target.value })}
                >
                  {eligible.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (inferior)
                    </option>
                  ))}
                </select>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-zinc-400">sobem/descem</span>
                  <Stepper value={b.count} min={1} max={8} onChange={(v) => update(i, { count: v })} />
                </div>
                <button onClick={() => remove(i)} className="shrink-0 text-zinc-600 transition-colors hover:text-blood-400">
                  <X size={14} />
                </button>
                {invalid && (
                  <p className="w-full text-[11px] text-amber-300">
                    Escolha duas divisões diferentes (ambas com elenco próprio) — esta ligação será ignorada.
                  </p>
                )}
              </div>
            )
          })}
          <button
            onClick={addBoundary}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-2.5 text-xs text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
          >
            <Plus size={14} /> Adicionar ligação entre divisões
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Hub (temporada ativa em andamento) ─────────────────────────────────────

function SeasonHub({
  onLeave,
  onHall,
  onForm
}: {
  onLeave: () => void
  onHall: () => void
  onForm: () => void
}) {
  const activeSeason = useSeasons((s) => s.activeSeason)
  const abandonSeason = useSeasons((s) => s.abandonSeason)
  const setPendingTournamentId = useSeasons((s) => s.setPendingTournamentId)
  const startTournament = useApp((s) => s.startTournament)

  const [statsTab, setStatsTab] = useState<'year' | 'alltime'>('year')
  const [confirmLeave, setConfirmLeave] = useState(false)

  if (!activeSeason) return null

  const s = activeSeason
  const sport = SPORT_META[s.sport]
  const game = s.game ? GAME_META[s.game] : null
  const currentSlot = s.slots[s.currentSlotIndex]

  const thisYear = s.years.find((y) => y.year === s.currentYear)
  const yearChampions = thisYear?.champions ?? []
  const yearScorers = [...(thisYear?.scorers ?? [])].sort(
    (a, b) => (s.sport === 'esports' ? b.kills - a.kills : b.goals - a.goals)
  )
  const allTimeScorers = [...s.allTimeScorers].sort(
    (a, b) => (s.sport === 'esports' ? b.kills - a.kills : b.goals - a.goals)
  )
  const allTimeWins = Object.entries(s.allTimeWins)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
  const poolMap = Object.fromEntries(s.teamPool.map((t) => [t.id, t]))

  // evolução: há forma para mostrar a partir do 2º ano
  const formCount = Object.values(s.teamForm ?? {}).filter((f) => Math.abs(f) >= 1.5).length
  const hasForm = s.currentYear > 1 && formCount > 0

  const handleStart = () => {
    if (!currentSlot) return
    // elenco fixo (teamIds) + vagas por classificação dinâmica (qualifiesFrom) SOMAM —
    // é o que permite, por ex., a Libertadores ter clubes fixos + quem vier do
    // Pré-Libertadores no mesmo ano. Sem nenhum dos dois, usa o pool inteiro.
    const allIds = resolveSlotTeamIds(currentSlot, thisYear?.slotRankings)
    const slotTeams: Team[] = allIds.length ? s.teamPool.filter((t) => allIds.includes(t.id)) : s.teamPool
    startTournament({
      name: currentSlot.name,
      sport: s.sport,
      format: currentSlot.format,
      teams: slotTeams,
      config: { ...currentSlot.config, game: s.game ?? currentSlot.config.game }
    })
    // startTournament is synchronous — current is set before this line runs
    const id = useApp.getState().current?.id ?? null
    setPendingTournamentId(id)
  }

  const handleAbandon = () => {
    abandonSeason()
    onLeave()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 flex items-center justify-between">
            <p className="kicker">
              <span className="h-1.5 w-1.5 bg-blood-600" />
              Temporada em andamento
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onHall}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400/80 hover:text-amber-300 transition-colors"
              >
                <Crown size={13} /> Hall da Fama
              </button>
              <button onClick={() => setConfirmLeave(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                Sair da temporada
              </button>
            </div>
          </div>
          <h1 className="display text-4xl text-zinc-100">{s.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="tag">{sport.emoji} {sport.label}</span>
            {game && <span className="tag">{game.emoji} {game.short}</span>}
            <span className="tag text-blood-300 border-blood-700/40">Ano {s.currentYear} de {s.period}</span>
          </div>
        </div>

        {/* Slot progress */}
        <div className="panel mb-5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Sequência do ano — {s.currentSlotIndex}/{s.slots.length} concluídos
          </p>
          <div className="flex flex-col gap-1.5">
            {s.slots.map((slot, i) => {
              const done = i < s.currentSlotIndex
              const current = i === s.currentSlotIndex
              const Icon = FORMAT_META[slot.format].icon
              const champion = yearChampions.find((c) => c.slotId === slot.id)
              return (
                <div
                  key={slot.id}
                  className={cx(
                    'flex items-center gap-3 rounded-xl px-3 py-2 transition',
                    current ? 'bg-blood-950/30 border border-blood-600/30' : done ? 'bg-ink-800/60' : 'bg-ink-800/30'
                  )}
                >
                  <span className={cx('tnum w-4 text-right text-xs font-bold', current ? 'text-blood-400' : done ? 'text-zinc-400' : 'text-zinc-600')}>
                    {i + 1}
                  </span>
                  <Icon size={13} className={cx('shrink-0', current ? 'text-blood-400' : done ? 'text-zinc-400' : 'text-zinc-600')} />
                  <span className={cx('flex-1 text-sm', current ? 'font-semibold text-zinc-100' : done ? 'text-zinc-400' : 'text-zinc-600')}>
                    {slot.name}
                  </span>
                  {done && champion && (
                    <div className="flex items-center gap-1.5">
                      <Trophy size={12} className="text-amber-400" />
                      <span className="text-xs font-medium text-zinc-300">{champion.teamName}</span>
                    </div>
                  )}
                  {current && (
                    <span className="tag border-blood-700/40 text-blood-300 text-[10px]">Próximo</span>
                  )}
                  {i > s.currentSlotIndex && (
                    <span className="text-[10px] text-zinc-600">Aguardando</span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            <Button variant="primary" icon={<Play size={14} />} onClick={handleStart}>
              Iniciar: {currentSlot?.name ?? '—'}
            </Button>
          </div>
        </div>

        {/* Evolução: atalho para a tela de Forma da temporada */}
        {hasForm && (
          <button
            onClick={onForm}
            className="panel mb-5 flex w-full items-center gap-3 p-4 text-left transition hover:border-blood-600/40"
          >
            <TrendingUp size={18} className="shrink-0 text-blood-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-100">Forma da temporada — Ano {s.currentYear}</p>
              <p className="text-[11px] text-zinc-500">
                Veja todos os times em alta e em baixa neste ano.
              </p>
            </div>
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        )}

        {/* Stats tabs */}
        <div className="panel p-4">
          <div className="mb-4 flex gap-2">
            {([['year', `Ano ${s.currentYear}`], ['alltime', 'Geral']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setStatsTab(tab)}
                className={cx(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition',
                  statsTab === tab ? 'bg-blood-950/50 text-blood-300' : 'text-zinc-500 hover:text-zinc-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {statsTab === 'year' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Trophy size={11} className="mr-1 inline text-amber-400" /> Campeões do ano
                </p>
                {yearChampions.length === 0 ? (
                  <p className="text-xs text-zinc-600">Nenhum campeonato concluído ainda.</p>
                ) : (
                  yearChampions.map((c) => (
                    <div key={c.slotId} className="mb-2 flex items-center gap-2">
                      {poolMap[c.teamId] && <TeamBadge team={poolMap[c.teamId]} size="sm" />}
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">{c.teamName}</p>
                        <p className="text-[11px] text-zinc-500">{c.slotName}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Medal size={11} className="mr-1 inline text-blood-400" />
                  {s.sport === 'esports' ? 'Maiores abatedores' : 'Artilheiros'} — Ano {s.currentYear}
                </p>
                {yearScorers.length === 0 ? (
                  <p className="text-xs text-zinc-600">Sem dados ainda.</p>
                ) : (
                  yearScorers.slice(0, 5).map((sc, i) => (
                    <div key={sc.playerId} className="mb-1.5 flex items-center gap-2">
                      <span className="tnum w-4 text-right text-[11px] text-zinc-600">{i + 1}</span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-zinc-200">{sc.name}</span>
                        <span className="ml-1 text-[11px] text-zinc-500">— {sc.teamName}</span>
                      </div>
                      <span className="tnum text-xs font-bold text-blood-300">
                        {s.sport === 'esports' ? sc.kills : sc.goals}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {statsTab === 'alltime' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Trophy size={11} className="mr-1 inline text-amber-400" /> Maiores campeões
                </p>
                {allTimeWins.length === 0 ? (
                  <p className="text-xs text-zinc-600">Nenhum título ainda.</p>
                ) : (
                  allTimeWins.map(([teamId, wins], i) => {
                    const team = poolMap[teamId]
                    return (
                      <div key={teamId} className="mb-2 flex items-center gap-2">
                        <span className="tnum w-4 text-right text-[11px] text-zinc-600">{i + 1}</span>
                        {team && <TeamBadge team={team} size="sm" />}
                        <span className="flex-1 text-xs font-semibold text-zinc-200">{team?.name ?? teamId}</span>
                        <span className="tnum text-xs font-bold text-amber-400">{wins}×</span>
                      </div>
                    )
                  })
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Medal size={11} className="mr-1 inline text-blood-400" />
                  {s.sport === 'esports' ? 'Abates' : 'Gols'} — All-time
                </p>
                {allTimeScorers.length === 0 ? (
                  <p className="text-xs text-zinc-600">Sem dados ainda.</p>
                ) : (
                  allTimeScorers.slice(0, 5).map((sc, i) => (
                    <div key={sc.playerId} className="mb-1.5 flex items-center gap-2">
                      <span className="tnum w-4 text-right text-[11px] text-zinc-600">{i + 1}</span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-zinc-200">{sc.name}</span>
                        <span className="ml-1 text-[11px] text-zinc-500">— {sc.teamName}</span>
                      </div>
                      <span className="tnum text-xs font-bold text-blood-300">
                        {s.sport === 'esports' ? sc.kills : sc.goals}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Sair da temporada?"
        message="Você vai sair da temporada em andamento. Nada é apagado — dá para continuar de onde parou pela lista de temporadas."
        confirmLabel="Sair"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false)
          handleAbandon()
        }}
      />
    </div>
  )
}

// ─── Resumo do ano ──────────────────────────────────────────────────────────

function SeasonYearSummary({
  onNext,
  onLeave,
  onHall
}: {
  onNext: () => void
  onLeave: () => void
  onHall: () => void
}) {
  const activeSeason = useSeasons((s) => s.activeSeason)
  const startNextYear = useSeasons((s) => s.startNextYear)
  const abandonSeason = useSeasons((s) => s.abandonSeason)
  const historyData = useHistory((s) => s.data)

  if (!activeSeason) return null
  const s = activeSeason
  const yearEntry = s.years.find((y) => y.year === s.currentYear)
  const yearNum = s.currentYear
  const isCompleted = s.status === 'completed'

  const sport = SPORT_META[s.sport]
  const game = s.game ? GAME_META[s.game] : null
  const poolMap = Object.fromEntries(s.teamPool.map((t) => [t.id, t]))
  const poolIds = new Set(s.teamPool.map((t) => t.id))

  const yearScorers = [...(yearEntry?.scorers ?? [])].sort(
    (a, b) => (s.sport === 'esports' ? b.kills - a.kills : b.goals - a.goals)
  )
  const allTimeScorers = [...s.allTimeScorers].sort(
    (a, b) => (s.sport === 'esports' ? b.kills - a.kills : b.goals - a.goals)
  )
  const allTimeWins = Object.entries(s.allTimeWins).sort(([, a], [, b]) => b - a)

  // Head-to-head: top clashes between pool teams
  const h2hClashes = Object.values(historyData.headToHead)
    .filter((h) => poolIds.has(h.aId) && poolIds.has(h.bId))
    .sort((a, b) => b.aWins + b.bWins + b.draws - (a.aWins + a.bWins + a.draws))
    .slice(0, 4)

  const handleNext = () => {
    startNextYear()
    onNext()
  }

  const handleLeave = () => {
    if (!isCompleted) abandonSeason()
    onLeave()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-7">
          <div className="mb-2 flex items-center justify-between">
            <p className="kicker">
              <span className="h-1.5 w-1.5 bg-blood-600" />
              {isCompleted ? 'Temporada encerrada' : `Resumo do Ano ${yearNum}`}
            </p>
            <button
              onClick={onHall}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-400/80 hover:text-amber-300 transition-colors"
            >
              <Crown size={13} /> Hall da Fama
            </button>
          </div>
          <h1 className="display text-5xl text-zinc-100">
            {isCompleted ? s.name : `Ano ${yearNum}`}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="tag">{sport.emoji} {sport.label}</span>
            {game && <span className="tag">{game.emoji} {game.short}</span>}
            {isCompleted ? (
              <span className="tag border-win-700/40 text-win-400">Encerrada — {s.period} anos</span>
            ) : (
              <span className="tag border-blood-700/40 text-blood-300">
                {yearNum}/{s.period} anos
              </span>
            )}
          </div>
        </div>

        {/* Champions */}
        <div className="panel mb-5 p-5">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Trophy size={14} className="text-amber-400" />
            Campeões {isCompleted ? 'de cada edição' : `do Ano ${yearNum}`}
          </p>
          {(yearEntry?.champions ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhum campeonato foi concluído.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(yearEntry?.champions ?? []).map((c) => {
                const team = poolMap[c.teamId]
                return (
                  <div key={c.slotId} className="flex items-center gap-3 rounded-xl bg-ink-800/60 px-3 py-3">
                    {team && <TeamBadge team={team} size="sm" />}
                    <div>
                      <p className="text-sm font-bold text-zinc-100">{c.teamName}</p>
                      <p className="text-[11px] text-zinc-500">{c.slotName}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Acesso e rebaixamento entre divisões interligadas */}
        {(yearEntry?.movements ?? []).length > 0 && (
          <div className="panel mb-5 p-5">
            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <TrendingUp size={14} className="text-win-400" />
              Acesso e rebaixamento {isCompleted ? '' : `— valem para o Ano ${yearNum + 1}`}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-win-400">
                  <TrendingUp size={11} className="mr-1 inline" /> Subiram
                </p>
                {(yearEntry?.movements ?? [])
                  .filter((m) => m.kind === 'promotion')
                  .map((m) => {
                    const team = poolMap[m.teamId]
                    return (
                      <div key={m.teamId + m.toSlotId} className="mb-1.5 flex items-center gap-2 rounded-lg bg-win-950/30 px-2.5 py-2">
                        {team && <TeamBadge team={team} size="xs" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-zinc-100">{m.teamName}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {m.fromSlotName} → {m.toSlotName}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blood-400">
                  <TrendingDown size={11} className="mr-1 inline" /> Caíram
                </p>
                {(yearEntry?.movements ?? [])
                  .filter((m) => m.kind === 'relegation')
                  .map((m) => {
                    const team = poolMap[m.teamId]
                    return (
                      <div key={m.teamId + m.toSlotId} className="mb-1.5 flex items-center gap-2 rounded-lg bg-blood-950/30 px-2.5 py-2">
                        {team && <TeamBadge team={team} size="xs" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-zinc-100">{m.teamName}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {m.fromSlotName} → {m.toSlotName}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Scorers year + all-time */}
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div className="panel p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Medal size={13} className="text-blood-400" />
              {s.sport === 'esports' ? 'Abates' : 'Artilheiros'} — Ano {yearNum}
            </p>
            {yearScorers.length === 0 ? (
              <p className="text-xs text-zinc-600">Sem dados.</p>
            ) : (
              yearScorers.slice(0, 8).map((sc, i) => (
                <div key={sc.playerId} className="mb-1.5 flex items-center gap-2">
                  <span className="tnum w-4 text-right text-[11px] font-bold text-zinc-600">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 truncate block">{sc.name}</span>
                    <span className="text-[11px] text-zinc-500 truncate block">{sc.teamName}</span>
                  </div>
                  <span className="tnum text-sm font-bold text-blood-300">
                    {s.sport === 'esports' ? sc.kills : sc.goals}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="panel p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Medal size={13} className="text-amber-400" />
              {s.sport === 'esports' ? 'Abates' : 'Artilheiros'} — All-time
            </p>
            {allTimeScorers.length === 0 ? (
              <p className="text-xs text-zinc-600">Sem dados.</p>
            ) : (
              allTimeScorers.slice(0, 8).map((sc, i) => (
                <div key={sc.playerId} className="mb-1.5 flex items-center gap-2">
                  <span className="tnum w-4 text-right text-[11px] font-bold text-zinc-600">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 truncate block">{sc.name}</span>
                    <span className="text-[11px] text-zinc-500 truncate block">{sc.teamName}</span>
                  </div>
                  <span className="tnum text-sm font-bold text-amber-400">
                    {s.sport === 'esports' ? sc.kills : sc.goals}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All-time ranking */}
        <div className="panel mb-5 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Trophy size={13} className="text-amber-400" />
            Ranking de títulos — All-time
          </p>
          {allTimeWins.length === 0 ? (
            <p className="text-xs text-zinc-600">Nenhum título registrado.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {allTimeWins.slice(0, 8).map(([teamId, wins], i) => {
                const team = poolMap[teamId]
                return (
                  <div key={teamId} className="flex items-center gap-2">
                    <span className="tnum w-4 text-right text-[11px] font-bold text-zinc-600">{i + 1}</span>
                    {team && <TeamBadge team={team} size="sm" />}
                    <span className="flex-1 text-xs font-semibold text-zinc-200 truncate">{team?.name ?? teamId}</span>
                    <span className="tnum text-sm font-bold text-amber-400">{wins}×</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* H2H highlights */}
        {h2hClashes.length > 0 && (
          <div className="panel mb-7 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Confrontos clássicos
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {h2hClashes.map((h) => {
                const a = poolMap[h.aId]
                const b = poolMap[h.bId]
                const total = h.aWins + h.bWins + h.draws
                return (
                  <div key={h.key} className="rounded-xl bg-ink-800/60 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {a && <TeamBadge team={a} size="sm" />}
                      <span className="flex-1 min-w-0 text-xs font-semibold text-zinc-200 truncate">{a?.name ?? h.aId}</span>
                      <span className="tnum text-xs text-zinc-400">
                        {h.aWins}–{h.draws}–{h.bWins}
                      </span>
                      <span className="flex-1 min-w-0 text-xs font-semibold text-zinc-200 truncate text-right">{b?.name ?? h.bId}</span>
                      {b && <TeamBadge team={b} size="sm" />}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">{total} confrontos</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={handleLeave} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Ver lista de temporadas
          </button>
          {isCompleted ? (
            <div className="flex flex-col items-end gap-1">
              <span className="tag border-win-700/40 text-win-400 text-xs">Temporada encerrada!</span>
              <p className="text-[11px] text-zinc-600">
                {s.period} anos de {s.name} — parabéns!
              </p>
            </div>
          ) : (
            <Button variant="primary" icon={<Flag size={15} />} onClick={handleNext}>
              Seguir para o Ano {yearNum + 1}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Cerimônia de encerramento ──────────────────────────────────────────────

const PODIUM_META = [
  { ring: 'ring-amber-400/60', text: 'text-amber-300', bg: 'bg-amber-400/10', size: 'lg' as const, label: '1º' },
  { ring: 'ring-zinc-300/40', text: 'text-zinc-200', bg: 'bg-white/[0.04]', size: 'md' as const, label: '2º' },
  { ring: 'ring-amber-700/40', text: 'text-amber-600', bg: 'bg-amber-900/10', size: 'md' as const, label: '3º' }
]

function SeasonFinale({ onLeave, onHall }: { onLeave: () => void; onHall: () => void }) {
  const activeSeason = useSeasons((s) => s.activeSeason)
  const abandonSeason = useSeasons((s) => s.abandonSeason)

  if (!activeSeason) return null
  const s = activeSeason
  const sport = SPORT_META[s.sport]
  const game = s.game ? GAME_META[s.game] : null
  const poolMap = Object.fromEntries(s.teamPool.map((t) => [t.id, t]))

  const podium = Object.entries(s.allTimeWins)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
  const topScorer = [...s.allTimeScorers].sort(
    (a, b) => (s.sport === 'esports' ? b.kills - a.kills : b.goals - a.goals)
  )[0]
  const streak = longestTitleStreak(s.years)
  const biggestWin = s.records?.biggestWin
  const totalTitles = Object.values(s.allTimeWins).reduce((a, b) => a + b, 0)
  const isEsports = s.sport === 'esports'
  const mostKills = s.records?.mostKillsSeries
  const mapStomp = s.records?.biggestMapStomp
  const topMvp = Object.values(s.records?.mvpCounts ?? {}).sort((a, b) => b.count - a.count)[0]

  const handleLeave = () => {
    abandonSeason()
    onLeave()
  }

  // ordena pódio para layout 2º–1º–3º
  const layout = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium
  const rankOf = (entry: [string, number]) => podium.indexOf(entry)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="kicker mb-3 justify-center">
            <span className="h-1.5 w-1.5 bg-blood-600" />
            Fim de uma era
          </p>
          <Crown size={40} className="mx-auto mb-3 text-amber-400" />
          <h1 className="display text-5xl text-zinc-100 md:text-6xl">{s.name}</h1>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="tag">{sport.emoji} {sport.label}</span>
            {game && <span className="tag">{game.emoji} {game.short}</span>}
            <span className="tag border-win-700/40 text-win-400">{s.period} anos concluídos</span>
            <span className="tag">{totalTitles} títulos disputados</span>
          </div>
        </div>

        {/* Pódio */}
        <div className="panel mb-5 p-6">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Maiores campeões da era
          </p>
          {podium.length === 0 ? (
            <p className="text-center text-sm text-zinc-600">Nenhum título conquistado.</p>
          ) : (
            <div className="flex items-end justify-center gap-4">
              {layout.map((entry) => {
                const rank = rankOf(entry)
                const meta = PODIUM_META[rank]
                const team = poolMap[entry[0]]
                return (
                  <div key={entry[0]} className={cx('flex flex-1 flex-col items-center gap-2', rank === 0 && '-mt-4')}>
                    <span className={cx('text-xs font-bold', meta.text)}>{meta.label}</span>
                    <div className={cx('rounded-full p-1 ring-2', meta.ring, meta.bg)}>
                      <TeamBadge team={team} size={meta.size} />
                    </div>
                    <span className="text-center text-xs font-bold text-zinc-100 leading-tight">
                      {team?.name ?? entry[0]}
                    </span>
                    <span className={cx('tnum text-sm font-bold', meta.text)}>{entry[1]}× campeão</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recordes */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {topScorer && (
            <div className="panel p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Medal size={13} className="text-amber-400" />
                {s.sport === 'esports' ? 'Maior abatedor' : 'Maior artilheiro'} da era
              </p>
              <p className="text-lg font-bold text-zinc-100">{topScorer.name}</p>
              <p className="text-xs text-zinc-500">{topScorer.teamName}</p>
              <p className="tnum mt-1 text-2xl font-bold text-blood-300">
                {s.sport === 'esports' ? topScorer.kills : topScorer.goals}
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  {s.sport === 'esports' ? 'abates' : 'gols'}
                </span>
              </p>
            </div>
          )}

          {streak && streak.streak > 1 && (
            <div className="panel p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Flame size={13} className="text-blood-400" />
                Maior dinastia
              </p>
              <p className="text-lg font-bold text-zinc-100">{streak.teamName}</p>
              <p className="text-xs text-zinc-500">anos seguidos com título</p>
              <p className="tnum mt-1 text-2xl font-bold text-blood-300">
                {streak.streak}
                <span className="ml-1 text-xs font-normal text-zinc-500">anos</span>
              </p>
            </div>
          )}

          {isEsports && mostKills && (
            <div className="panel p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Crosshair size={13} className="text-blood-400" />
                Mais abates numa série
              </p>
              <p className="text-lg font-bold text-zinc-100">{mostKills.name}</p>
              <p className="text-xs text-zinc-500">{mostKills.teamName}</p>
              <p className="tnum mt-1 text-2xl font-bold text-blood-300">
                {mostKills.kills}
                <span className="ml-1 text-xs font-normal text-zinc-500">abates</span>
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-600">Ano {mostKills.year} · {mostKills.slotName}</p>
            </div>
          )}

          {isEsports && topMvp && (
            <div className="panel p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Medal size={13} className="text-amber-400" />
                Mais MVPs da era
              </p>
              <p className="text-lg font-bold text-zinc-100">{topMvp.name}</p>
              <p className="text-xs text-zinc-500">{topMvp.teamName}</p>
              <p className="tnum mt-1 text-2xl font-bold text-blood-300">
                {topMvp.count}
                <span className="ml-1 text-xs font-normal text-zinc-500">MVPs</span>
              </p>
            </div>
          )}

          {isEsports && mapStomp && (
            <div className="panel p-4 sm:col-span-2">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Swords size={13} className="text-blood-400" />
                Maior espanço num mapa
              </p>
              <div className="flex items-center gap-3">
                <TeamBadge team={poolMap[mapStomp.winnerId]} size="sm" />
                <span className="text-sm font-bold text-zinc-100">{mapStomp.winnerName}</span>
                <span className="tnum text-lg font-bold text-blood-300">
                  {mapStomp.winnerRounds} – {mapStomp.loserRounds}
                </span>
                <span className="text-sm font-medium text-zinc-400">{mapStomp.loserName}</span>
                <TeamBadge team={poolMap[mapStomp.loserId]} size="sm" />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-600">
                {mapStomp.mapName} · Ano {mapStomp.year} · {mapStomp.slotName}
              </p>
            </div>
          )}

          {biggestWin && (
            <div className="panel p-4 sm:col-span-2">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Swords size={13} className="text-blood-400" />
                {isEsports ? 'Maior atropelo em série' : 'Maior goleada da era'}
              </p>
              <div className="flex items-center gap-3">
                <TeamBadge team={poolMap[biggestWin.winnerId]} size="sm" />
                <span className="text-sm font-bold text-zinc-100">{biggestWin.winnerName}</span>
                <span className="tnum text-lg font-bold text-blood-300">
                  {biggestWin.winnerScore} – {biggestWin.loserScore}
                </span>
                <span className="text-sm font-medium text-zinc-400">{biggestWin.loserName}</span>
                <TeamBadge team={poolMap[biggestWin.loserId]} size="sm" />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-600">
                {isEsports ? 'mapas · ' : ''}Ano {biggestWin.year} · {biggestWin.slotName}
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={handleLeave} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Voltar à lista de temporadas
          </button>
          <Button variant="primary" icon={<Crown size={15} />} onClick={onHall}>
            Ver Hall da Fama completo
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Hall da Fama / linha do tempo ──────────────────────────────────────────

function SeasonHallOfFame({ onBack, onYear }: { onBack: () => void; onYear: (year: number) => void }) {
  const activeSeason = useSeasons((s) => s.activeSeason)

  if (!activeSeason) return null
  const s = activeSeason
  const sport = SPORT_META[s.sport]
  const game = s.game ? GAME_META[s.game] : null
  const poolMap = Object.fromEntries(s.teamPool.map((t) => [t.id, t]))

  const allTimeWins = Object.entries(s.allTimeWins).sort(([, a], [, b]) => b - a)
  const years = [...s.years].sort((a, b) => b.year - a.year) // mais recente primeiro
  const streak = longestTitleStreak(s.years)
  const biggestWin = s.records?.biggestWin
  const isEsports = s.sport === 'esports'
  const mostKills = s.records?.mostKillsSeries
  const mapStomp = s.records?.biggestMapStomp
  const topMvp = Object.values(s.records?.mvpCounts ?? {}).sort((a, b) => b.count - a.count)[0]

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-7">
          <p className="kicker mb-2">
            <Crown size={13} className="text-amber-400" />
            Hall da Fama
          </p>
          <h1 className="display text-5xl text-zinc-100">{s.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="tag">{sport.emoji} {sport.label}</span>
            {game && <span className="tag">{game.emoji} {game.short}</span>}
            <span className="tag">{s.years.length} anos disputados</span>
          </div>
        </div>

        {/* Pódio de títulos */}
        <div className="panel mb-5 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Trophy size={13} className="text-amber-400" /> Ranking de títulos
          </p>
          {allTimeWins.length === 0 ? (
            <p className="text-xs text-zinc-600">Nenhum título ainda.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {allTimeWins.slice(0, 10).map(([teamId, wins], i) => {
                const team = poolMap[teamId]
                return (
                  <div key={teamId} className="flex items-center gap-2">
                    <span className="tnum w-5 text-right text-[11px] font-bold text-zinc-600">{i + 1}</span>
                    <TeamBadge team={team} size="sm" />
                    <span className="flex-1 truncate text-xs font-semibold text-zinc-200">{team?.name ?? teamId}</span>
                    <span className="tnum text-sm font-bold text-amber-400">{wins}×</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recordes resumidos */}
        {(streak || biggestWin || mostKills || mapStomp || topMvp) && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {streak && streak.streak > 1 && (
              <div className="panel flex items-center gap-3 p-4">
                <Flame size={20} className="text-blood-400 shrink-0" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Maior dinastia</p>
                  <p className="text-sm font-bold text-zinc-100">{streak.teamName}</p>
                  <p className="text-[11px] text-zinc-500">{streak.streak} anos seguidos</p>
                </div>
              </div>
            )}
            {isEsports && mostKills && (
              <div className="panel flex items-center gap-3 p-4">
                <Crosshair size={20} className="text-blood-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Mais abates numa série</p>
                  <p className="truncate text-sm font-bold text-zinc-100">
                    {mostKills.name} — {mostKills.kills}
                  </p>
                  <p className="text-[11px] text-zinc-500">{mostKills.teamName} · Ano {mostKills.year}</p>
                </div>
              </div>
            )}
            {isEsports && topMvp && (
              <div className="panel flex items-center gap-3 p-4">
                <Medal size={20} className="text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Mais MVPs</p>
                  <p className="truncate text-sm font-bold text-zinc-100">
                    {topMvp.name} — {topMvp.count}
                  </p>
                  <p className="text-[11px] text-zinc-500">{topMvp.teamName}</p>
                </div>
              </div>
            )}
            {isEsports && mapStomp && (
              <div className="panel flex items-center gap-3 p-4">
                <Swords size={20} className="text-blood-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Maior espanço num mapa</p>
                  <p className="truncate text-sm font-bold text-zinc-100">
                    {mapStomp.winnerName} {mapStomp.winnerRounds}–{mapStomp.loserRounds} {mapStomp.loserName}
                  </p>
                  <p className="text-[11px] text-zinc-500">{mapStomp.mapName} · Ano {mapStomp.year}</p>
                </div>
              </div>
            )}
            {biggestWin && (
              <div className="panel flex items-center gap-3 p-4">
                <Swords size={20} className="text-blood-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    {isEsports ? 'Maior atropelo em série' : 'Maior goleada'}
                  </p>
                  <p className="truncate text-sm font-bold text-zinc-100">
                    {biggestWin.winnerName} {biggestWin.winnerScore}–{biggestWin.loserScore} {biggestWin.loserName}
                  </p>
                  <p className="text-[11px] text-zinc-500">Ano {biggestWin.year}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Linha do tempo ano-a-ano */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Linha do tempo</p>
        {years.length === 0 ? (
          <p className="text-sm text-zinc-600">Nenhum ano concluído ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {years.map((y) => {
              const topScorer = [...y.scorers].sort(
                (a, b) => (s.sport === 'esports' ? b.kills - a.kills : b.goals - a.goals)
              )[0]
              return (
                <button
                  key={y.year}
                  onClick={() => onYear(y.year)}
                  className="panel group p-4 text-left transition hover:border-blood-600/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="display text-xl text-zinc-100">Ano {y.year}</p>
                    <span className="flex items-center gap-2">
                      {!y.completed && (
                        <span className="tag border-blood-700/40 text-blood-300 text-[10px]">em andamento</span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 transition group-hover:text-blood-300">
                        ver detalhes <ChevronRight size={13} />
                      </span>
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        <Trophy size={10} className="mr-1 inline text-amber-400" /> Campeões
                      </p>
                      {y.champions.length === 0 ? (
                        <p className="text-xs text-zinc-600">—</p>
                      ) : (
                        y.champions.map((c) => (
                          <div key={c.slotId} className="mb-1.5 flex items-center gap-2">
                            <TeamBadge team={poolMap[c.teamId]} size="sm" />
                            <span className="flex-1 truncate text-xs font-semibold text-zinc-200">{c.teamName}</span>
                            <span className="truncate text-[11px] text-zinc-500">{c.slotName}</span>
                          </div>
                        ))
                      )}
                    </div>
                    {topScorer && (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          <Medal size={10} className="mr-1 inline text-blood-400" />
                          {s.sport === 'esports' ? 'Abates' : 'Artilheiro'} do ano
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-200">{topScorer.name}</span>
                          <span className="text-[11px] text-zinc-500">— {topScorer.teamName}</span>
                          <span className="tnum ml-auto text-sm font-bold text-blood-300">
                            {s.sport === 'esports' ? topScorer.kills : topScorer.goals}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Forma da temporada (tela própria) ──────────────────────────────────────

function SeasonFormScreen({ onBack }: { onBack: () => void }) {
  const activeSeason = useSeasons((s) => s.activeSeason)

  if (!activeSeason) return null
  const s = activeSeason
  const poolMap = Object.fromEntries(s.teamPool.map((t) => [t.id, t]))

  const list = Object.entries(s.teamForm ?? {})
    .map(([id, f]) => ({ team: poolMap[id], f }))
    .filter((x) => x.team && Math.abs(x.f) >= 1)
  const rising = list.filter((x) => x.f > 0).sort((a, b) => b.f - a.f)
  const falling = list.filter((x) => x.f < 0).sort((a, b) => a.f - b.f)
  const maxAbs = Math.max(1, ...list.map((x) => Math.abs(x.f)))

  const Bar = ({ f }: { f: number }) => (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-800">
      <div
        className={cx('h-full rounded-full', f > 0 ? 'bg-win-500' : 'bg-blood-500')}
        style={{ width: `${(Math.abs(f) / maxAbs) * 100}%` }}
      />
    </div>
  )

  const Column = ({
    title,
    icon,
    items,
    tone
  }: {
    title: string
    icon: ReactNode
    items: typeof rising
    tone: 'up' | 'down'
  }) => (
    <div className="panel p-4">
      <p
        className={cx(
          'mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide',
          tone === 'up' ? 'text-win-400' : 'text-blood-300'
        )}
      >
        {icon} {title}
        <span className="ml-auto text-[11px] font-normal text-zinc-600">{items.length}</span>
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600">Nenhum time.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(({ team, f }) => (
            <div key={team!.id} className="flex items-center gap-2.5">
              <TeamBadge team={team} size="sm" />
              <span className="flex-1 truncate text-sm font-semibold text-zinc-200">{team!.name}</span>
              <Bar f={f} />
              <span
                className={cx(
                  'tnum w-8 text-right text-sm font-bold',
                  tone === 'up' ? 'text-win-400' : 'text-blood-300'
                )}
              >
                {f > 0 ? '+' : ''}
                {Math.round(f)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-7">
          <p className="kicker mb-2">
            <TrendingUp size={13} className="text-blood-400" />
            Forma da temporada
          </p>
          <h1 className="display text-5xl text-zinc-100">Ano {s.currentYear}</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            A cada ano cerca de metade dos times entra em boa fase e a outra metade em má fase —
            a força sobe e desce, e isso muda quem larga na frente.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-zinc-600">
            A evolução começa a partir do segundo ano da temporada.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Column title="Em alta" icon={<TrendingUp size={13} />} items={rising} tone="up" />
            <Column title="Em baixa" icon={<TrendingDown size={13} />} items={falling} tone="down" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Detalhe de um ano (a partir do Hall da Fama) ───────────────────────────

function SeasonYearDetail({ year, onBack }: { year: number; onBack: () => void }) {
  const activeSeason = useSeasons((s) => s.activeSeason)

  if (!activeSeason) return null
  const s = activeSeason
  const sport = SPORT_META[s.sport]
  const game = s.game ? GAME_META[s.game] : null
  const poolMap = Object.fromEntries(s.teamPool.map((t) => [t.id, t]))
  const entry = s.years.find((y) => y.year === year)

  const scorers = [...(entry?.scorers ?? [])].sort(
    (a, b) => (s.sport === 'esports' ? b.kills - a.kills : b.goals - a.goals)
  )
  const isEsports = s.sport === 'esports'
  // recordes do ANO isolado (com fallback ao all-time p/ temporadas antigas sem por-ano)
  const yr = entry?.records ?? {}
  const yearRecord = yr.biggestWin ?? (s.records?.biggestWin?.year === year ? s.records.biggestWin : undefined)
  const killsRecord = isEsports
    ? yr.mostKillsSeries ?? (s.records?.mostKillsSeries?.year === year ? s.records.mostKillsSeries : undefined)
    : undefined
  const stompRecord = isEsports
    ? yr.biggestMapStomp ?? (s.records?.biggestMapStomp?.year === year ? s.records.biggestMapStomp : undefined)
    : undefined
  const yearMvp = isEsports
    ? Object.values(yr.mvpCounts ?? {}).sort((a, b) => b.count - a.count)[0]
    : undefined

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200">
          <ArrowLeft size={16} /> Voltar ao Hall da Fama
        </button>

        <div className="mb-7">
          <p className="kicker mb-2">
            <CalendarDays size={13} className="text-blood-400" />
            {s.name} · Ano {year} de {s.period}
          </p>
          <h1 className="display text-5xl text-zinc-100">Ano {year}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="tag">{sport.emoji} {sport.label}</span>
            {game && <span className="tag">{game.emoji} {game.short}</span>}
            {entry && !entry.completed && (
              <span className="tag border-blood-700/40 text-blood-300">em andamento</span>
            )}
          </div>
        </div>

        {!entry ? (
          <div className="panel p-8 text-center text-sm text-zinc-600">Ano sem dados.</div>
        ) : (
          <div className="space-y-5">
            {/* Campeões de cada campeonato */}
            <div className="panel p-5">
              <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Trophy size={14} className="text-amber-400" /> Campeões do ano
              </p>
              {entry.champions.length === 0 ? (
                <p className="text-sm text-zinc-600">Nenhum campeonato concluído neste ano.</p>
              ) : (
                <div className="space-y-2.5">
                  {entry.champions.map((c) => (
                    <div key={c.slotId} className="flex items-center gap-3 rounded-xl bg-ink-800/50 px-3 py-2.5">
                      <Trophy size={14} className="shrink-0 text-amber-400" />
                      <TeamBadge team={poolMap[c.teamId]} size="sm" />
                      <span className="flex-1 truncate text-sm font-bold text-zinc-100">{c.teamName}</span>
                      <span className="truncate text-xs text-zinc-500">{c.slotName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Artilheiros / abates do ano */}
            <div className="panel p-5">
              <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Medal size={14} className="text-blood-400" />
                {isEsports ? 'Abates do ano' : 'Artilheiros do ano'}
              </p>
              {scorers.length === 0 ? (
                <p className="text-sm text-zinc-600">Sem dados.</p>
              ) : (
                <div className="space-y-1.5">
                  {scorers.slice(0, 12).map((sc, i) => (
                    <div key={sc.playerId} className="flex items-center gap-2.5">
                      <span className="tnum w-5 text-right text-[11px] font-bold text-zinc-600">{i + 1}</span>
                      <TeamBadge team={poolMap[sc.teamId]} size="sm" />
                      <span className="flex-1 truncate text-sm font-semibold text-zinc-200">{sc.name}</span>
                      <span className="truncate text-[11px] text-zinc-500">{sc.teamName}</span>
                      <span className="tnum w-8 text-right text-sm font-bold text-blood-300">
                        {isEsports ? sc.kills : sc.goals}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recordes do ano */}
            {yearMvp && (
              <div className="panel p-5">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Medal size={14} className="text-amber-400" /> Mais MVPs do ano
                </p>
                <div className="flex items-center gap-3">
                  <TeamBadge team={poolMap[yearMvp.teamId]} size="sm" />
                  <span className="text-sm font-bold text-zinc-100">{yearMvp.name}</span>
                  <span className="tnum text-lg font-bold text-blood-300">{yearMvp.count}</span>
                  <span className="text-sm text-zinc-500">MVPs · {yearMvp.teamName}</span>
                </div>
              </div>
            )}

            {killsRecord && (
              <div className="panel p-5">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Crosshair size={14} className="text-blood-400" /> Mais abates numa série
                </p>
                <div className="flex items-center gap-3">
                  <TeamBadge team={poolMap[killsRecord.teamId]} size="sm" />
                  <span className="text-sm font-bold text-zinc-100">{killsRecord.name}</span>
                  <span className="tnum text-lg font-bold text-blood-300">{killsRecord.kills}</span>
                  <span className="text-sm text-zinc-500">abates · {killsRecord.teamName}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-600">{killsRecord.slotName}</p>
              </div>
            )}

            {stompRecord && (
              <div className="panel p-5">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Swords size={14} className="text-blood-400" /> Maior espanço num mapa
                </p>
                <div className="flex items-center gap-3">
                  <TeamBadge team={poolMap[stompRecord.winnerId]} size="sm" />
                  <span className="text-sm font-bold text-zinc-100">{stompRecord.winnerName}</span>
                  <span className="tnum text-lg font-bold text-blood-300">
                    {stompRecord.winnerRounds} – {stompRecord.loserRounds}
                  </span>
                  <span className="text-sm font-medium text-zinc-400">{stompRecord.loserName}</span>
                  <TeamBadge team={poolMap[stompRecord.loserId]} size="sm" />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-600">{stompRecord.mapName} · {stompRecord.slotName}</p>
              </div>
            )}

            {yearRecord && (
              <div className="panel p-5">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Swords size={14} className="text-blood-400" />{' '}
                  {isEsports ? 'Maior atropelo em série' : 'Maior goleada do ano'}
                </p>
                <div className="flex items-center gap-3">
                  <TeamBadge team={poolMap[yearRecord.winnerId]} size="sm" />
                  <span className="text-sm font-bold text-zinc-100">{yearRecord.winnerName}</span>
                  <span className="tnum text-lg font-bold text-blood-300">
                    {yearRecord.winnerScore} – {yearRecord.loserScore}
                  </span>
                  <span className="text-sm font-medium text-zinc-400">{yearRecord.loserName}</span>
                  <TeamBadge team={poolMap[yearRecord.loserId]} size="sm" />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-600">{yearRecord.slotName}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
