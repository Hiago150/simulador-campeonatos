import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useApp } from '../store/app'

export function Toast() {
  const toast = useApp((s) => s.toast)
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 shadow-card">
            <CheckCircle2 size={16} className="text-blood-400" />
            {toast}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
