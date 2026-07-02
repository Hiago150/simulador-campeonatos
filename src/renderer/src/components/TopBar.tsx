import { BarChart3, CalendarDays, History, Home, Library, Users } from 'lucide-react'
import { useApp, type Screen } from '../store/app'
import { cx } from '../lib/cx'

const NAV: { screen: Screen; label: string; icon: typeof Home }[] = [
  { screen: 'home', label: 'Início', icon: Home },
  { screen: 'season', label: 'Temporada', icon: CalendarDays },
  { screen: 'library', label: 'Biblioteca', icon: Library },
  { screen: 'stats', label: 'Estatísticas', icon: BarChart3 },
  { screen: 'history', label: 'Histórico', icon: History },
  { screen: 'teams', label: 'Times', icon: Users }
]

export function TopBar() {
  const screen = useApp((s) => s.screen)
  const go = useApp((s) => s.go)

  return (
    <header className="drag-region flex h-10 shrink-0 items-center gap-2 overflow-hidden border-b border-paper/10 bg-ink-950/85 px-3 pr-3 backdrop-blur sm:gap-5 md:px-4 md:pr-[145px]">
      {/* Masthead */}
      <button onClick={() => go('home')} className="no-drag flex shrink-0 items-center gap-2.5 pl-1">
        <span className="h-3 w-3 shrink-0 bg-blood-600" />
        <span className="heading text-[13px] font-bold uppercase tracking-[0.22em] text-zinc-100">Simcamp</span>
        <span className="hidden text-[10px] uppercase tracking-[0.26em] text-zinc-600 lg:inline">— Almanaque</span>
      </button>

      <nav className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((n) => {
          const Icon = n.icon
          const active = screen === n.screen
          return (
            <button
              key={n.screen}
              onClick={() => go(n.screen)}
              title={n.label}
              className={cx(
                'no-drag flex shrink-0 items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-2.5',
                active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'
              )}
            >
              <span
                className={cx(
                  'h-1 w-1 shrink-0 transition-colors',
                  active ? 'bg-blood-600' : 'bg-transparent'
                )}
              />
              <Icon size={12} className="shrink-0" />
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          )
        })}
      </nav>
    </header>
  )
}
