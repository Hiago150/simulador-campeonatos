import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'

type Variant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
}

export function Button({ variant = 'ghost', icon, children, className, ...rest }: ButtonProps) {
  const cls = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-ghost'
  return (
    <button className={cx(cls, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export function IconButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        'no-drag inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="no-drag flex w-full items-center justify-between gap-4 text-left"
    >
      <span>
        {label && <span className="block text-sm font-semibold text-zinc-100">{label}</span>}
        {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      </span>
      <span
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-blood-grad shadow-glow-sm' : 'bg-ink-700'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="no-drag inline-flex rounded-[4px] border border-white/5 bg-ink-900 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-[3px] px-3.5 py-1.5 text-sm font-semibold transition',
            value === o.value
              ? 'bg-blood-grad text-white shadow-glow-sm'
              : 'text-zinc-400 hover:text-zinc-100'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="no-drag inline-flex items-center rounded-[4px] border border-white/10 bg-ink-900">
      <button
        className="flex h-10 w-10 items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
      >
        <Minus size={16} />
      </button>
      <span className="tnum w-12 text-center text-base font-bold text-zinc-100">{value}</span>
      <button
        className="flex h-10 w-10 items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 100
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="no-drag h-2 w-full cursor-pointer appearance-none rounded-full outline-none
        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-glow-sm
        [&::-webkit-slider-thumb]:transition"
      style={{
        background: `linear-gradient(90deg, #e01b1b ${pct}%, #26262d ${pct}%)`
      }}
    />
  )
}

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 'max-w-2xl'
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cx('panel relative z-10 w-full overflow-hidden shadow-card', maxWidth)}
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function StrengthBar({ value }: { value: number }) {
  const color = value >= 85 ? '#e01b1b' : value >= 70 ? '#f83a3a' : value >= 50 ? '#ff9d9d' : '#52525e'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="tnum w-7 text-right text-xs font-bold text-zinc-300">{value}</span>
    </div>
  )
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-zinc-700">{icon}</div>}
      <p className="heading text-lg text-zinc-300">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-600">{hint}</p>}
    </div>
  )
}
