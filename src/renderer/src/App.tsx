import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from './store/app'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { CustomCursor, EASE, Grain } from './components/motionx'
import { HomeScreen } from './screens/Home'
import { SetupScreen } from './screens/Setup'
import { TournamentScreen } from './screens/Tournament'
import { HistoryScreen } from './screens/History'
import { TeamsScreen } from './screens/Teams'
import { StatsScreen } from './screens/Stats'
import { LibraryScreen } from './screens/Library'
import { SeasonScreen } from './screens/Season'

const SCREENS = {
  home: HomeScreen,
  setup: SetupScreen,
  tournament: TournamentScreen,
  history: HistoryScreen,
  teams: TeamsScreen,
  stats: StatsScreen,
  library: LibraryScreen,
  season: SeasonScreen
} as const

export default function App() {
  const screen = useApp((s) => s.screen)
  const Screen = SCREENS[screen]

  return (
    <div className="flex h-screen flex-col bg-ink-950 text-zinc-100 md:cursor-none">
      <Grain />
      <CustomCursor />
      <TopBar />
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className="h-full w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      <Toast />
    </div>
  )
}
