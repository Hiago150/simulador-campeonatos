import { useMemo, useState } from 'react'
import { Palette, Pencil, Plus, RotateCcw, Search, Trash2, Users } from 'lucide-react'
import type { EsportsGame, Position, Sport, Team } from '../types'
import { useApp } from '../store/app'
import { PRESET_TEAMS } from '../data/teams'
import { sectorsOf } from '../engine/strength'
import { effectiveEsportsRoster, generateSquad, type FootballPlayerOverride } from '../engine/names'
import { rosterKey } from '../data/esports-rosters'
import { ESPORTS_GAMES, GAME_META, SPORT_META } from '../lib/meta'
import { Button, EmptyState, Modal, Segmented, Slider, StrengthBar } from '../components/ui'
import { ScreenHeader } from '../components/motionx'
import { TeamBadge } from '../components/TeamBadge'
import { cx } from '../lib/cx'

const COLOR_SWATCHES = [
  '#e01b1b', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#0a0a0b', '#e5e7eb'
]

export function TeamsScreen() {
  const customTeams = useApp((s) => s.customTeams)
  const teamOverrides = useApp((s) => s.teamOverrides)
  const rosterOverrides = useApp((s) => s.rosterOverrides)
  const footballRosterOverrides = useApp((s) => s.footballRosterOverrides)
  const addCustomTeam = useApp((s) => s.addCustomTeam)
  const updateCustomTeam = useApp((s) => s.updateCustomTeam)
  const removeCustomTeam = useApp((s) => s.removeCustomTeam)
  const setTeamOverride = useApp((s) => s.setTeamOverride)
  const resetTeamOverride = useApp((s) => s.resetTeamOverride)
  const setToast = useApp((s) => s.setToast)

  const [sport, setSport] = useState<Sport>('football')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Team | null>(null)
  const [creating, setCreating] = useState(false)

  const teams = useMemo(() => {
    const presets = PRESET_TEAMS.map((t) => (teamOverrides[t.id] ? { ...t, ...teamOverrides[t.id] } : t))
    return [...presets, ...customTeams]
      .filter((t) => t.sport === sport)
      .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()))
  }, [customTeams, teamOverrides, sport, search])

  const grouped = useMemo(() => {
    const g: Record<string, Team[]> = { club: [], national: [], custom: [] }
    for (const t of teams) g[t.category]?.push(t)
    return g
  }, [teams])

  const LABELS: Record<string, string> = { club: 'Clubes', national: 'Seleções', custom: 'Meus times' }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <ScreenHeader kicker="O acervo do jogo" title="Todos os" accent="clubes">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Criar time
          </Button>
        </ScreenHeader>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Segmented
            value={sport}
            onChange={(s) => setSport(s)}
            options={(['football', 'esports'] as Sport[]).map((sp) => ({
              value: sp,
              label: `${SPORT_META[sp].emoji} ${SPORT_META[sp].label}`
            }))}
          />
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="input pl-9"
              placeholder="Buscar time..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="tag border-paper/10 text-zinc-500">{teams.length} times</span>
        </div>

        {teams.length === 0 ? (
          <EmptyState title="Nenhum time encontrado" hint="Tente outra busca ou troque o esporte." />
        ) : (
          (['club', 'national', 'custom'] as const).map((cat) =>
            grouped[cat].length === 0 ? null : (
              <section key={cat} className="mb-8">
                <p className="kicker mb-3">
                  <span className="h-1.5 w-1.5 bg-blood-600" />
                  {LABELS[cat]} · {grouped[cat].length}
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[cat].map((team) => {
                    const edited = !!teamOverrides[team.id]
                    const rosterEdited =
                      (team.sport === 'esports' &&
                        ESPORTS_GAMES.some((g) => rosterOverrides[rosterKey(g, team.id)])) ||
                      (team.sport === 'football' && !!footballRosterOverrides[team.id])
                    const isCustom = team.category === 'custom'
                    return (
                      <div key={team.id} className="card group flex items-center gap-3 p-3">
                        <TeamBadge team={team} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-bold text-zinc-100">{team.name}</p>
                            {edited && <span className="tag border-blood-700/40 text-blood-300">editado</span>}
                            {rosterEdited && (
                              <span className="tag border-blood-700/40 text-blood-300">elenco</span>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <StrengthBar value={team.strength} />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => setEditing(team)}
                            title="Editar"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-zinc-300 hover:bg-white/10"
                          >
                            <Pencil size={13} />
                          </button>
                          {isCustom ? (
                            <button
                              onClick={() => {
                                removeCustomTeam(team.id)
                                setToast('Time removido')
                              }}
                              title="Excluir"
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-blood-800/40 bg-blood-950/30 text-blood-300 hover:bg-blood-900/40"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            edited && (
                              <button
                                onClick={() => {
                                  resetTeamOverride(team.id)
                                  setToast('Edição revertida')
                                }}
                                title="Reverter para o original"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-zinc-400 hover:bg-white/10"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          )
        )}
      </div>

      <TeamModal
        open={creating || !!editing}
        editing={editing}
        defaultSport={sport}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSave={(input) => {
          if (editing) {
            if (editing.category === 'custom') {
              updateCustomTeam(editing.id, input)
            } else {
              setTeamOverride(editing.id, {
                name: input.name,
                strength: input.strength,
                color: input.color,
                attack: input.attack,
                midfield: input.midfield,
                defense: input.defense
              })
            }
            setToast('Time atualizado')
          } else {
            addCustomTeam(input)
            setToast('Time criado')
          }
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function TeamModal({
  open,
  editing,
  defaultSport,
  onClose,
  onSave
}: {
  open: boolean
  editing: Team | null
  defaultSport: Sport
  onClose: () => void
  onSave: (input: {
    name: string
    strength: number
    color: string
    sport: Sport
    attack?: number
    midfield?: number
    defense?: number
  }) => void
}) {
  const rosterOverrides = useApp((s) => s.rosterOverrides)
  const setRosterOverride = useApp((s) => s.setRosterOverride)
  const resetRosterOverride = useApp((s) => s.resetRosterOverride)
  const footballRosterOverrides = useApp((s) => s.footballRosterOverrides)
  const setFootballRosterOverride = useApp((s) => s.setFootballRosterOverride)
  const resetFootballRosterOverride = useApp((s) => s.resetFootballRosterOverride)

  const [name, setName] = useState('')
  const [strength, setStrength] = useState(70)
  const [color, setColor] = useState(COLOR_SWATCHES[0])
  const [sport, setSport] = useState<Sport>('football')
  const [attack, setAttack] = useState(70)
  const [midfield, setMidfield] = useState(70)
  const [defense, setDefense] = useState(70)
  const [rosterGame, setRosterGame] = useState<EsportsGame>('cs2')
  const [rostersByGame, setRostersByGame] = useState<Record<EsportsGame, string[]>>({ cs2: [], valorant: [] })
  const [footballRoster, setFootballRoster] = useState<FootballPlayerOverride[]>([])
  const isPreset = !!editing && editing.category !== 'custom'
  const showSectors = sport === 'football'
  // só dá pra editar elenco de um time que já existe (precisa de id)
  const showRoster = !!editing && sport === 'esports'
  const showFootballRoster = !!editing && sport === 'football'

  // sincroniza ao abrir
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setName(editing?.name ?? '')
      setStrength(editing?.strength ?? 70)
      setColor(editing?.color ?? COLOR_SWATCHES[0])
      setSport(editing?.sport ?? defaultSport)
      const sec = editing ? sectorsOf(editing) : { attack: 70, midfield: 70, defense: 70 }
      setAttack(sec.attack)
      setMidfield(sec.midfield)
      setDefense(sec.defense)
      setRosterGame('cs2')
      setRostersByGame(
        editing && editing.sport === 'esports'
          ? {
              cs2: effectiveEsportsRoster(editing, 'cs2', rosterOverrides),
              valorant: effectiveEsportsRoster(editing, 'valorant', rosterOverrides)
            }
          : { cs2: [], valorant: [] }
      )
      setFootballRoster(
        editing && editing.sport === 'football'
          ? generateSquad(editing, undefined, undefined, footballRosterOverrides).map((p) => ({
              name: p.name,
              position: p.position,
              influence: p.influence ?? 1
            }))
          : []
      )
    }
  }

  // persiste os elencos editados (por jogo): se igual ao padrão, remove o override
  const persistRosters = (): void => {
    if (!showRoster || !editing) return
    for (const g of ESPORTS_GAMES) {
      const def = effectiveEsportsRoster(editing, g, {})
      const cur = (rostersByGame[g] ?? []).map((n, i) => n.trim() || def[i])
      if (cur.length === 5 && cur.every((n, i) => n === def[i])) resetRosterOverride(g, editing.id)
      else if (cur.length === 5) setRosterOverride(g, editing.id, cur)
    }
  }

  const editRosterName = (i: number, value: string): void =>
    setRostersByGame((prev) => {
      const next = (prev[rosterGame] ?? []).slice()
      next[i] = value
      return { ...prev, [rosterGame]: next }
    })

  const restoreRoster = (): void => {
    if (!editing) return
    setRostersByGame((prev) => ({ ...prev, [rosterGame]: effectiveEsportsRoster(editing, rosterGame, {}) }))
  }

  // persiste o elenco de futebol editado: se igual ao padrão (nome, posição e
  // influência neutra), remove o override em vez de guardar um "não-edit"
  const persistFootballRoster = (): void => {
    if (!showFootballRoster || !editing) return
    const def = generateSquad(editing, undefined, undefined, {})
    const cur = footballRoster.map((p, i) => ({
      name: p.name.trim() || def[i]?.name || `Jogador ${i + 1}`,
      position: p.position,
      influence: p.influence
    }))
    const isDefault =
      cur.length === def.length &&
      cur.every((p, i) => p.name === def[i].name && p.position === def[i].position && p.influence === 1)
    if (isDefault) resetFootballRosterOverride(editing.id)
    else setFootballRosterOverride(editing.id, cur)
  }

  const editFootballPlayer = (i: number, patch: Partial<FootballPlayerOverride>): void =>
    setFootballRoster((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const restoreFootballRoster = (): void => {
    if (!editing) return
    setFootballRoster(
      generateSquad(editing, undefined, undefined, {}).map((p) => ({ name: p.name, position: p.position, influence: 1 }))
    )
  }

  const handleSave = (): void => {
    persistRosters()
    persistFootballRoster()
    onSave(showSectors ? { name, strength, color, sport, attack, midfield, defense } : { name, strength, color, sport })
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <h3 className="display mb-5 text-2xl text-zinc-100">{editing ? 'Editar time' : 'Criar time'}</h3>

        <div className="mb-4 flex items-center gap-3">
          <TeamBadge
            team={{ id: editing?.id ?? 'preview', name: name || 'Novo', shortName: (name || 'NEW').slice(0, 3).toUpperCase(), strength, color, category: 'custom', sport }}
            size="lg"
          />
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Nome</label>
            <input className="input" placeholder="Nome do time" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
        </div>

        {!isPreset && (
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Esporte</label>
            <Segmented
              value={sport}
              onChange={setSport}
              options={(['football', 'esports'] as Sport[]).map((sp) => ({
                value: sp,
                label: `${SPORT_META[sp].emoji} ${SPORT_META[sp].label}`
              }))}
            />
          </div>
        )}

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Força {showSectors && <span className="text-zinc-600">(geral)</span>}
            </label>
            <span className="tnum text-sm font-bold text-blood-300">{strength}</span>
          </div>
          <Slider value={strength} onChange={setStrength} min={1} max={100} />
        </div>

        {showSectors && (
          <div className="mb-6 space-y-3 rounded-xl border border-white/5 bg-ink-850/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Setores</p>
            {(
              [
                ['Ataque', attack, setAttack],
                ['Meio-campo', midfield, setMidfield],
                ['Defesa', defense, setDefense]
              ] as [string, number, (v: number) => void][]
            ).map(([label, value, set]) => (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">{label}</label>
                  <span className="tnum text-xs font-bold text-zinc-200">{value}</span>
                </div>
                <Slider value={value} onChange={set} min={1} max={99} />
              </div>
            ))}
          </div>
        )}

        {showRoster && (
          <div className="mb-6 space-y-3 rounded-xl border border-white/5 bg-ink-850/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <Users size={12} /> Elenco
              </p>
              <Segmented
                value={rosterGame}
                onChange={(v) => setRosterGame(v as EsportsGame)}
                options={ESPORTS_GAMES.map((g) => ({ value: g, label: `${GAME_META[g].emoji} ${GAME_META[g].short}` }))}
              />
            </div>
            {(rostersByGame[rosterGame] ?? []).map((n, i) => (
              <input
                key={i}
                className="input py-1.5 text-sm"
                placeholder={`Jogador ${i + 1}`}
                value={n}
                onChange={(e) => editRosterName(i, e.target.value)}
              />
            ))}
            <button
              onClick={restoreRoster}
              className="flex items-center gap-1.5 text-xs text-zinc-500 underline hover:text-zinc-200"
            >
              <RotateCcw size={12} /> Restaurar elenco padrão ({GAME_META[rosterGame].short})
            </button>
          </div>
        )}

        {showFootballRoster && (
          <div className="mb-6 space-y-3 rounded-xl border border-white/5 bg-ink-850/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <Users size={12} /> Elenco · nome, posição e influência (protagonismo em gols/assistências)
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {footballRoster.map((p, i) => (
                <div key={i} className="rounded-lg bg-ink-900/40 p-2">
                  <div className="mb-1.5 flex items-center gap-2">
                    <input
                      className="input flex-1 py-1.5 text-sm"
                      placeholder={`Jogador ${i + 1}`}
                      value={p.name}
                      onChange={(e) => editFootballPlayer(i, { name: e.target.value })}
                    />
                    <select
                      className="input w-auto shrink-0 py-1.5 text-xs"
                      value={p.position}
                      onChange={(e) => editFootballPlayer(i, { position: e.target.value as Position })}
                    >
                      <option value="GK">GOL</option>
                      <option value="DEF">ZAG</option>
                      <option value="MID">MEI</option>
                      <option value="FWD">ATA</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-[11px] text-zinc-500">Influência</span>
                    <Slider
                      value={p.influence}
                      onChange={(v) => editFootballPlayer(i, { influence: v })}
                      min={0.5}
                      max={2}
                      step={0.1}
                    />
                    <span className="tnum w-8 shrink-0 text-right text-xs font-bold text-zinc-200">
                      {p.influence.toFixed(1)}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={restoreFootballRoster}
              className="flex items-center gap-1.5 text-xs text-zinc-500 underline hover:text-zinc-200"
            >
              <RotateCcw size={12} /> Restaurar elenco padrão
            </button>
          </div>
        )}

        <div className="mb-6">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Palette size={13} /> Cor {isPreset && <span className="text-zinc-600">(usada quando não há escudo)</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cx('h-8 w-8 rounded-xl ring-2 transition', color === c ? 'ring-white' : 'ring-transparent hover:ring-white/30')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={handleSave}>
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
