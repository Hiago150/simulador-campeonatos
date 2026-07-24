// Modo Carreira (Fase 1 — núcleo jogável, futebol): você assume 1 clube,
// escala o time (elenco real com OVR), joga a liga do ano com o motor
// existente e responde à diretoria. Sem mercado ainda (Fase 2).
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Briefcase,
  Check,
  ChevronRight,
  Coins,
  Crown,
  FastForward,
  FileSignature,
  Flag,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShoppingCart,
  Smile,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  X
} from 'lucide-react'
import type { Match, Team } from '../types'
import type { CareerPlayer, FormationId } from '../types-career'
import { useApp } from '../store/app'
import { useCareer } from '../store/career'
import { presetsForSport } from '../data/teams'
import { collectionsForSport } from '../data/collections'
import { currentRoundInfo } from '../engine/tournament'
import { leagueStandings, teamMap } from '../engine/selectors'
import {
  FORMATIONS,
  FORMATION_IDS,
  TIER_LABEL,
  askingPrice,
  clubTier,
  lineupSectors,
  moraleLabel,
  renewalCost,
  wageBill
} from '../engine/career'
import { Button, Modal } from '../components/ui'
import { StandingsTable } from '../components/StandingsTable'
import { TeamBadge } from '../components/TeamBadge'
import { MatchModal } from '../components/MatchModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { cx } from '../lib/cx'

const POS_LABEL: Record<string, string> = { GK: 'GOL', DEF: 'DEF', MID: 'MEI', FWD: 'ATA' }
const POS_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 }

/** posição esperada de cada slot do XI pela formação (0 = GK, depois DEF/MID/FWD) */
function slotPosition(formation: FormationId, index: number): 'GK' | 'DEF' | 'MID' | 'FWD' {
  const shape = FORMATIONS[formation]
  if (index === 0) return 'GK'
  if (index <= shape.def) return 'DEF'
  if (index <= shape.def + shape.mid) return 'MID'
  return 'FWD'
}

export function CareerScreen() {
  const career = useCareer((s) => s.career)
  if (!career) return <NewCareer />
  if (career.status === 'year-review') return <YearReviewView />
  if (career.status === 'offers') return <OffersView />
  return <CareerHub />
}

// ─── Nova carreira ───────────────────────────────────────────────────────────

function NewCareer() {
  const startCareer = useCareer((s) => s.startCareer)
  const customTeams = useApp((s) => s.customTeams)
  const teamOverrides = useApp((s) => s.teamOverrides)

  const [managerName, setManagerName] = useState('')
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [clubId, setClubId] = useState<string | null>(null)

  const pool = useMemo<Team[]>(
    () =>
      [...presetsForSport('football'), ...customTeams.filter((t) => t.sport === 'football')].map((t) =>
        teamOverrides[t.id] ? { ...t, ...teamOverrides[t.id] } : t
      ),
    [customTeams, teamOverrides]
  )
  const poolMap = useMemo(() => Object.fromEntries(pool.map((t) => [t.id, t])), [pool])

  // ligas viáveis: coleções de clubes com 8-24 times (uma liga jogável por ano)
  const leagues = useMemo(
    () =>
      collectionsForSport('football').filter((c) => {
        const n = c.teamIds.filter((id) => poolMap[id]).length
        return n >= 8 && n <= 24
      }),
    [poolMap]
  )
  const league = leagues.find((l) => l.id === collectionId) ?? null
  const clubs = useMemo(
    () =>
      (league?.teamIds ?? [])
        .map((id) => poolMap[id])
        .filter((t): t is Team => !!t)
        .sort((a, b) => b.strength - a.strength),
    [league, poolMap]
  )

  const canStart = !!league && !!clubId && clubs.some((c) => c.id === clubId)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <p className="kicker mb-1">
          <span className="h-1.5 w-1.5 bg-blood-600" />
          Modo Carreira
        </p>
        <h1 className="display text-4xl text-zinc-100">
          Nova <span className="italic text-blood-500">carreira</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
          Assuma um clube em primeira pessoa: escale o time, jogue a liga ano após ano e responda à
          diretoria pelo resultado. Ir bem abre portas em clubes maiores — ir mal encerra contratos.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Seu nome (técnico)</label>
          <input
            className="input max-w-sm"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="Ex.: Hiago Flausino"
          />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Liga</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {leagues.map((l) => {
              const n = l.teamIds.filter((id) => poolMap[id]).length
              const active = collectionId === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => {
                    setCollectionId(l.id)
                    setClubId(null)
                  }}
                  className={cx(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                    active ? 'border-blood-600/60 bg-blood-950/20' : 'border-white/5 bg-ink-800/60 hover:border-white/15'
                  )}
                >
                  <Flag size={15} className={active ? 'text-blood-400' : 'text-zinc-500'} />
                  <span className={cx('flex-1 text-sm font-semibold', active ? 'text-zinc-100' : 'text-zinc-300')}>
                    {l.label}
                  </span>
                  <span className="text-[11px] text-zinc-600">{n} clubes</span>
                </button>
              )
            })}
          </div>
        </div>

        {league && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Clube</p>
            <div className="grid select-none grid-cols-2 gap-1.5 sm:grid-cols-3">
              {clubs.map((t) => {
                const active = clubId === t.id
                const tier = clubTier(t.strength)
                return (
                  <button
                    key={t.id}
                    onClick={() => setClubId(t.id)}
                    className={cx(
                      'flex items-center gap-2 rounded-xl border p-2 text-left transition',
                      active ? 'border-blood-600/60 bg-blood-950/25' : 'border-white/5 bg-ink-800/60 hover:border-white/15'
                    )}
                  >
                    <TeamBadge team={t} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-zinc-200">{t.name}</span>
                      <span className="block text-[10px] text-zinc-600">
                        {TIER_LABEL[tier]} · força {t.strength}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-7 flex items-center gap-3">
          <Button
            variant="primary"
            icon={<Briefcase size={15} />}
            disabled={!canStart}
            onClick={() => {
              if (!league || !clubId) return
              startCareer({ managerName, universeLabel: league.label, teams: clubs, clubId })
            }}
          >
            Assinar contrato
          </Button>
          {league && clubId && (
            <p className="text-xs text-zinc-600">
              A diretoria define o objetivo assim que você assinar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hub da carreira (temporada em andamento) ────────────────────────────────

function CareerHub() {
  const career = useCareer((s) => s.career)
  const simRound = useCareer((s) => s.simRound)
  const simYear = useCareer((s) => s.simYear)
  const setFormation = useCareer((s) => s.setFormation)
  const setStarter = useCareer((s) => s.setStarter)
  const autoLineup = useCareer((s) => s.autoLineup)
  const closeWindow = useCareer((s) => s.closeWindow)
  const abandonCareer = useCareer((s) => s.abandonCareer)

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [swapSlot, setSwapSlot] = useState<number | null>(null)
  const [showSquad, setShowSquad] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [showMarket, setShowMarket] = useState(false)
  const [showEvents, setShowEvents] = useState(false)

  const c = career!
  const windowOpen = !!c.window
  const t = c.tournament
  const club = c.teams.find((x) => x.id === c.clubId)!
  const teams = useMemo(() => (t ? teamMap(t) : {}), [t])
  const rows = useMemo(() => (t ? leagueStandings(t) : []), [t])
  const roundInfo = useMemo(() => (t ? currentRoundInfo(t) : { label: '', matchIds: [] }), [t])
  const sectors = useMemo(() => lineupSectors(c.players, c.lineup), [c.players, c.lineup])
  const finished = t?.phase === 'finished'

  const clubMatches = useMemo(
    () =>
      (t?.matches ?? [])
        .filter((m) => m.homeId === c.clubId || m.awayId === c.clubId)
        .sort((a, b) => a.round - b.round),
    [t, c.clubId]
  )
  const nextMatch = clubMatches.find((m) => !m.played)
  const selectedMatch = selectedMatchId ? t?.matches.find((m) => m.id === selectedMatchId) ?? null : null

  const playersById = useMemo(() => Object.fromEntries(c.players.map((p) => [p.id, p])), [c.players])
  const starters = c.lineup.starterIds.map((id) => playersById[id]).filter((p): p is CareerPlayer => !!p)
  const bench = c.players
    .filter((p) => !c.lineup.starterIds.includes(p.id))
    .sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall)

  const tier = clubTier(club.strength)
  const pendingEvents = c.events.filter((e) => !e.resolvedOptionId)

  // early-return DEPOIS de todos os hooks (ordem de hooks estável)
  if (showMarket && windowOpen) return <MarketView onBack={() => setShowMarket(false)} />

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="kicker">
              <span className="h-1.5 w-1.5 bg-blood-600" />
              Modo Carreira — Ano {c.year}
            </p>
            <button
              onClick={() => setConfirmAbandon(true)}
              className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Abandonar carreira
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TeamBadge team={club} size="lg" />
            <div className="min-w-0">
              <h1 className="display text-3xl leading-tight text-zinc-100 md:text-4xl">{club.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="tag bg-ink-800 text-zinc-300">
                  <Briefcase size={11} /> {c.managerName}
                </span>
                <span className="tag bg-ink-800 text-zinc-300">{c.universeLabel}</span>
                <span className="tag bg-ink-800 text-zinc-500">{TIER_LABEL[tier]}</span>
                {c.titles.length > 0 && (
                  <span className="tag border-gold-600/40 text-gold-400">
                    <Trophy size={11} /> {c.titles.length} título{c.titles.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Diretoria: objetivo + confiança + reputação */}
        <div className="mb-5 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="panel flex items-center gap-3 px-4 py-3">
            <Shield size={18} className="shrink-0 text-blood-400" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Objetivo da diretoria</p>
              <p className="truncate text-sm font-bold text-zinc-100">{c.objective.label}</p>
            </div>
          </div>
          <MeterCard label="Confiança da diretoria" value={c.confidence} danger={c.confidence <= 25} />
          <MeterCard label="Reputação do técnico" value={c.reputation} />
        </div>

        {/* Finanças */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="panel flex items-center gap-3 px-4 py-3">
            <Coins size={18} className="shrink-0 text-gold-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Caixa de transferências</p>
              <p className="tnum text-lg font-bold text-zinc-100">{c.budget}M</p>
            </div>
          </div>
          <div className="panel px-4 py-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Folha salarial</p>
              <p className="tnum text-xs text-zinc-400">
                <span className="font-bold text-zinc-100">{wageBill(c.players)}M</span> / {c.wageBudget}M
              </p>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-gold-grad transition-all"
                style={{ width: `${Math.min(100, (wageBill(c.players) / c.wageBudget) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Caixa de entrada de eventos (Fase 3) */}
        {c.events.length > 0 && (
          <button
            onClick={() => setShowEvents(true)}
            className={cx(
              'mb-5 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition',
              pendingEvents.length > 0
                ? 'animate-fade-up border-amber-600/40 bg-amber-950/20 hover:border-amber-500/60'
                : 'border-white/5 bg-ink-800/40 hover:border-white/15'
            )}
          >
            <Bell size={18} className={cx('shrink-0', pendingEvents.length > 0 ? 'text-amber-400' : 'text-zinc-500')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-100">
                {pendingEvents.length > 0
                  ? `${pendingEvents.length} decisão${pendingEvents.length === 1 ? '' : 'ões'} esperando você`
                  : 'Nenhuma decisão pendente'}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {pendingEvents.length > 0 ? pendingEvents[0].title : 'Ver o histórico de decisões da carreira'}
              </p>
            </div>
            {pendingEvents.length > 0 && (
              <span className="tnum shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-ink-950">
                {pendingEvents.length}
              </span>
            )}
            <ChevronRight size={16} className="shrink-0 text-zinc-600" />
          </button>
        )}

        {/* Saídas por fim de contrato (Bosman) no último turnover */}
        {c.lastFreeAgents && c.lastFreeAgents.length > 0 && (
          <div className="mb-5 rounded-xl border border-blood-700/40 bg-blood-950/20 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-100">
              <FileSignature size={15} className="text-blood-400" /> Saíram de graça (contrato vencido)
            </p>
            <p className="text-xs text-zinc-400">
              {c.lastFreeAgents.map((f) => `${f.name} (${f.overall})`).join(' · ')}
            </p>
          </div>
        )}

        {/* Janela de transferências aberta */}
        {windowOpen && (
          <div className="animate-fade-up mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-blood-600/40 bg-blood-950/25 p-4">
            <ArrowRightLeft size={18} className="shrink-0 text-blood-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-100">
                Janela {c.window === 'pre-season' ? 'de pré-temporada' : 'intermediária'} aberta
              </p>
              <p className="text-xs text-zinc-500">
                Contrate e venda antes de {c.window === 'pre-season' ? 'a temporada começar' : 'retomar'}. Simular fica travado enquanto a janela estiver aberta.
              </p>
            </div>
            <Button icon={<ShoppingCart size={14} />} onClick={() => setShowMarket(true)}>
              Abrir mercado
            </Button>
            <Button variant="primary" icon={<Check size={14} />} onClick={closeWindow}>
              {c.window === 'pre-season' ? 'Começar a temporada' : 'Retomar temporada'}
            </Button>
          </div>
        )}

        {/* Ações do ano */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {!finished ? (
            <>
              <Button icon={<Play size={14} />} disabled={!t || windowOpen || roundInfo.matchIds.length === 0} onClick={simRound}>
                Simular {roundInfo.label ? roundInfo.label.split(' · ')[0].toLowerCase() : 'rodada'}
              </Button>
              <Button variant="primary" icon={<FastForward size={15} />} disabled={!t || windowOpen} onClick={simYear}>
                Simular a temporada inteira
              </Button>
            </>
          ) : (
            <span className="tag border-win-700/40 text-win-400">
              <Check size={12} /> Temporada encerrada
            </span>
          )}
          {nextMatch && !finished && (
            <span className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
              Próximo jogo:
              <TeamBadge team={teams[nextMatch.homeId === c.clubId ? nextMatch.awayId : nextMatch.homeId]} size="xs" />
              <span className="font-semibold text-zinc-300">
                {teams[nextMatch.homeId === c.clubId ? nextMatch.awayId : nextMatch.homeId]?.name}
              </span>
              <span className="text-zinc-600">({nextMatch.homeId === c.clubId ? 'casa' : 'fora'})</span>
            </span>
          )}
        </div>

        <div className="grid items-start gap-5 min-[960px]:grid-cols-[1fr_minmax(360px,440px)]">
          {/* Classificação */}
          <div className="card p-4">
            <p className="mb-2 text-sm font-bold text-white">Classificação</p>
            {t ? (
              <StandingsTable rows={rows} teams={teams} sport="football" />
            ) : (
              <p className="text-sm text-zinc-600">Liga ainda não montada.</p>
            )}
          </div>

          {/* Escalação + jogos do clube */}
          <div className="flex flex-col gap-5">
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">Escalação padrão</p>
                <button onClick={autoLineup} className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-200">
                  <RotateCcw size={11} /> Melhor XI
                </button>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                {FORMATION_IDS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormation(f)}
                    className={cx(
                      'rounded-lg px-2.5 py-1 text-xs font-bold transition',
                      c.lineup.formation === f
                        ? 'bg-blood-grad text-white shadow-glow-sm'
                        : 'bg-ink-800 text-zinc-400 hover:text-zinc-100'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* setores traduzidos (o que o motor vai receber) */}
              <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                {[
                  ['OVR', sectors.strength],
                  ['ATA', sectors.attack],
                  ['MEI', sectors.midfield],
                  ['DEF', sectors.defense]
                ].map(([label, v]) => (
                  <div key={label} className="rounded-lg bg-ink-800/70 px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">{label}</p>
                    <p className="tnum text-base font-bold text-zinc-100">{v}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                {starters.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setSwapSlot(i)}
                    disabled={finished}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.04] disabled:opacity-60"
                    title="Trocar titular"
                  >
                    <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-zinc-600">
                      {POS_LABEL[slotPosition(c.lineup.formation, i)]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{p.name}</span>
                    <MoraleDot morale={p.morale} />
                    {p.contractYears <= 1 && (
                      <span className="shrink-0 rounded bg-blood-950/60 px-1 text-[9px] font-bold text-blood-300" title="Contrato acabando">
                        {p.contractYears}a
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] text-zinc-600">{p.age} anos</span>
                    <span className="tnum w-7 shrink-0 text-right text-sm font-bold text-zinc-100">{p.overall}</span>
                    <ChevronRight size={13} className="shrink-0 text-zinc-700" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowSquad((v) => !v)}
                className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 hover:text-zinc-200"
              >
                <Users size={12} /> {showSquad ? 'Esconder elenco completo' : `Ver elenco completo (${c.players.length})`}
              </button>
              {showSquad && (
                <div className="mt-2 flex flex-col gap-0.5 border-t border-white/5 pt-2">
                  {[...c.players]
                    .sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall)
                    .map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                        <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-zinc-600">{POS_LABEL[p.position]}</span>
                        <span className={cx('min-w-0 flex-1 truncate', c.lineup.starterIds.includes(p.id) ? 'text-zinc-200' : 'text-zinc-500')}>
                          {p.name}
                        </span>
                        <MoraleDot morale={p.morale} />
                        <span className="shrink-0 text-[10px] text-zinc-600">{p.age}a</span>
                        <span className="tnum w-6 shrink-0 text-right font-bold text-zinc-300">{p.overall}</span>
                        <span className="tnum w-8 shrink-0 text-right text-[10px] text-zinc-600">pot {p.potential}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Jogos do clube */}
            <div className="card p-4">
              <p className="mb-2 text-sm font-bold text-white">Jogos do {club.shortName}</p>
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
                {clubMatches.map((m) => (
                  <ClubMatchRow
                    key={m.id}
                    match={m}
                    clubId={c.clubId}
                    teams={teams}
                    onOpen={() => m.played && setSelectedMatchId(m.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* troca de titular */}
      <Modal open={swapSlot !== null} onClose={() => setSwapSlot(null)} maxWidth="max-w-md">
        {swapSlot !== null && (
          <SwapPicker
            slotIndex={swapSlot}
            position={slotPosition(c.lineup.formation, swapSlot)}
            current={playersById[c.lineup.starterIds[swapSlot]]}
            bench={bench}
            onPick={(playerId) => {
              setStarter(swapSlot, playerId)
              setSwapSlot(null)
            }}
          />
        )}
      </Modal>

      <MatchModal
        match={selectedMatch ?? null}
        home={selectedMatch ? teams[selectedMatch.homeId] : undefined}
        away={selectedMatch ? teams[selectedMatch.awayId] : undefined}
        sport="football"
        onClose={() => setSelectedMatchId(null)}
      />

      <Modal open={showEvents} onClose={() => setShowEvents(false)} maxWidth="max-w-lg">
        <EventsModal />
      </Modal>

      <ConfirmDialog
        open={confirmAbandon}
        title="Abandonar a carreira?"
        message="Todo o progresso desta carreira (anos, títulos, reputação) será apagado. Essa ação não tem volta."
        confirmLabel="Abandonar"
        onCancel={() => setConfirmAbandon(false)}
        onConfirm={() => {
          setConfirmAbandon(false)
          abandonCareer()
        }}
      />
    </div>
  )
}

/** bolinha de moral com tooltip — verde feliz, âmbar neutro, vermelho querendo sair */
function MoraleDot({ morale }: { morale: number }) {
  const color = morale >= 60 ? 'bg-win-400' : morale >= 40 ? 'bg-amber-400' : 'bg-blood-500'
  return (
    <span
      title={`Moral: ${moraleLabel(morale)} (${morale})`}
      className={cx('h-2 w-2 shrink-0 rounded-full', color)}
    />
  )
}

// ─── Caixa de eventos (Fase 3) ───────────────────────────────────────────────

function EventsModal() {
  const career = useCareer((s) => s.career)
  const resolveEvent = useCareer((s) => s.resolveEvent)
  const setToast = useApp((s) => s.setToast)
  const c = career!
  const pending = c.events.filter((e) => !e.resolvedOptionId)
  const done = c.events.filter((e) => e.resolvedOptionId).slice(0, 8)

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4">
        <Bell size={18} className="text-amber-400" />
        <h2 className="heading text-lg text-white">Decisões</h2>
        {pending.length > 0 && (
          <span className="tnum rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-ink-950">{pending.length}</span>
        )}
      </div>
      <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
        {pending.length === 0 && done.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-600">Nada acontecendo por enquanto.</p>
        )}

        {pending.map((e) => (
          <div key={e.id} className="rounded-xl border border-amber-600/30 bg-amber-950/10 p-4">
            <p className="text-sm font-bold text-zinc-100">{e.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{e.text}</p>
            <div className="mt-3 flex flex-col gap-2">
              {e.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    resolveEvent(e.id, o.id)
                    const after = useCareer.getState().career?.events.find((x) => x.id === e.id)
                    if (after?.outcome) setToast(after.outcome)
                  }}
                  className="rounded-lg border border-white/10 bg-ink-800/60 px-3 py-2 text-left transition hover:border-blood-600/50 hover:bg-ink-800"
                >
                  <p className="text-xs font-bold text-zinc-100">{o.label}</p>
                  <p className="text-[11px] text-zinc-500">{o.detail}</p>
                </button>
              ))}
            </div>
          </div>
        ))}

        {done.length > 0 && (
          <div className="pt-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Já decididas</p>
            {done.map((e) => (
              <div key={e.id} className="mb-1.5 rounded-lg bg-ink-800/40 px-3 py-2">
                <p className="text-xs font-semibold text-zinc-300">{e.title}</p>
                {e.outcome && <p className="text-[11px] text-zinc-500">{e.outcome}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MeterCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="panel px-4 py-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <p className={cx('tnum text-sm font-bold', danger ? 'text-blood-400' : 'text-zinc-100')}>{value}</p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
        <div
          className={cx('h-full rounded-full transition-all duration-500', danger ? 'bg-blood-600' : 'bg-blood-grad')}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function ClubMatchRow({
  match,
  clubId,
  teams,
  onOpen
}: {
  match: Match
  clubId: string
  teams: Record<string, Team>
  onOpen: () => void
}) {
  const home = match.homeId === clubId
  const opponent = teams[home ? match.awayId : match.homeId]
  const my = home ? match.homeScore : match.awayScore
  const their = home ? match.awayScore : match.homeScore
  const result = !match.played ? null : my > their ? 'V' : my < their ? 'D' : 'E'
  return (
    <button
      onClick={onOpen}
      disabled={!match.played}
      className={cx(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition',
        match.played ? 'hover:bg-white/[0.04]' : 'opacity-60'
      )}
    >
      <span className="tnum w-6 shrink-0 text-[10px] font-bold text-zinc-600">R{match.round}</span>
      <TeamBadge team={opponent} size="xs" />
      <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{opponent?.name ?? '—'}</span>
      <span className="shrink-0 text-[10px] text-zinc-600">{home ? 'casa' : 'fora'}</span>
      {match.played ? (
        <>
          <span
            className={cx(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold',
              result === 'V' ? 'bg-win-900/60 text-win-400' : result === 'D' ? 'bg-blood-950/60 text-blood-400' : 'bg-ink-700 text-zinc-400'
            )}
          >
            {result}
          </span>
          <span className="tnum shrink-0 text-xs font-bold text-zinc-100">
            {my}–{their}
          </span>
        </>
      ) : (
        <span className="shrink-0 text-[10px] text-zinc-700">a jogar</span>
      )}
    </button>
  )
}

function SwapPicker({
  slotIndex,
  position,
  current,
  bench,
  onPick
}: {
  slotIndex: number
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  current?: CareerPlayer
  bench: CareerPlayer[]
  onPick: (playerId: string) => void
}) {
  const samePos = bench.filter((p) => p.position === position)
  const others = bench.filter((p) => p.position !== position)
  const Row = ({ p, off }: { p: CareerPlayer; off?: boolean }) => (
    <button
      onClick={() => onPick(p.id)}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[0.05]"
    >
      <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-zinc-600">{POS_LABEL[p.position]}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{p.name}</span>
      {off && <span className="shrink-0 text-[9px] uppercase text-amber-500/80">fora de posição</span>}
      <span className="shrink-0 text-[10px] text-zinc-600">{p.age}a</span>
      <span className="tnum w-7 shrink-0 text-right text-sm font-bold text-zinc-100">{p.overall}</span>
    </button>
  )
  return (
    <div>
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="heading text-lg text-white">Trocar titular</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Vaga {slotIndex + 1} · {POS_LABEL[position]}
          {current && <> — hoje: {current.name} ({current.overall})</>}
        </p>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {samePos.length === 0 && others.length === 0 && (
          <p className="px-3 py-4 text-sm text-zinc-600">Sem reservas no elenco.</p>
        )}
        {samePos.map((p) => (
          <Row key={p.id} p={p} />
        ))}
        {others.length > 0 && (
          <>
            <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Outras posições
            </p>
            {others.map((p) => (
              <Row key={p.id} p={p} off />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Veredito do ano ─────────────────────────────────────────────────────────

function YearReviewView() {
  const career = useCareer((s) => s.career)
  const advanceAfterReview = useCareer((s) => s.advanceAfterReview)
  const c = career!
  const r = c.pendingReview
  if (!r) return null

  const outcomeMeta = {
    superou: { label: 'Superou o objetivo', cls: 'border-gold-600/40 text-gold-400' },
    cumpriu: { label: 'Objetivo cumprido', cls: 'border-win-700/40 text-win-400' },
    falhou: { label: 'Objetivo frustrado', cls: 'border-blood-700/40 text-blood-300' }
  }[r.outcome]

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <p className="kicker mb-1">
          <span className="h-1.5 w-1.5 bg-blood-600" />
          Fim do Ano {r.year}
        </p>
        <h1 className="display text-4xl text-zinc-100">{r.clubName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={cx('tag', outcomeMeta.cls)}>{outcomeMeta.label}</span>
          <span className="tag bg-ink-800 text-zinc-300">
            {r.position}º de {r.totalTeams}
          </span>
          {r.champion && (
            <span className="tag border-gold-600/40 text-gold-400">
              <Trophy size={11} /> Campeão
            </span>
          )}
        </div>

        {/* veredito da diretoria */}
        <div className="panel mt-6 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Shield size={13} className="text-blood-400" /> Palavra da diretoria
          </p>
          <p className="text-sm leading-relaxed text-zinc-200">{r.text}</p>
          <p className="mt-2 text-[11px] text-zinc-600">Objetivo do ano: {r.objectiveLabel}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DeltaCard label="Confiança da diretoria" delta={r.confidenceDelta} end={r.confidenceEnd} />
          <DeltaCard label="Reputação do técnico" delta={r.reputationDelta} end={r.reputationEnd} />
        </div>

        {r.revenue != null && (
          <div className="panel mt-3 flex items-center gap-3 px-4 py-3">
            <Coins size={18} className="shrink-0 text-gold-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Receita da temporada</p>
              <p className="text-xs text-zinc-400">Patrocínio + premiação pela campanha entram no caixa.</p>
            </div>
            <span className="tnum text-lg font-bold text-gold-400">+{r.revenue}M</span>
          </div>
        )}

        {r.evolution.length > 0 && (
          <div className="panel mt-4 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Evolução do elenco na virada do ano
            </p>
            <div className="flex flex-col gap-1">
              {r.evolution.map((e) => {
                const up = e.after > e.before
                return (
                  <div key={e.playerId} className="flex items-center gap-2 text-sm">
                    {up ? (
                      <TrendingUp size={13} className="shrink-0 text-win-400" />
                    ) : (
                      <TrendingDown size={13} className="shrink-0 text-blood-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-zinc-300">{e.name}</span>
                    <span className="tnum text-xs text-zinc-500">
                      {e.before} → <span className={up ? 'font-bold text-win-400' : 'font-bold text-blood-400'}>{e.after}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-7">
          <Button variant="primary" icon={r.fired ? <ArrowRight size={15} /> : <Flag size={15} />} onClick={advanceAfterReview}>
            {r.fired ? 'Ver ofertas de emprego' : `Seguir para o Ano ${r.year + 1}`}
          </Button>
          {r.fired && (
            <p className="mt-2 text-xs text-zinc-600">
              Você está livre no mercado — a reputação define quem vem bater na sua porta.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function DeltaCard({ label, delta, end }: { label: string; delta: number; end: number }) {
  const up = delta >= 0
  return (
    <div className="panel px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cx('tnum text-lg font-bold', up ? 'text-win-400' : 'text-blood-400')}>
          {up ? '+' : ''}
          {delta}
        </span>
        <span className="tnum text-xs text-zinc-500">agora {end}</span>
      </div>
    </div>
  )
}

// ─── Ofertas de emprego ──────────────────────────────────────────────────────

function OffersView() {
  const career = useCareer((s) => s.career)
  const acceptOffer = useCareer((s) => s.acceptOffer)
  const abandonCareer = useCareer((s) => s.abandonCareer)
  const [confirmRetire, setConfirmRetire] = useState(false)
  const c = career!
  const offers = c.pendingOffers ?? []
  const teamsById = useMemo(() => Object.fromEntries(c.teams.map((t) => [t.id, t])), [c.teams])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <p className="kicker mb-1">
          <span className="h-1.5 w-1.5 bg-blood-600" />
          Livre no mercado
        </p>
        <h1 className="display text-4xl text-zinc-100">
          Ofertas de <span className="italic text-blood-500">emprego</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500">
          Reputação {c.reputation} — {offers.length} clube{offers.length === 1 ? '' : 's'} procurou você.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {offers.map((o) => {
            const team = teamsById[o.clubId]
            if (!team) return null
            return (
              <div key={o.clubId} className="panel flex items-center gap-4 p-4">
                <TeamBadge team={team} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-100">{team.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {TIER_LABEL[o.tier]} · força {team.strength}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-zinc-400">{o.note}</p>
                </div>
                <Button variant="primary" icon={<Check size={14} />} onClick={() => acceptOffer(o.clubId)}>
                  Aceitar
                </Button>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setConfirmRetire(true)}
          className="mt-6 flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <X size={12} /> Encerrar a carreira (aposentar)
        </button>

        {c.history.length > 0 && (
          <div className="panel mt-6 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Crown size={13} className="text-amber-400" /> Sua trajetória
            </p>
            {c.history.map((h) => (
              <div key={h.year} className="flex items-center gap-2 py-1 text-xs">
                <span className="tnum w-10 shrink-0 font-bold text-zinc-600">Ano {h.year}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-300">{h.clubName}</span>
                {h.champion && <Trophy size={11} className="shrink-0 text-gold-400" />}
                <span className="tnum shrink-0 text-zinc-500">
                  {h.position}º/{h.totalTeams}
                </span>
                <span
                  className={cx(
                    'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                    h.outcome === 'falhou' ? 'bg-blood-950/60 text-blood-400' : 'bg-win-900/50 text-win-400'
                  )}
                >
                  {h.outcome}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmRetire}
        title="Encerrar a carreira?"
        message="A aposentadoria apaga esta carreira (anos, títulos, reputação). Essa ação não tem volta."
        confirmLabel="Aposentar"
        onCancel={() => setConfirmRetire(false)}
        onConfirm={() => {
          setConfirmRetire(false)
          abandonCareer()
        }}
      />
    </div>
  )
}

// ─── Mercado de transferências (Fase 2) ──────────────────────────────────────

type MarketPlayer = CareerPlayer & { clubId: string; clubName: string; sellerStrength: number; starter: boolean }

function MarketView({ onBack }: { onBack: () => void }) {
  const career = useCareer((s) => s.career)
  const buyPlayer = useCareer((s) => s.buyPlayer)
  const sellPlayer = useCareer((s) => s.sellPlayer)
  const renewContract = useCareer((s) => s.renewContract)
  const closeWindow = useCareer((s) => s.closeWindow)
  const setToast = useApp((s) => s.setToast)

  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState<'all' | 'GK' | 'DEF' | 'MID' | 'FWD'>('all')
  const [negotiate, setNegotiate] = useState<MarketPlayer | null>(null)

  const c = career!
  const club = c.teams.find((t) => t.id === c.clubId)!
  const teamsById = useMemo(() => Object.fromEntries(c.teams.map((t) => [t.id, t])), [c.teams])

  // catálogo de todos os jogadores dos outros clubes
  const market = useMemo<MarketPlayer[]>(() => {
    const out: MarketPlayer[] = []
    for (const [clubId, roster] of Object.entries(c.rostersByClub)) {
      const starters = new Set([...roster].sort((a, b) => b.overall - a.overall).slice(0, 11).map((p) => p.id))
      const name = teamsById[clubId]?.name ?? clubId
      const sellerStrength = teamsById[clubId]?.strength ?? 60
      for (const p of roster) out.push({ ...p, clubId, clubName: name, sellerStrength, starter: starters.has(p.id) })
    }
    return out.sort((a, b) => b.overall - a.overall)
  }, [c.rostersByClub, teamsById])

  const filtered = market.filter((p) => {
    if (posFilter !== 'all' && p.position !== posFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.clubName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const bill = wageBill(c.players)

  const doBuy = (p: MarketPlayer, fee: number) => {
    const res = buyPlayer(p.id, fee)
    if (res.ok) {
      setToast(`${p.name} contratado por ${fee}M`)
      setNegotiate(null)
    } else {
      setToast(res.reason ?? 'Não rolou')
    }
  }

  const doSell = (p: CareerPlayer) => {
    const res = sellPlayer(p.id)
    setToast(res.ok ? `${p.name} vendido por ${p.value}M` : res.reason ?? 'Não rolou')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200">
          <ArrowLeft size={16} /> Voltar ao clube
        </button>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker mb-1">
              <span className="h-1.5 w-1.5 bg-blood-600" />
              Mercado · janela {c.window === 'pre-season' ? 'de pré-temporada' : 'intermediária'}
            </p>
            <h1 className="display text-3xl text-zinc-100 md:text-4xl">Transferências</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <Coins size={15} className="text-gold-400" />
              <span className="tnum font-bold text-zinc-100">{c.budget}M</span>
              <span className="text-zinc-600">caixa</span>
            </span>
            <span className="tnum text-zinc-500">
              folha <span className="font-bold text-zinc-300">{bill}</span>/{c.wageBudget}M
            </span>
          </div>
        </div>

        <div className="mb-4 inline-flex rounded-xl border border-white/5 bg-ink-900 p-1">
          {(['buy', 'sell'] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={cx(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                tab === tb ? 'bg-blood-grad text-white shadow-glow-sm' : 'text-zinc-400 hover:text-zinc-100'
              )}
            >
              {tb === 'buy' ? 'Contratar' : `Vender (${c.players.length})`}
            </button>
          ))}
        </div>

        {tab === 'buy' ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  className="input py-1.5 pl-8 text-xs"
                  placeholder="Buscar jogador ou clube…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {(['all', 'GK', 'DEF', 'MID', 'FWD'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPosFilter(p)}
                  className={cx(
                    'rounded-lg px-2.5 py-1.5 text-xs font-bold transition',
                    posFilter === p ? 'bg-blood-grad text-white' : 'bg-ink-800 text-zinc-400 hover:text-zinc-100'
                  )}
                >
                  {p === 'all' ? 'Todos' : POS_LABEL[p]}
                </button>
              ))}
            </div>
            <div className="card divide-y divide-white/5 p-0">
              {filtered.slice(0, 60).map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-zinc-600">{POS_LABEL[p.position]}</span>
                  <TeamBadge team={teamsById[p.clubId]} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-100">{p.name}</p>
                    <p className="truncate text-[10px] text-zinc-600">{p.clubName} · {p.age} anos · contrato {p.contractYears}a</p>
                  </div>
                  <span className="tnum w-7 shrink-0 text-right text-sm font-bold text-zinc-100">{p.overall}</span>
                  <span className="tnum w-14 shrink-0 text-right text-xs text-zinc-400">{p.value}M</span>
                  <Button className="shrink-0 px-2.5 py-1 text-xs" onClick={() => setNegotiate(p)}>
                    Negociar
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && <p className="px-4 py-6 text-sm text-zinc-600">Nenhum jogador encontrado.</p>}
            </div>
          </>
        ) : (
          <div className="card divide-y divide-white/5 p-0">
            {[...c.players]
              .sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-zinc-600">{POS_LABEL[p.position]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm text-zinc-100">
                      {p.name}
                      <MoraleDot morale={p.morale} />
                    </p>
                    <p className="truncate text-[10px] text-zinc-600">
                      {p.age} anos · {p.salary}M/ano ·{' '}
                      <span className={p.contractYears <= 1 ? 'font-bold text-blood-300' : ''}>
                        contrato {p.contractYears}a
                      </span>
                    </p>
                  </div>
                  <span className="tnum w-7 shrink-0 text-right text-sm font-bold text-zinc-100">{p.overall}</span>
                  {p.contractYears <= 2 && (
                    <Button
                      className="shrink-0 px-2.5 py-1 text-xs"
                      onClick={() => {
                        const res = renewContract(p.id)
                        setToast(res.ok ? `${p.name} renovou por 3 anos` : res.reason ?? 'Não rolou')
                      }}
                    >
                      Renovar {renewalCost(p)}M
                    </Button>
                  )}
                  <Button className="shrink-0 px-2.5 py-1 text-xs" onClick={() => doSell(p)}>
                    Vender {p.value}M
                  </Button>
                </div>
              ))}
          </div>
        )}

        {c.marketLog.length > 0 && (
          <div className="panel mt-5 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <ArrowRightLeft size={13} className="text-blood-400" /> Negócios recentes
            </p>
            {c.marketLog.slice(0, 8).map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-1 text-xs">
                <span className="tnum w-10 shrink-0 text-zinc-600">Ano {m.year}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-300">{m.playerName}</span>
                <span className="truncate text-[10px] text-zinc-600">{m.fromClubName} → {m.toClubName}</span>
                <span className="tnum shrink-0 font-bold text-gold-400">{m.fee}M</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="primary" icon={<Check size={14} />} onClick={() => { closeWindow(); onBack() }}>
            {c.window === 'pre-season' ? 'Fechar janela e começar' : 'Fechar janela e retomar'}
          </Button>
        </div>
      </div>

      <Modal open={!!negotiate} onClose={() => setNegotiate(null)} maxWidth="max-w-md">
        {negotiate && (
          <NegotiateModal
            player={negotiate}
            club={club}
            budget={c.budget}
            wageBill={bill}
            wageBudget={c.wageBudget}
            onSubmit={(fee) => doBuy(negotiate, fee)}
          />
        )}
      </Modal>
    </div>
  )
}

function NegotiateModal({
  player,
  club,
  budget,
  wageBill: bill,
  wageBudget,
  onSubmit
}: {
  player: MarketPlayer
  club: Team
  budget: number
  wageBill: number
  wageBudget: number
  onSubmit: (fee: number) => void
}) {
  const ask = askingPrice(player.value, player.starter, player.contractYears)
  const [fee, setFee] = useState(ask)
  const wageAfter = Math.round((bill + player.salary) * 10) / 10
  const overCap = wageAfter > wageBudget
  const overBudget = fee > budget
  const TIER_RANK: Record<string, number> = { pequeno: 0, medio: 1, grande: 2, gigante: 3 }
  const willRefuse = player.starter && TIER_RANK[clubTier(club.strength)] < TIER_RANK[clubTier(player.sellerStrength)]

  return (
    <div>
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="heading text-lg text-white">{player.name}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {POS_LABEL[player.position]} · {player.age} anos · OVR {player.overall} · {player.clubName}
        </p>
      </div>
      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-ink-800/70 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Valor de mercado</p>
            <p className="tnum text-base font-bold text-zinc-100">{player.value}M</p>
          </div>
          <div className="rounded-lg bg-ink-800/70 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Pedido do clube</p>
            <p className="tnum text-base font-bold text-zinc-100">{ask}M</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-zinc-500">Sua proposta</span>
            <span className={cx('tnum font-bold', overBudget ? 'text-blood-400' : 'text-zinc-100')}>{fee}M</span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(ask * 2, budget)}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-blood-500"
          />
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Caixa após a compra</span>
            <span className={cx('tnum', overBudget ? 'text-blood-400' : 'text-zinc-300')}>{Math.round((budget - fee) * 10) / 10}M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Folha após o salário (+{player.salary}M)</span>
            <span className={cx('tnum', overCap ? 'text-blood-400' : 'text-zinc-300')}>{wageAfter}/{wageBudget}M</span>
          </div>
        </div>

        {overBudget && <p className="text-[11px] text-blood-400">Proposta acima do seu caixa.</p>}
        {overCap && <p className="text-[11px] text-blood-400">Salário estoura o teto da folha.</p>}
        {willRefuse && (
          <p className="text-[11px] text-amber-400">
            Titular do {player.clubName} (clube maior) — ele não quer descer de nível, nem por dinheiro (por ora). A proposta será recusada.
          </p>
        )}

        <Button
          variant="primary"
          className="w-full justify-center"
          disabled={overBudget || overCap || willRefuse}
          onClick={() => onSubmit(fee)}
        >
          Fazer proposta
        </Button>
      </div>
    </div>
  )
}
