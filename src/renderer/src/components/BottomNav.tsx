import { BarChart3, CalendarDays, History, Home, Library, Users } from 'lucide-react'
import { useApp, type Screen } from '../store/app'
import { cx } from '../lib/cx'

const NAV: { screen: Screen; label: string; icon: typeof Home }[] = [
  { screen: 'home', label: 'Início', icon: Home },
  { screen: 'season', label: 'Temporada', icon: CalendarDays },
  { screen: 'library', label: 'Biblioteca', icon: Library },
  { screen: 'stats', label: 'Stats', icon: BarChart3 },
  { screen: 'history', label: 'Histórico', icon: History },
  { screen: 'teams', label: 'Times', icon: Users }
]

/** Tab bar inferior — só no celular (< sm), onde o polegar alcança. */
export function BottomNav() {
  const screen = useApp((s) => s.screen)
  const go = useApp((s) => s.go)

  return (
    <nav className="flex shrink-0 border-t border-white/10 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      {NAV.map((n) => {
        const Icon = n.icon
        const active = screen === n.screen
        return (
          <button
            key={n.screen}
            onClick={() => go(n.screen)}
            className={cx(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
              active ? 'text-blood-400' : 'text-zinc-500'
            )}
          >
            <Icon size={19} strokeWidth={active ? 2.4 : 2} />
            <span className="truncate">{n.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
