import { ArrowRight, ArrowUpRight, CalendarDays, Download, Plus, Shuffle, Trophy } from 'lucide-react'
import { useApp } from '../store/app'
import { FORMATS, FORMAT_META } from '../lib/meta'
import { progress } from '../engine/selectors'
import { CHAMPIONSHIP_PRESETS } from '../data/championships'
import { championshipInput, randomInput } from '../lib/quickstart'
import { TeamBadge } from '../components/TeamBadge'
import BorderGlow from '../components/BorderGlow'
import Silk from '../components/Silk'
import { Magnetic, Reveal } from '../components/motionx'
import type { Format } from '../types'

// modelos em destaque para o início rápido (um clique → torneio pronto)
const QUICK_IDS = ['champions-liga', 'copa-mundo', 'brasileirao', 'premier-league', 'cs-major', 'vct-champions']
const QUICK_MODELS = QUICK_IDS.map((id) => CHAMPIONSHIP_PRESETS.find((c) => c.id === id)).filter(
  (c): c is (typeof CHAMPIONSHIP_PRESETS)[number] => !!c
)

export function HomeScreen() {
  const current = useApp((s) => s.current)
  const newTournament = useApp((s) => s.newTournament)
  const go = useApp((s) => s.go)
  const importFromFile = useApp((s) => s.importFromFile)
  const startTournament = useApp((s) => s.startTournament)
  const customTeams = useApp((s) => s.customTeams)
  const teamOverrides = useApp((s) => s.teamOverrides)

  const champTeam = current?.champion ? current.teams.find((t) => t.id === current.champion) : undefined
  const prog = current ? progress(current) : null
  const finished = current?.phase === 'finished'
  const pct = prog && prog.total ? Math.round((prog.played / prog.total) * 100) : 0

  return (
    <div className="relative isolate h-full bg-ink-950">
      {/* Fundo "Silk" (React Bits, WebGL) — parado atrás do conteúdo, que rola por cima */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <Silk color="#7f1414" speed={3.5} scale={1.15} noiseIntensity={1.3} rotation={0} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/45 via-ink-950/70 to-ink-950/90" />
      </div>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-5 py-10 md:px-10 md:py-14">
          {/* ---------------- Eyebrow ---------------- */}
          <Reveal>
            <div className="mb-8 flex items-center justify-between border-b border-paper/10 pb-4 text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-blood-600" />
                Simulador de Campeonatos
              </span>
              <span className="hidden sm:inline">Futebol &amp; E-sports</span>
            </div>
          </Reveal>

          {/* ---------------- Continuar de onde parou ---------------- */}
          {current && prog && (
            <Reveal>
              <button
                onClick={() => go('tournament')}
                data-cursor="hover"
                className="group mb-4 block w-full overflow-hidden rounded-2xl border border-paper/12 bg-ink-900/40 p-5 text-left transition-colors hover:border-blood-700/50 md:p-7"
              >
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="kicker">{finished ? 'Última partida' : 'Continuar'}</span>
                    <p className="display mt-2 truncate text-2xl text-zinc-100 transition-transform duration-300 group-hover:translate-x-1 md:text-4xl">
                      {current.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {FORMAT_META[current.format].label} ·{' '}
                      {finished ? 'Encerrado' : `${prog.played}/${prog.total} partidas`}
                    </p>
                    {!finished && (
                      <div className="mt-3 h-1 w-full max-w-sm overflow-hidden rounded-full bg-ink-800">
                        <div className="h-full rounded-full bg-blood-grad transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  {champTeam ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Trophy size={16} className="text-gold-400" />
                      <TeamBadge team={champTeam} size="sm" />
                      <span className="hidden text-sm font-semibold text-zinc-100 sm:block">{champTeam.name}</span>
                    </div>
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-paper/15 text-zinc-300 transition-all duration-300 group-hover:border-blood-600 group-hover:bg-blood-600 group-hover:text-white">
                      <ArrowRight size={18} />
                    </span>
                  )}
                </div>
              </button>
            </Reveal>
          )}

          {/* ---------------- Ações principais ---------------- */}
          <Reveal delay={0.05}>
            <div className="flex flex-wrap items-center gap-4">
              <BorderGlow
                backgroundColor="#16161a"
                glowColor="0 90 66"
                colors={['#ff6464', '#f83a3a', '#9b1212']}
                borderRadius={10}
                glowRadius={26}
                glowIntensity={1.1}
                edgeSensitivity={26}
                coneSpread={25}
              >
                <button
                  onClick={() => newTournament()}
                  data-cursor="hover"
                  className="group inline-flex items-center gap-3 px-6 py-3.5"
                >
                  <Plus size={16} className="text-white" />
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white">Criar campeonato</span>
                  <ArrowRight size={16} className="text-white transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </BorderGlow>
              <button
                onClick={() => importFromFile()}
                data-cursor="hover"
                className="group flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-100"
              >
                <Download size={16} />
                <span className="relative">
                  Importar
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-paper transition-transform duration-300 group-hover:origin-left group-hover:scale-x-100" />
                </span>
              </button>
            </div>
          </Reveal>

          {/* ---------------- Início rápido ---------------- */}
          <section className="mt-12 border-t border-paper/10 pt-8">
            <Reveal>
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="kicker">Início rápido</h2>
                <span className="text-xs text-zinc-600">Um clique e a bola rola</span>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="flex flex-wrap gap-2.5">
                {QUICK_MODELS.map((c) => (
                  <BorderGlow
                    key={c.id}
                    backgroundColor="#16161a"
                    glowColor="0 90 66"
                    colors={['#ff6464', '#f83a3a', '#9b1212']}
                    borderRadius={999}
                    glowRadius={16}
                    glowIntensity={1.1}
                    edgeSensitivity={26}
                    coneSpread={25}
                  >
                    <button
                      onClick={() => startTournament(championshipInput(c, customTeams, teamOverrides))}
                      data-cursor="hover"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:text-zinc-50"
                    >
                      <span>{c.emoji}</span>
                      {c.label}
                    </button>
                  </BorderGlow>
                ))}
                <BorderGlow
                  backgroundColor="#16161a"
                  glowColor="0 90 66"
                  colors={['#ff6464', '#f83a3a', '#9b1212']}
                  borderRadius={999}
                  glowRadius={16}
                  glowIntensity={1.1}
                  edgeSensitivity={26}
                  coneSpread={25}
                >
                  <button
                    onClick={() => startTournament(randomInput(customTeams, teamOverrides))}
                    data-cursor="hover"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white transition"
                  >
                    <Shuffle size={15} /> Surpreenda-me
                  </button>
                </BorderGlow>
              </div>
            </Reveal>
          </section>

          {/* ---------------- Formatos ---------------- */}
          <section className="mt-12 border-t border-paper/10 pt-8">
            <Reveal>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="kicker">Formatos</h2>
                <span className="text-xs text-zinc-600">Monte do seu jeito</span>
              </div>
            </Reveal>
            <div>
              {FORMATS.map((f, i) => (
                <FormatRow key={f} format={f} index={i} onClick={() => newTournament(f)} />
              ))}
            </div>
          </section>

          {/* ---------------- Modo Temporada ---------------- */}
          <section className="mt-12 border-t border-paper/10 pt-10">
            <Reveal>
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                  <h2 className="kicker mb-3">
                    <CalendarDays size={13} className="text-blood-500" /> Modo Temporada
                  </h2>
                  <p className="display text-2xl leading-[1.1] text-zinc-100 md:text-4xl">
                    Conduza um time por <span className="italic text-blood-500">anos</span>
                  </p>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                    Campeonatos que se repetem a cada temporada: artilheiros do ano, evolução de elenco,
                    recordes e um <span className="text-zinc-200">Hall da Fama</span> que cresce ano após ano.
                  </p>
                </div>
                <Magnetic strength={0.3}>
                  <button
                    onClick={() => go('season')}
                    data-cursor="hover"
                    className="group inline-flex items-center gap-3 border border-paper/15 px-6 py-3.5 transition-colors hover:border-blood-600 hover:bg-blood-600"
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-100">Iniciar temporada</span>
                    <ArrowRight
                      size={16}
                      className="text-zinc-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white"
                    />
                  </button>
                </Magnetic>
              </div>
            </Reveal>
          </section>
        </div>
      </div>
    </div>
  )
}

function FormatRow({ format, index, onClick }: { format: Format; index: number; onClick: () => void }) {
  const meta = FORMAT_META[format]
  return (
    <Reveal delay={index * 0.05}>
      <button
        onClick={onClick}
        data-cursor="hover"
        className="group relative flex w-full items-center gap-4 overflow-hidden border-t border-paper/10 py-5 text-left last:border-b md:gap-5 md:py-6"
      >
        <span className="absolute inset-0 origin-bottom scale-y-0 bg-paper/[0.04] transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100" />
        <span className="display relative z-10 w-8 text-xl tabular-nums text-zinc-600 md:w-10 md:text-2xl">0{index + 1}</span>
        <span className="display relative z-10 flex-1 text-2xl text-zinc-300 transition-all duration-300 group-hover:translate-x-2 group-hover:text-zinc-50 md:text-4xl">
          {meta.label}
        </span>
        <span className="relative z-10 hidden max-w-[15rem] text-sm leading-snug text-zinc-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block">
          {meta.desc}
        </span>
        <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-paper/15 text-zinc-400 transition-all duration-300 group-hover:border-blood-600 group-hover:bg-blood-600 group-hover:text-white md:h-12 md:w-12">
          <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </button>
    </Reveal>
  )
}
