import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Dices,
  Layers,
  Palette,
  Plus,
  Rocket,
  Search,
  Trash2,
  Users,
  Wand2
} from 'lucide-react'
import type { BestOf, EsportsGame, Sport, Team, TeamCategory } from '../types'
import { useApp } from '../store/app'
import { presetsForSport } from '../data/teams'
import { collectionsForSport, collectionsGrouped } from '../data/collections'
import { championshipsGrouped, type ChampionshipPreset } from '../data/championships'
import { ESPORTS_GAMES, GAME_META } from '../lib/meta'
import { FORMATS, FORMAT_META, SPORT_META } from '../lib/meta'
import { Button, Modal, Segmented, Slider, Stepper, StrengthBar, Toggle } from '../components/ui'
import { Reveal } from '../components/motionx'
import { TeamBadge } from '../components/TeamBadge'
import { cx } from '../lib/cx'

const COLOR_SWATCHES = [
  '#e01b1b', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#0a0a0b', '#e5e7eb'
]

const CATEGORY_LABEL: Record<TeamCategory, string> = {
  club: 'Clubes',
  national: 'Seleções',
  custom: 'Meus times'
}

// divisor de n (entre 2 e n/2) mais próximo de `target` — mantém grupos válidos
function nearestDivisor(n: number, target: number): number | null {
  const divs: number[] = []
  for (let d = 2; d <= Math.floor(n / 2); d++) if (n % d === 0) divs.push(d)
  if (divs.length === 0) return null
  return divs.reduce((best, d) => (Math.abs(d - target) < Math.abs(best - target) ? d : best), divs[0])
}

const CHAOS_LEVELS = [
  { value: 0, label: 'Realista', hint: 'A força manda — favoritos quase sempre vencem.' },
  { value: 0.35, label: 'Equilibrado', hint: 'A força conta, mas zebras acontecem.' },
  { value: 0.7, label: 'Caótico', hint: 'Muita zebra — qualquer um assusta.' },
  { value: 1, label: 'Loteria', hint: 'Força ignorada — tudo no sorteio.' }
] as const

export function SetupScreen() {
  const go = useApp((s) => s.go)
  const pendingFormat = useApp((s) => s.pendingFormat)
  const pendingSport = useApp((s) => s.pendingSport)
  const customTeams = useApp((s) => s.customTeams)
  const teamOverrides = useApp((s) => s.teamOverrides)
  const addCustomTeam = useApp((s) => s.addCustomTeam)
  const startTournament = useApp((s) => s.startTournament)

  const [name, setName] = useState('')
  const [sport, setSport] = useState<Sport>(pendingSport ?? 'football')
  const [format, setFormat] = useState(pendingFormat ?? 'league')
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<TeamCategory | 'all'>('all')
  const [preset, setPreset] = useState<string | null>(null)
  const [modelsOpen, setModelsOpen] = useState(true)
  const [presetsOpen, setPresetsOpen] = useState(false)

  // config
  const [chaosIdx, setChaosIdx] = useState(0)
  const [momentum, setMomentum] = useState(false)
  const [homeAndAway, setHomeAndAway] = useState(false)
  const [bestOf, setBestOf] = useState<BestOf>(3)
  const [game, setGame] = useState<EsportsGame>('cs2')
  const [groupCount, setGroupCount] = useState(4)
  const [qualifiers, setQualifiers] = useState(2)
  const [swissRounds, setSwissRounds] = useState(5)
  const [playoffQualifiers, setPlayoffQualifiers] = useState(8)
  const [twoLeggedKO, setTwoLeggedKO] = useState(false)
  const [mcRuns, setMcRuns] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)

  const pool = useMemo<Team[]>(
    () =>
      [...presetsForSport(sport), ...customTeams.filter((t) => t.sport === sport)].map((t) =>
        teamOverrides[t.id] ? { ...t, ...teamOverrides[t.id] } : t
      ),
    [sport, customTeams, teamOverrides]
  )

  const presets = useMemo(() => collectionsForSport(sport), [sport])
  const presetGroups = useMemo(() => collectionsGrouped(sport), [sport])
  const modelGroups = useMemo(() => championshipsGrouped(sport), [sport])

  const filtered = useMemo(() => {
    const presetIds = preset ? presets.find((p) => p.id === preset)?.teamIds : undefined
    const presetSet = presetIds ? new Set(presetIds) : undefined
    return pool.filter((t) => {
      if (presetSet && !presetSet.has(t.id)) return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [pool, catFilter, search, preset, presets])

  const categories = useMemo(() => {
    const set = new Set(pool.map((t) => t.category))
    return [...set]
  }, [pool])

  const selectedTeams = useMemo(
    () => selected.map((id) => pool.find((t) => t.id === id)).filter(Boolean) as Team[],
    [selected, pool]
  )

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const selectTopN = (n: number) => {
    const top = [...pool].sort((a, b) => b.strength - a.strength).slice(0, n).map((t) => t.id)
    setSelected(top)
  }

  const changeSport = (sp: Sport) => {
    setSport(sp)
    setSelected([])
    setCatFilter('all')
    setPreset(null)
  }

  const applyChampionship = (c: ChampionshipPreset) => {
    setSport(c.sport)
    setFormat(c.format)
    setName(c.label)
    setPreset(null)
    setCatFilter('all')
    setSearch('')
    setHomeAndAway(c.config.homeAndAway ?? false)
    setBestOf(c.config.bestOf ?? 3)
    setGroupCount(c.config.groupCount ?? 4)
    setQualifiers(c.config.qualifiersPerGroup ?? 2)
    setSwissRounds(c.config.swissRounds ?? 5)
    if (c.game) setGame(c.game)
    const available = new Set([
      ...presetsForSport(c.sport).map((t) => t.id),
      ...customTeams.filter((t) => t.sport === c.sport).map((t) => t.id)
    ])
    setSelected(c.teamIds.filter((id) => available.has(id)))
  }

  const errors = useMemo(
    () => validate(name, format, selected.length, { groupCount, qualifiers, swissRounds, playoffQualifiers }),
    [name, format, selected.length, groupCount, qualifiers, swissRounds, playoffQualifiers]
  )

  const structureSummary = useMemo(
    () =>
      describeStructure(format, selected.length, {
        groupCount,
        qualifiers,
        swissRounds,
        homeAndAway,
        bestOf,
        sport,
        game,
        playoffQualifiers,
        twoLeggedKO
      }),
    [format, selected.length, groupCount, qualifiers, swissRounds, homeAndAway, bestOf, sport, game, playoffQualifiers, twoLeggedKO]
  )

  // auto-ajuste: mantém grupos/classificados/rodadas/playoffs válidos para o nº
  // de times escolhido — em vez de só acusar erro depois de iniciar
  useEffect(() => {
    const n = selected.length
    if (n < 2) return
    setPlayoffQualifiers((q) => Math.max(2, Math.min(q, n)))
    setSwissRounds((r) => Math.max(1, Math.min(r, n - 1)))
    if (format === 'groups') {
      const gc = nearestDivisor(n, groupCount)
      if (gc && gc !== groupCount) setGroupCount(gc)
      const perGroup = Math.floor(n / (gc ?? groupCount))
      setQualifiers((q) => Math.max(1, Math.min(q, Math.max(1, perGroup - 1))))
    }
  }, [selected.length, format, groupCount])

  const handleStart = () => {
    if (errors.length > 0) return
    startTournament(
      {
        name,
        sport,
        format,
        teams: selectedTeams,
        config: {
          pureRandom: CHAOS_LEVELS[chaosIdx].value >= 1,
          chaos: CHAOS_LEVELS[chaosIdx].value,
          momentum,
          homeAndAway:
            format === 'league' || format === 'groups' || format === 'league-playoffs' ? homeAndAway : false,
          bestOf,
          game: sport === 'esports' ? game : undefined,
          groupCount,
          qualifiersPerGroup: qualifiers,
          swissRounds,
          playoffQualifiers,
          twoLeggedKO: sport === 'football' ? twoLeggedKO : false
        }
      },
      mcRuns
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <button onClick={() => go('home')} className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-7">
          <Reveal>
            <p className="kicker mb-3">
              <span className="h-1.5 w-1.5 bg-blood-600" />
              Configuração
            </p>
            <h1 className="display text-5xl text-zinc-100 md:text-6xl">
              Novo <span className="italic text-blood-500">campeonato</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="rule mt-5" />
          </Reveal>
        </div>

        {/* Nome + Esporte */}
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <div className="panel p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Nome do campeonato
            </label>
            <input
              className="input"
              placeholder="Ex.: Copa dos Campeões 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="panel p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Esporte</label>
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
        </div>

        {/* Modelos prontos (recolhido por padrão) */}
        <div className="mb-6">
          <button
            onClick={() => setModelsOpen((o) => !o)}
            className="flex w-full items-center gap-2 rounded-[4px] border border-white/5 bg-ink-850/60 px-3 py-2.5 text-left transition hover:border-blood-600/40"
          >
            <Wand2 size={14} className="text-blood-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Modelos de campeonato
            </span>
            <span className="text-[11px] text-zinc-600">— preenche tudo automaticamente</span>
            <ChevronDown
              size={16}
              className={cx('ml-auto text-zinc-500 transition-transform', modelsOpen && 'rotate-180')}
            />
          </button>
          {modelsOpen && (
            <div className="mt-2 space-y-4 rounded-[4px] border border-white/5 bg-ink-900/40 p-3">
              {modelGroups.map((grp) => (
                <div key={grp.group}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    {grp.group}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {grp.items.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          applyChampionship(c)
                          setModelsOpen(false)
                        }}
                        title={c.description}
                        className="group flex flex-col gap-1 rounded-[4px] border border-white/5 bg-ink-850/60 p-3 text-left transition hover:border-blood-600/50 hover:bg-blood-950/15"
                      >
                        <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-100">
                          <span>{c.emoji}</span>
                          <span className="truncate">{c.label}</span>
                        </span>
                        <span className="line-clamp-2 text-[11px] leading-snug text-zinc-500">{c.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formato */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Formato</p>
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FORMATS.map((f) => {
            const meta = FORMAT_META[f]
            const Icon = meta.icon
            const active = format === f
            return (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cx(
                  'flex flex-col items-start gap-2 rounded-[4px] border p-4 text-left transition',
                  active
                    ? 'border-blood-600/60 bg-blood-950/25 shadow-glow-sm'
                    : 'border-white/5 bg-ink-850/60 hover:border-white/15'
                )}
              >
                <Icon size={18} className={active ? 'text-blood-400' : 'text-zinc-400'} />
                <span className={cx('text-sm font-bold', active ? 'text-white' : 'text-zinc-300')}>{meta.label}</span>
                <span className="text-[11px] leading-snug text-zinc-500">{meta.desc}</span>
              </button>
            )
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Seleção de times */}
          <div className="panel flex flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Users size={16} className="text-blood-400" /> Times
                <span className="tnum rounded-full bg-blood-950/50 px-2 py-0.5 text-xs text-blood-200">
                  {selected.length}
                </span>
              </p>
              <div className="flex gap-1.5">
                {[8, 16, 32].map((n) => (
                  <button
                    key={n}
                    onClick={() => selectTopN(n)}
                    disabled={pool.length < n}
                    className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 disabled:opacity-30"
                  >
                    Top {n}
                  </button>
                ))}
                <button
                  onClick={() => setSelected([])}
                  className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* busca + filtros */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  className="input pl-9"
                  placeholder="Buscar time..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="btn-primary shrink-0 px-3 py-2 text-xs"
              >
                <Plus size={14} /> Criar time
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(['all', ...categories] as (TeamCategory | 'all')[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={cx(
                    'rounded-full px-3 py-1 text-xs font-semibold transition',
                    catFilter === c ? 'bg-blood-grad text-white' : 'bg-ink-800 text-zinc-400 hover:text-zinc-100'
                  )}
                >
                  {c === 'all' ? 'Todos' : CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>

            {presets.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setPresetsOpen((o) => !o)}
                  className="flex w-full items-center gap-2 rounded-[4px] border border-white/5 bg-ink-850/60 px-3 py-2 text-left transition hover:border-blood-600/40"
                >
                  <Layers size={13} className="text-blood-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Presets de times
                  </span>
                  {preset && (
                    <span className="rounded-full bg-blood-950/50 px-2 py-0.5 text-[10px] font-semibold text-blood-200">
                      {presets.find((p) => p.id === preset)?.label ?? '1'}
                    </span>
                  )}
                  <ChevronDown
                    size={15}
                    className={cx('ml-auto text-zinc-500 transition-transform', presetsOpen && 'rotate-180')}
                  />
                </button>
                {presetsOpen && (
                  <div className="mt-2 space-y-3 rounded-[4px] border border-white/5 bg-ink-900/40 p-3">
                    {presetGroups.map((grp) => (
                      <div key={grp.group}>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                          {grp.group}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {grp.items.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setPreset((cur) => (cur === p.id ? null : p.id))}
                              className={cx(
                                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                                preset === p.id
                                  ? 'border-blood-600 bg-blood-950/40 text-blood-200'
                                  : 'border-paper/10 text-zinc-400 hover:text-zinc-100'
                              )}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {preset && (
                      <button
                        onClick={() => setPreset(null)}
                        className="text-xs text-zinc-500 underline hover:text-zinc-200"
                      >
                        limpar seleção
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid max-h-[420px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {filtered.map((t) => {
                const sel = selected.includes(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={cx(
                      'flex items-center gap-2.5 rounded-[4px] border px-3 py-2 text-left transition',
                      sel ? 'border-blood-600/50 bg-blood-950/20' : 'border-white/5 bg-ink-850/60 hover:border-white/15'
                    )}
                  >
                    <TeamBadge team={t} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100">{t.name}</p>
                      <div className="mt-1 w-24">
                        <StrengthBar value={t.strength} />
                      </div>
                    </div>
                    <span
                      className={cx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        sel ? 'border-blood-500 bg-blood-grad text-white' : 'border-white/15 text-transparent'
                      )}
                    >
                      <Check size={13} />
                    </span>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-zinc-600">Nenhum time encontrado.</p>
              )}
            </div>
          </div>

          {/* Config + resumo */}
          <div className="flex flex-col gap-4">
            <div className="panel space-y-4 p-4">
              <p className="text-sm font-bold text-white">Configurações</p>

              <div className="rounded-[4px] border border-blood-800/30 bg-blood-950/15 p-3">
                <p className="mb-0.5 text-sm font-semibold text-zinc-100">Imprevisibilidade</p>
                <p className="mb-2 text-xs text-zinc-500">{CHAOS_LEVELS[chaosIdx].hint}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CHAOS_LEVELS.map((lvl, i) => (
                    <button
                      key={lvl.label}
                      onClick={() => setChaosIdx(i)}
                      className={cx(
                        'h-8 flex-1 rounded-[4px] border px-2 text-xs font-bold transition',
                        chaosIdx === i
                          ? 'border-blood-600/60 bg-blood-950/40 text-blood-200'
                          : 'border-white/5 bg-ink-800 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                      )}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <Toggle
                checked={momentum}
                onChange={setMomentum}
                label="Forma / embalo"
                hint="Times embalados ganham força; em má fase, perdem (🔥/❄️ na tabela)."
              />

              {(format === 'league' || format === 'groups' || format === 'league-playoffs') && (
                <Toggle
                  checked={homeAndAway}
                  onChange={setHomeAndAway}
                  label="Ida e volta"
                  hint="Cada confronto é disputado duas vezes."
                />
              )}

              {format === 'league-playoffs' && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-400">Classificados aos playoffs</p>
                  <Stepper value={playoffQualifiers} onChange={setPlayoffQualifiers} min={2} max={16} />
                </div>
              )}

              {sport === 'football' && (format === 'cup' || format === 'groups' || format === 'league-playoffs') && (
                <Toggle
                  checked={twoLeggedKO}
                  onChange={setTwoLeggedKO}
                  label="Mata-mata ida e volta"
                  hint="Confrontos do mata-mata em dois jogos (agregado); a final é jogo único."
                />
              )}

              {sport === 'esports' && (
                <>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-zinc-400">Jogo</p>
                    <Segmented
                      value={game}
                      onChange={(v) => setGame(v as EsportsGame)}
                      options={ESPORTS_GAMES.map((g) => ({
                        value: g,
                        label: (
                          <span className="flex items-center gap-1.5">
                            {GAME_META[g].emoji} {GAME_META[g].short}
                          </span>
                        )
                      }))}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-zinc-400">Formato da série</p>
                    <Segmented
                      value={bestOf}
                      onChange={(v) => setBestOf(v as BestOf)}
                      options={[
                        { value: 1, label: 'BO1' },
                        { value: 3, label: 'BO3' },
                        { value: 5, label: 'BO5' }
                      ]}
                    />
                  </div>
                </>
              )}

              {format === 'groups' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-zinc-400">Grupos</p>
                    <Stepper value={groupCount} onChange={setGroupCount} min={2} max={16} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-zinc-400">Classif./grupo</p>
                    <Stepper value={qualifiers} onChange={setQualifiers} min={1} max={8} />
                  </div>
                </div>
              )}

              {format === 'swiss' && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-400">Rodadas</p>
                  <Stepper value={swissRounds} onChange={setSwissRounds} min={1} max={15} />
                </div>
              )}

              {/* Monte Carlo */}
              <div>
                <p className="mb-1 text-xs font-semibold text-zinc-400">Monte Carlo</p>
                <p className="mb-2 text-[11px] text-zinc-600">
                  Simula o campeonato várias vezes e mostra quantas vezes cada time venceu.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 20, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMcRuns(n)}
                      className={cx(
                        'h-8 min-w-[2.75rem] rounded-[4px] border px-2 text-xs font-bold transition',
                        mcRuns === n
                          ? 'border-blood-600/60 bg-blood-950/25 text-blood-300'
                          : 'border-white/5 bg-ink-800 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                      )}
                    >
                      {n === 1 ? 'Desligado' : `${n}×`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="panel p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Resumo</p>
              <p className="text-sm leading-relaxed text-zinc-300">{structureSummary}</p>
            </div>

            {errors.length > 0 && (
              <div className="rounded-[4px] border border-amber-700/30 bg-amber-950/20 p-3">
                <ul className="space-y-1 text-xs text-amber-300/90">
                  {errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Barra de ação fixa — resumo + Iniciar sempre visíveis ao rolar */}
        <div className="sticky bottom-0 z-20 -mx-8 mt-6 border-t border-paper/10 bg-ink-950/90 px-8 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <p className="hidden min-w-0 flex-1 truncate text-sm text-zinc-400 sm:block">
              {errors.length > 0 ? <span className="text-amber-300">{errors[0]}</span> : structureSummary}
            </p>
            <Button
              variant="primary"
              className="shrink-0 px-7 py-3 text-base"
              disabled={errors.length > 0}
              icon={<Rocket size={18} />}
              onClick={handleStart}
            >
              Iniciar campeonato
            </Button>
          </div>
        </div>
      </div>

      <CreateTeamModal
        open={createOpen}
        sport={sport}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => {
          const team = addCustomTeam({ ...input, sport })
          setSelected((s) => [...s, team.id])
          setCatFilter('custom')
          setCreateOpen(false)
        }}
      />
    </div>
  )
}

function validate(
  name: string,
  format: string,
  n: number,
  cfg: { groupCount: number; qualifiers: number; swissRounds: number; playoffQualifiers: number }
): string[] {
  const errs: string[] = []
  if (!name.trim()) errs.push('Dê um nome ao campeonato.')
  if (n < 2) errs.push('Selecione pelo menos 2 times.')
  if (format === 'league' && n < 3) errs.push('A liga precisa de ao menos 3 times.')
  if (format === 'cup' && n < 2) errs.push('O mata-mata precisa de ao menos 2 times.')
  if (format === 'league-playoffs') {
    if (n < 4) errs.push('Liga + playoffs precisa de ao menos 4 times.')
    else if (cfg.playoffQualifiers > n) errs.push('Mais classificados aos playoffs do que times.')
    else if (cfg.playoffQualifiers < 2) errs.push('Os playoffs precisam de ao menos 2 classificados.')
  }
  if (format === 'swiss') {
    if (n % 2 !== 0) errs.push('O sistema suíço exige um número par de times.')
    if (n >= 4 && cfg.swissRounds > n - 1) errs.push(`Máximo de ${n - 1} rodadas para ${n} times.`)
  }
  if (format === 'groups') {
    if (n < cfg.groupCount * 2) errs.push(`Poucos times para ${cfg.groupCount} grupos.`)
    else if (n % cfg.groupCount !== 0) errs.push(`O total de times deve ser divisível por ${cfg.groupCount}.`)
    else {
      const perGroup = n / cfg.groupCount
      if (cfg.qualifiers >= perGroup) errs.push('Classificados por grupo deve ser menor que o tamanho do grupo.')
    }
  }
  return errs
}

function describeStructure(
  format: string,
  n: number,
  cfg: {
    groupCount: number
    qualifiers: number
    swissRounds: number
    homeAndAway: boolean
    bestOf: BestOf
    sport: Sport
    game: EsportsGame
    playoffQualifiers: number
    twoLeggedKO: boolean
  }
): string {
  if (n < 2) return 'Selecione os times participantes para ver o resumo.'
  const serie =
    cfg.sport === 'esports' ? ` ${GAME_META[cfg.game].label} · séries em melhor de ${cfg.bestOf}.` : ''
  const idaVolta = cfg.twoLeggedKO && cfg.sport === 'football' ? ' Mata-mata em ida e volta (final única).' : ''
  if (format === 'league') {
    const games = cfg.homeAndAway ? n * (n - 1) : (n * (n - 1)) / 2
    return `${n} times em pontos corridos${cfg.homeAndAway ? ' (ida e volta)' : ''}. ${games} partidas no total.${serie}`
  }
  if (format === 'league-playoffs') {
    const games = cfg.homeAndAway ? n * (n - 1) : (n * (n - 1)) / 2
    const q = Math.max(2, Math.min(cfg.playoffQualifiers, n))
    return `${n} times em pontos corridos${cfg.homeAndAway ? ' (ida e volta)' : ''} (${games} jogos); os ${q} melhores decidem o título no mata-mata.${idaVolta}`
  }
  if (format === 'cup') {
    return `${n} times em mata-mata. Empates vão para prorrogação e pênaltis.${serie}${idaVolta}`
  }
  if (format === 'groups') {
    if (n % cfg.groupCount !== 0) return `Ajuste o número de times/grupos.${serie}`
    const perGroup = n / cfg.groupCount
    const qual = cfg.groupCount * cfg.qualifiers
    return `${cfg.groupCount} grupos de ${perGroup} times${cfg.homeAndAway ? ' (ida e volta)' : ''}. ${qual} avançam ao mata-mata.${serie}${idaVolta}`
  }
  if (format === 'swiss') {
    return `${n} times, ${cfg.swissRounds} rodadas pelo sistema suíço. Sem eliminação.${serie}`
  }
  return ''
}

function CreateTeamModal({
  open,
  sport,
  onClose,
  onCreate
}: {
  open: boolean
  sport: Sport
  onClose: () => void
  onCreate: (input: { name: string; strength: number; color: string }) => void
}) {
  const [name, setName] = useState('')
  const [strength, setStrength] = useState(70)
  const [color, setColor] = useState(COLOR_SWATCHES[0])

  const reset = () => {
    setName('')
    setStrength(70)
    setColor(COLOR_SWATCHES[0])
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <h3 className="heading mb-1 text-xl font-bold text-white">Criar time</h3>
        <p className="mb-5 text-sm text-zinc-500">Adicione um time {SPORT_META[sport].label} personalizado.</p>

        <div className="mb-4 flex items-center gap-3">
          <TeamBadge
            team={{ id: 'preview', name: name || 'Novo', shortName: (name || 'NEW').slice(0, 3).toUpperCase(), strength, color, category: 'custom', sport }}
            size="lg"
          />
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Nome</label>
            <input className="input" placeholder="Nome do time" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Força</label>
            <span className="tnum text-sm font-bold text-blood-300">{strength}</span>
          </div>
          <Slider value={strength} onChange={setStrength} min={1} max={100} />
        </div>

        <div className="mb-6">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Palette size={13} /> Cor
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cx(
                  'h-8 w-8 rounded-lg ring-2 transition',
                  color === c ? 'ring-white' : 'ring-transparent hover:ring-white/30'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon={<Dices size={16} />}
            disabled={!name.trim()}
            onClick={() => {
              onCreate({ name, strength, color })
              reset()
            }}
          >
            Criar e adicionar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
