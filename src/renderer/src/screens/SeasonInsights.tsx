// Painéis de profundidade da Temporada (arcos do ano, prêmios, ídolos,
// confrontos da era, clubes + evolução) — consomem lib/season-insights e são
// plugados no Resumo do Ano, no detalhe do ano e nas abas do Hall da Fama.
import { useMemo, useState } from 'react'
import {
  ArrowDown,
  BookOpen,
  ChevronDown,
  Crosshair,
  Crown,
  Medal,
  ShieldCheck,
  Swords,
  TrendingDown,
  Trophy,
  Zap
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import type { Season, SeasonYearEntry, Team } from '../types'
import {
  clubProfile,
  eraHeadToHead,
  eraIdols,
  eraStrengthSeries,
  yearArcs,
  yearAwards,
  type IdolEntry,
  type YearArc
} from '../lib/season-insights'
import { TeamBadge } from '../components/TeamBadge'
import { cx } from '../lib/cx'

type PoolMap = Record<string, Team | undefined>

const ARC_META: Record<YearArc['kind'], { icon: typeof Crown; cls: string }> = {
  dynasty: { icon: Crown, cls: 'text-amber-400' },
  'upset-champion': { icon: Zap, cls: 'text-win-400' },
  invincible: { icon: ShieldCheck, cls: 'text-win-400' },
  'giant-fall': { icon: TrendingDown, cls: 'text-blood-400' },
  'dominant-scorer': { icon: Crosshair, cls: 'text-blood-400' },
  'relegation-drama': { icon: ArrowDown, cls: 'text-blood-400' }
}

// ─────────────────────────── Arcos do ano ───────────────────────────────────

export function YearArcsPanel({ season, entry }: { season: Season; entry: SeasonYearEntry }) {
  const arcs = useMemo(() => yearArcs(season, entry), [season, entry])
  if (arcs.length === 0) return null
  return (
    <div className="panel p-5">
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <BookOpen size={14} className="text-blood-400" /> Retrospecto do ano
      </p>
      <div className="space-y-3">
        {arcs.map((a, i) => {
          const Meta = ARC_META[a.kind]
          const Icon = Meta.icon
          return (
            <div key={i} className="flex items-start gap-3">
              <Icon size={17} className={cx('mt-0.5 shrink-0', Meta.cls)} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-100">{a.title}</p>
                <p className="text-xs leading-relaxed text-zinc-400">{a.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────── Prêmios do ano ─────────────────────────────────

export function YearAwardsPanel({
  season,
  entry,
  poolMap,
  compact,
  onClub
}: {
  season: Season
  entry: SeasonYearEntry
  poolMap: PoolMap
  /** versão enxuta pra galeria (sem zebra/jogo do ano) */
  compact?: boolean
  onClub?: (teamId: string) => void
}) {
  const aw = useMemo(() => yearAwards(season, entry), [season, entry])
  const isEsports = season.sport === 'esports'
  if (!aw.playerOfYear && !aw.teamOfYear && !aw.topScorer) return null

  const Card = ({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="rounded-xl border border-white/5 bg-ink-800/50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {icon} {label}
      </p>
      {children}
    </div>
  )

  return (
    <div className="panel p-5">
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <Medal size={14} className="text-amber-400" /> Prêmios do ano
      </p>
      <div className={cx('grid gap-2.5', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {aw.playerOfYear && (
          <Card label={isEsports ? 'Jogador do ano' : 'Craque do ano'} icon={<Crown size={11} className="text-amber-400" />}>
            <div className="flex items-center gap-2">
              <TeamBadge team={poolMap[aw.playerOfYear.teamId]} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-100">{aw.playerOfYear.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{aw.playerOfYear.line}</p>
              </div>
            </div>
          </Card>
        )}
        {aw.teamOfYear && (
          <Card label="Time do ano" icon={<Trophy size={11} className="text-amber-400" />}>
            <button
              className={cx('flex items-center gap-2 text-left', onClub && 'transition hover:opacity-80')}
              onClick={() => onClub?.(aw.teamOfYear!.teamId)}
              disabled={!onClub}
            >
              <TeamBadge team={poolMap[aw.teamOfYear.teamId]} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-100">{aw.teamOfYear.teamName}</p>
                <p className="truncate text-[11px] text-zinc-500">{aw.teamOfYear.line}</p>
              </div>
            </button>
          </Card>
        )}
        {aw.topScorer && (
          <Card label={isEsports ? 'Abatedor do ano' : 'Artilheiro do ano'} icon={<Crosshair size={11} className="text-blood-400" />}>
            <div className="flex items-center gap-2">
              <TeamBadge team={poolMap[aw.topScorer.teamId]} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-100">{aw.topScorer.name}</p>
                <p className="truncate text-[11px] text-zinc-500">
                  {aw.topScorer.value} {aw.topScorer.unit} · {aw.topScorer.teamName}
                </p>
              </div>
            </div>
          </Card>
        )}
        {!compact && aw.upsetOfYear && (
          <Card label="Zebra do ano" icon={<Zap size={11} className="text-win-400" />}>
            <p className="text-sm font-bold text-zinc-100">
              {aw.upsetOfYear.winner} {aw.upsetOfYear.score} {aw.upsetOfYear.loser}
            </p>
            <p className="text-[11px] text-zinc-500">
              {aw.upsetOfYear.slotName} · diferença de força {aw.upsetOfYear.gap}
            </p>
          </Card>
        )}
        {!compact && aw.gameOfYear && (
          <Card label="Jogo do ano" icon={<Swords size={11} className="text-blood-400" />}>
            <p className="text-sm font-bold text-zinc-100">{aw.gameOfYear.label}</p>
            <p className="text-[11px] text-zinc-500">
              {aw.gameOfYear.slotName} · {aw.gameOfYear.reason}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─────────────────── Aba: galeria de prêmios (ano a ano) ────────────────────

export function AwardsGalleryTab({
  season,
  poolMap,
  onClub
}: {
  season: Season
  poolMap: PoolMap
  onClub?: (teamId: string) => void
}) {
  const years = [...season.years].filter((y) => y.champions.length > 0).sort((a, b) => b.year - a.year)
  if (years.length === 0) return <Empty text="Nenhum ano com prêmios ainda." />
  return (
    <div className="space-y-5">
      {years.map((y) => (
        <div key={y.year}>
          <p className="display mb-2 text-lg text-zinc-200">Ano {y.year}</p>
          <YearAwardsPanel season={season} entry={y} poolMap={poolMap} onClub={onClub} />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────── Aba: ídolos da era ─────────────────────────────

export function IdolsTab({ season, poolMap }: { season: Season; poolMap: PoolMap }) {
  const idols = useMemo(() => eraIdols(season), [season])
  const [open, setOpen] = useState<string | null>(null)
  const isEsports = season.sport === 'esports'
  if (idols.length === 0) return <Empty text="Nenhum jogador pontuou ainda." />

  return (
    <div className="panel divide-y divide-white/5 overflow-hidden">
      {idols.slice(0, 25).map((idol, i) => (
        <IdolRow
          key={idol.playerId}
          idol={idol}
          rank={i + 1}
          team={poolMap[idol.teamId]}
          isEsports={isEsports}
          open={open === idol.playerId}
          onToggle={() => setOpen((cur) => (cur === idol.playerId ? null : idol.playerId))}
        />
      ))}
    </div>
  )
}

function IdolRow({
  idol,
  rank,
  team,
  isEsports,
  open,
  onToggle
}: {
  idol: IdolEntry
  rank: number
  team?: Team
  isEsports: boolean
  open: boolean
  onToggle: () => void
}) {
  const value = isEsports ? idol.kills : idol.goals
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-white/[0.02]">
        <span className="tnum w-5 shrink-0 text-right text-[11px] font-bold text-zinc-600">{rank}</span>
        <TeamBadge team={team} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-200">{idol.name}</span>
        <span className="hidden truncate text-[11px] text-zinc-500 sm:inline">{idol.teamName}</span>
        {isEsports && idol.mvps > 0 && (
          <span className="tag shrink-0 border-amber-700/40 text-[10px] text-amber-300">{idol.mvps} MVP</span>
        )}
        {idol.titles > 0 && (
          <span className="tag shrink-0 text-[10px]">
            <Trophy size={9} className="mr-0.5 inline text-amber-400" />
            {idol.titles}
          </span>
        )}
        <span className="tnum w-10 shrink-0 text-right text-sm font-bold text-blood-300">{value}</span>
        <ChevronDown size={14} className={cx('shrink-0 text-zinc-600 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-white/5 bg-ink-900/40 px-4 py-3 pl-12">
          {idol.bestYear && (
            <p className="mb-2 text-xs text-zinc-400">
              Melhor temporada: <span className="font-bold text-zinc-200">Ano {idol.bestYear.year}</span> —{' '}
              {idol.bestYear.value} {isEsports ? 'abates' : 'gols'}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {idol.perYear.map((y) => (
              <span key={y.year} className="tnum rounded-lg bg-ink-800/70 px-2 py-1 text-[11px] text-zinc-400">
                Ano {y.year}: <span className="font-bold text-zinc-200">{y.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────── Aba: confrontos da era ────────────────────────────

export function H2HTab({ season, poolMap }: { season: Season; poolMap: PoolMap }) {
  const list = useMemo(() => eraHeadToHead(season), [season])
  const isEsports = season.sport === 'esports'
  if (list.length === 0) return <Empty text="Ainda não há confrontos repetidos na era." />
  return (
    <div className="panel divide-y divide-white/5 overflow-hidden">
      {list.slice(0, 20).map((h) => {
        const aLeads = h.aWins > h.bWins
        const bLeads = h.bWins > h.aWins
        return (
          <div key={`${h.aId}|${h.bId}`} className="flex items-center gap-2.5 px-4 py-2.5">
            <TeamBadge team={poolMap[h.aId]} size="sm" />
            <span className={cx('min-w-0 flex-1 truncate text-sm', aLeads ? 'font-bold text-zinc-100' : 'text-zinc-400')}>
              {h.aName}
            </span>
            <div className="shrink-0 text-center">
              <p className="tnum text-sm font-bold text-zinc-100">
                {h.aWins} <span className="text-zinc-600">×</span> {h.bWins}
              </p>
              <p className="tnum text-[10px] text-zinc-600">
                {h.games} jogos{h.draws > 0 ? ` · ${h.draws} empates` : ''} · {h.aScore}–{h.bScore}{' '}
                {isEsports ? 'mapas' : 'gols'}
              </p>
            </div>
            <span className={cx('min-w-0 flex-1 truncate text-right text-sm', bLeads ? 'font-bold text-zinc-100' : 'text-zinc-400')}>
              {h.bName}
            </span>
            <TeamBadge team={poolMap[h.bId]} size="sm" />
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────── Aba: clubes (evolução + perfil) ───────────────────────

export function ClubsTab({
  season,
  poolMap,
  focusTeamId,
  onFocus
}: {
  season: Season
  poolMap: PoolMap
  focusTeamId: string | null
  onFocus: (teamId: string | null) => void
}) {
  const chart = useMemo(() => eraStrengthSeries(season), [season])
  const clubs = useMemo(() => {
    const withTitles = Object.entries(season.allTimeWins).sort(([, a], [, b]) => b - a)
    return withTitles.map(([id, wins]) => ({ id, wins, team: poolMap[id] }))
  }, [season, poolMap])

  if (focusTeamId) {
    return <ClubProfileView season={season} teamId={focusTeamId} poolMap={poolMap} onBack={() => onFocus(null)} />
  }

  return (
    <div className="space-y-5">
      {chart.years.length >= 2 ? (
        <div className="panel p-5">
          <p className="mb-1 text-sm font-bold text-white">Evolução da era</p>
          <p className="mb-4 text-xs text-zinc-500">
            Força ao fim de cada ano — dá pra ver a ascensão e queda das dinastias.
          </p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chart.years.map((yr, i) => {
                  const row: Record<string, number | null> = { year: yr }
                  for (const s of chart.series) row[s.teamId] = s.values[i]
                  return row
                })}
                margin={{ top: 8, right: 16, bottom: 8, left: -24 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="year" stroke="#52525e" fontSize={11} tickFormatter={(v) => `Ano ${v}`} />
                <YAxis domain={[35, 99]} stroke="#52525e" fontSize={11} />
                <RTooltip
                  contentStyle={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(v) => `Ano ${v}`}
                  formatter={(value: number, key: string) => [value, poolMap[key]?.name ?? key]}
                />
                {chart.series.map((s) => (
                  <Line
                    key={s.teamId}
                    dataKey={s.teamId}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {chart.series.map((s) => (
              <span key={s.teamId} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel p-5 text-center text-xs text-zinc-600">
          O gráfico de evolução aparece quando a temporada tiver 2+ anos fechados (a foto da força começa a ser
          tirada daqui em diante).
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Clubes com título — clique pra abrir o perfil
        </p>
        {clubs.length === 0 ? (
          <Empty text="Nenhum título ainda." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {clubs.map((c) => (
              <button
                key={c.id}
                onClick={() => onFocus(c.id)}
                className="panel flex items-center gap-2.5 p-3 text-left transition hover:border-blood-600/40"
              >
                <TeamBadge team={c.team} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-200">
                  {c.team?.name ?? c.id}
                </span>
                <span className="tnum shrink-0 text-sm font-bold text-amber-400">{c.wins}×</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClubProfileView({
  season,
  teamId,
  poolMap,
  onBack
}: {
  season: Season
  teamId: string
  poolMap: PoolMap
  onBack: () => void
}) {
  const p = useMemo(() => clubProfile(season, teamId), [season, teamId])
  const team = poolMap[teamId]
  const isEsports = season.sport === 'esports'

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs text-zinc-500 underline transition hover:text-zinc-200">
        ← todos os clubes
      </button>

      <div className="panel flex items-center gap-4 p-5">
        <TeamBadge team={team} size="lg" />
        <div className="min-w-0">
          <p className="display text-2xl text-zinc-100">{team?.name ?? teamId}</p>
          <p className="text-xs text-zinc-500">
            {(season.allTimeWins[teamId] ?? 0)} título(s) na era · força atual {team?.strength ?? '—'}
          </p>
        </div>
      </div>

      {p.titles.length > 0 && (
        <div className="panel p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Trophy size={13} className="text-amber-400" /> Títulos
          </p>
          <div className="space-y-2">
            {p.titles.map((t) => (
              <div key={t.slotName} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-zinc-200">{t.slotName}</span>
                <span className="truncate text-[11px] text-zinc-500">
                  {t.years.map((y) => `Ano ${y}`).join(', ')}
                </span>
                <span className="tnum shrink-0 font-bold text-amber-400">{t.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.strengthHistory.length >= 2 && (
        <div className="panel p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Força ao longo da era</p>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={p.strengthHistory.map((h) => ({ year: h.year, s: h.strength }))}
                margin={{ top: 8, right: 16, bottom: 8, left: -24 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="year" stroke="#52525e" fontSize={11} tickFormatter={(v) => `Ano ${v}`} />
                <YAxis domain={[35, 99]} stroke="#52525e" fontSize={11} />
                <RTooltip
                  contentStyle={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(v) => `Ano ${v}`}
                  formatter={(value: number) => [value, 'Força']}
                />
                <Line dataKey="s" stroke={team?.color ?? '#e01b1b'} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {p.idols.length > 0 && (
        <div className="panel p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Medal size={13} className="text-blood-400" /> Ídolos do clube
          </p>
          <div className="space-y-1.5">
            {p.idols.map((i) => (
              <div key={i.playerId} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-zinc-200">{i.name}</span>
                {isEsports && i.mvps > 0 && <span className="tag shrink-0 text-[10px] text-amber-300">{i.mvps} MVP</span>}
                <span className="tnum shrink-0 font-bold text-blood-300">{isEsports ? i.kills : i.goals}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.campaigns.length > 0 && (
        <div className="panel p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Campanha ano a ano</p>
          <div className="space-y-2.5">
            {p.campaigns.map((c) => (
              <div key={c.year} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="display w-14 shrink-0 text-sm text-zinc-300">Ano {c.year}</span>
                {c.entries.map((e) => (
                  <span key={e.slotName} className="text-[11px] text-zinc-500">
                    {e.slotName}:{' '}
                    <span className={cx('tnum font-bold', e.pos === 1 ? 'text-amber-400' : 'text-zinc-300')}>
                      {e.pos}º
                    </span>
                    <span className="text-zinc-700">/{e.of}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="panel p-8 text-center text-sm text-zinc-600">{text}</div>
}
