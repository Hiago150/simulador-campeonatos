import { ArrowRight, ArrowUpRight, Download, Trophy } from 'lucide-react'
import { useApp } from '../store/app'
import { useHistory } from '../store/history'
import { PRESET_TEAMS } from '../data/teams'
import { FORMATS, FORMAT_META } from '../lib/meta'
import { progress } from '../engine/selectors'
import { TeamBadge } from '../components/TeamBadge'
import { Counter, Magnetic, Marquee, Reveal, RevealLines } from '../components/motionx'
import type { Format } from '../types'

const MARQUEE_WORDS = [
  'Futebol',
  'E-sports',
  'Pontos Corridos',
  'Mata-mata',
  'Grupos',
  'Suíço',
  'Aleatorize',
  'Conquiste'
]

export function HomeScreen() {
  const current = useApp((s) => s.current)
  const newTournament = useApp((s) => s.newTournament)
  const go = useApp((s) => s.go)
  const importFromFile = useApp((s) => s.importFromFile)
  const titles = useHistory((s) => s.data.titles)

  const champTeam = current?.champion ? current.teams.find((t) => t.id === current.champion) : undefined
  const prog = current ? progress(current) : null
  const finished = current?.phase === 'finished'

  return (
    <div className="relative h-full overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-6xl px-8 py-14 md:px-12 md:py-20">
        {/* ---------------- HERO ---------------- */}
        <section className="border-b border-paper/10 pb-14">
          <Reveal>
            <div className="mb-12 flex items-center justify-between border-b border-paper/10 pb-4 text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-blood-600" />
                Simulador de Campeonatos
              </span>
              <span className="hidden sm:inline">Edição 2026 — Futebol &amp; E-sports</span>
            </div>
          </Reveal>

          <h1 className="display text-[clamp(2.8rem,9vw,8rem)] leading-[0.9] text-zinc-100">
            <RevealLines
              delay={0.12}
              lines={[
                <>Crie, simule e</>,
                <>
                  conquiste <span className="italic text-blood-500">campeonatos</span>
                </>
              ]}
            />
          </h1>

          <Reveal delay={0.5} className="mt-12 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-base leading-relaxed text-zinc-400">
              Quatro formatos, dois esportes, times reais ou criados por você. Sorteie resultados num
              clique e acompanhe tabelas, chaveamentos e estatísticas — tudo num só almanaque.
            </p>
            <div className="flex items-center gap-7">
              <Magnetic strength={0.4}>
                <button
                  onClick={() => newTournament()}
                  data-cursor="hover"
                  className="group inline-flex items-center gap-3 bg-blood-600 px-7 py-4 transition-colors hover:bg-blood-500"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white">Criar campeonato</span>
                  <ArrowRight size={16} className="text-white transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </Magnetic>
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
        </section>

        {/* ---------------- MARQUEE ---------------- */}
        <Marquee className="border-b border-paper/10 py-7" speed={34}>
          {MARQUEE_WORDS.map((w, i) => (
            <span key={i} className="flex items-center">
              <span className="display px-7 text-2xl italic text-zinc-600 md:text-3xl">{w}</span>
              <span className="h-1 w-1 bg-blood-700" />
            </span>
          ))}
        </Marquee>

        {/* ---------------- STATS ---------------- */}
        <section className="grid grid-cols-2 border-b border-paper/10 md:grid-cols-4">
          {[
            { to: FORMATS.length, label: 'Formatos' },
            { to: 2, label: 'Esportes' },
            { to: PRESET_TEAMS.length, suffix: '+', label: 'Times prontos' },
            { to: titles.length, label: 'Títulos disputados' }
          ].map((s, i) => (
            <Reveal
              key={i}
              delay={i * 0.08}
              className="border-paper/10 px-2 py-10 [&:not(:nth-child(2n))]:border-r md:border-r md:last:border-r-0"
            >
              <Counter to={s.to} suffix={s.suffix} className="display block text-5xl text-zinc-100 md:text-6xl" />
              <span className="mt-2 block text-[11px] uppercase tracking-[0.18em] text-zinc-500">{s.label}</span>
            </Reveal>
          ))}
        </section>

        {/* ---------------- CONTINUAR ---------------- */}
        {current && prog && (
          <Reveal className="border-b border-paper/10">
            <button
              onClick={() => go('tournament')}
              data-cursor="hover"
              className="group flex w-full items-center gap-5 py-8 text-left"
            >
              <span className="kicker hidden sm:inline-flex">Em andamento</span>
              <div className="flex-1">
                <p className="display text-3xl text-zinc-100 transition-transform duration-300 group-hover:translate-x-1.5">
                  {current.name}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {FORMAT_META[current.format].label} ·{' '}
                  {finished ? 'Encerrado' : `${prog.played}/${prog.total} partidas`}
                </p>
              </div>
              {champTeam ? (
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-blood-600" />
                  <TeamBadge team={champTeam} size="sm" />
                  <span className="hidden text-sm font-semibold text-zinc-100 sm:block">{champTeam.name}</span>
                </div>
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-paper/15 text-zinc-300 transition-all duration-300 group-hover:border-blood-600 group-hover:bg-blood-600 group-hover:text-white">
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </Reveal>
        )}

        {/* ---------------- FORMATOS ---------------- */}
        <section className="pt-16">
          <Reveal>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="kicker">Formatos</h2>
              <span className="text-xs text-zinc-600">Escolha e comece</span>
            </div>
          </Reveal>
          <div>
            {FORMATS.map((f, i) => (
              <FormatRow key={f} format={f} index={i} onClick={() => newTournament(f)} />
            ))}
          </div>
        </section>

        {/* ---------------- CAMPEÕES ---------------- */}
        {titles.length > 0 && (
          <section className="pt-16">
            <Reveal>
              <h2 className="kicker mb-4">Últimos campeões</h2>
            </Reveal>
            <Marquee speed={24} className="border-y border-paper/10 py-5">
              {titles.slice(0, 8).map((t, i) => (
                <span key={i} className="flex items-center gap-3 px-7">
                  <Trophy size={14} className="text-blood-600" />
                  <span className="display text-lg text-zinc-100">{t.championName}</span>
                  <span className="text-xs text-zinc-600">{t.tournamentName}</span>
                </span>
              ))}
            </Marquee>
          </section>
        )}
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
        className="group relative flex w-full items-center gap-5 overflow-hidden border-t border-paper/10 py-7 text-left last:border-b"
      >
        <span className="absolute inset-0 origin-bottom scale-y-0 bg-paper/[0.04] transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100" />
        <span className="display relative z-10 w-10 text-2xl tabular-nums text-zinc-600">0{index + 1}</span>
        <span className="display relative z-10 flex-1 text-3xl text-zinc-300 transition-all duration-300 group-hover:translate-x-2 group-hover:text-zinc-50 md:text-5xl">
          {meta.label}
        </span>
        <span className="relative z-10 hidden max-w-[15rem] text-sm leading-snug text-zinc-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block">
          {meta.desc}
        </span>
        <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-paper/15 text-zinc-400 transition-all duration-300 group-hover:border-blood-600 group-hover:bg-blood-600 group-hover:text-white">
          <ArrowUpRight size={20} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </button>
    </Reveal>
  )
}
