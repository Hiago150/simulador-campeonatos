import { useMemo, useState } from 'react'
import { Crosshair, Goal, Medal, RotateCw, Trash2, Trophy } from 'lucide-react'
import type { Sport } from '../types'
import { useHistory } from '../store/history'
import { useApp } from '../store/app'
import { FORMAT_META, GAME_META, SPORT_META } from '../lib/meta'
import { Button, EmptyState, Segmented } from '../components/ui'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ScreenHeader } from '../components/motionx'
import { cx } from '../lib/cx'

export function HistoryScreen() {
  const data = useHistory((s) => s.data)
  const setups = useHistory((s) => s.setups)
  const resetHistory = useHistory((s) => s.reset)
  const setToast = useApp((s) => s.setToast)
  const repeatTournament = useApp((s) => s.repeatTournament)
  const [rankSport, setRankSport] = useState<Sport>('football')
  const [confirmClear, setConfirmClear] = useState(false)

  const teamRanking = useMemo(
    () =>
      Object.values(data.teamRecords)
        .filter((r) => (r.sport ?? 'football') === rankSport)
        .sort((a, b) => b.titles - a.titles || b.won - a.won || b.goalsFor - a.goalsFor)
        .slice(0, 20),
    [data, rankSport]
  )
  const topScorers = useMemo(
    () =>
      Object.values(data.scorers)
        .filter((s) => s.goals > 0)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 10),
    [data]
  )
  const topFraggers = useMemo(
    () =>
      Object.values(data.scorers)
        .filter((s) => s.kills > 0)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 10),
    [data]
  )

  const empty = data.titles.length === 0 && teamRanking.length === 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <ScreenHeader kicker="Todas as edições" title="Hall da" accent="fama">
          {!empty && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirmClear(true)}>
              Limpar histórico
            </Button>
          )}
        </ScreenHeader>

        <ConfirmDialog
          open={confirmClear}
          title="Limpar histórico?"
          message="Isso apaga toda a Galeria de campeões, o ranking de times, a artilharia e os confrontos. Esta ação não pode ser desfeita."
          confirmLabel="Limpar tudo"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            resetHistory()
            setConfirmClear(false)
            setToast('Histórico apagado')
          }}
        />

        {empty ? (
          <EmptyState
            icon={<Trophy size={48} />}
            title="Nenhum campeonato concluído ainda"
            hint="Finalize um campeonato para registrar títulos, confrontos e artilharia aqui."
          />
        ) : (
          <div className="space-y-6">
            {/* Hall of fame */}
            <div className="panel p-5">
              <p className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <Medal size={16} className="text-blood-400" /> Galeria de campeões
              </p>
              <div className="flex flex-wrap gap-2">
                {data.titles.map((title) => (
                  <div key={title.tournamentId} className="card flex items-center gap-3 px-4 py-2.5">
                    <Trophy size={16} className="text-blood-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{title.championName}</p>
                      <p className="text-[11px] text-zinc-500">
                        {SPORT_META[title.sport].emoji} {title.tournamentName} · {FORMAT_META[title.format].short}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repetir campeonato */}
            {setups.length > 0 && (
              <div className="panel p-5">
                <p className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
                  <RotateCw size={16} className="text-blood-400" /> Repetir campeonato
                </p>
                <p className="mb-4 text-xs text-zinc-500">
                  Recria um campeonato recente com os mesmos times e regras — gera uma nova edição, sem apagar a anterior.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {setups.map((s) => (
                    <div key={s.id} className="card flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-100">{s.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {SPORT_META[s.sport].emoji} {FORMAT_META[s.format].short}
                          {s.sport === 'esports' && s.config.game ? ` · ${GAME_META[s.config.game].short}` : ''}
                          {' · '}
                          {s.teams.length} times
                        </p>
                      </div>
                      <button
                        onClick={() => repeatTournament(s)}
                        title="Repetir este campeonato"
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-[4px] border border-blood-700/40 bg-blood-950/30 px-3 text-xs font-semibold text-blood-200 transition hover:bg-blood-900/40"
                      >
                        <RotateCw size={13} /> Repetir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              {/* Ranking de times */}
              <div className="panel p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">Ranking de times</p>
                  <Segmented
                    value={rankSport}
                    onChange={setRankSport}
                    options={[
                      { value: 'football', label: `${SPORT_META.football.emoji} Futebol` },
                      { value: 'esports', label: `${SPORT_META.esports.emoji} E-sports` }
                    ]}
                  />
                </div>
                {teamRanking.length === 0 && (
                  <p className="py-6 text-center text-sm text-zinc-600">
                    Nenhum campeonato de {SPORT_META[rankSport].label} concluído ainda.
                  </p>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                      <th className="py-2 text-left font-medium">Time</th>
                      <th className="tnum w-12 py-2 text-center font-medium">🏆</th>
                      <th className="tnum w-10 py-2 text-center font-medium">J</th>
                      <th className="tnum w-10 py-2 text-center font-medium">V</th>
                      <th className="tnum w-10 py-2 text-center font-medium">E</th>
                      <th className="tnum w-10 py-2 text-center font-medium">D</th>
                      <th className="tnum w-12 py-2 text-center font-medium">SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRanking.map((r) => (
                      <tr key={r.teamId} className="border-t border-white/[0.04]">
                        <td className="py-2 font-semibold text-zinc-100">{r.teamName}</td>
                        <td className="tnum py-2 text-center font-bold text-blood-300">{r.titles}</td>
                        <td className="tnum py-2 text-center text-zinc-400">{r.played}</td>
                        <td className="tnum py-2 text-center text-zinc-400">{r.won}</td>
                        <td className="tnum py-2 text-center text-zinc-400">{r.drawn}</td>
                        <td className="tnum py-2 text-center text-zinc-400">{r.lost}</td>
                        <td
                          className={cx(
                            'tnum py-2 text-center font-semibold',
                            r.goalsFor - r.goalsAgainst > 0 ? 'text-emerald-400/80' : 'text-zinc-500'
                          )}
                        >
                          {r.goalsFor - r.goalsAgainst > 0 ? '+' : ''}
                          {r.goalsFor - r.goalsAgainst}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Artilheiros / Fraggers */}
              <div className="space-y-6">
                {topScorers.length > 0 && (
                  <LeaderCard
                    title="Artilheiros (all-time)"
                    icon={<Goal size={15} className="text-blood-400" />}
                    rows={topScorers.map((s) => ({ name: s.name, team: s.teamName, value: s.goals }))}
                    unit="gols"
                  />
                )}
                {topFraggers.length > 0 && (
                  <LeaderCard
                    title="Abates (all-time)"
                    icon={<Crosshair size={15} className="text-blood-400" />}
                    rows={topFraggers.map((s) => ({ name: s.name, team: s.teamName, value: s.kills }))}
                    unit="kills"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderCard({
  title,
  icon,
  rows,
  unit
}: {
  title: string
  icon: React.ReactNode
  rows: { name: string; team: string; value: number }[]
  unit: string
}) {
  return (
    <div className="panel p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        {icon} {title}
      </p>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="tnum w-5 text-center text-xs font-bold text-zinc-600">{i + 1}</span>
            <div className="flex-1 truncate">
              <span className="text-sm font-semibold text-zinc-100">{r.name}</span>
              <span className="ml-2 text-xs text-zinc-600">{r.team}</span>
            </div>
            <span className="tnum text-sm font-bold text-white">{r.value}</span>
            <span className="text-xs text-zinc-600">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
