import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring
} from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import cursorArrow1 from '../assets/cursor/marble-arrow-1.png'
import cursorArrow2 from '../assets/cursor/marble-arrow-2.png'
import cursorHand from '../assets/cursor/marble-hand.png'

// Curva de easing "expo-out" — base de quase todas as transições
export const EASE = [0.22, 1, 0.36, 1] as const

// ------------------------------------------------------------------
//  Cursor customizado — textura de mármore preto (pack "Sweezy Cursors")
//  Seta com brilho pulsando entre 2 frames (recriando o .ani original);
//  troca pra mão apontando em cima de link/botão/[data-cursor="hover"].
//  Hotspot (ponta da seta / ponta do dedo) alinhado ao ponteiro real via
//  offset calculado a partir da posição do hotspot no arquivo de origem.
// ------------------------------------------------------------------

const ARROW_SIZE = 34
const HAND_SIZE = 38
// hotspot do pack original, em px de uma imagem-fonte de 128×128
const ARROW_HOTSPOT = { x: 2, y: 2 }
const HAND_HOTSPOT = { x: 30, y: 2 }
const arrowOffset = {
  x: (ARROW_HOTSPOT.x / 128) * ARROW_SIZE,
  y: (ARROW_HOTSPOT.y / 128) * ARROW_SIZE
}
const handOffset = {
  x: (HAND_HOTSPOT.x / 128) * HAND_SIZE,
  y: (HAND_HOTSPOT.y / 128) * HAND_SIZE
}

export function CustomCursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const cx_ = useSpring(x, { stiffness: 800, damping: 40, mass: 0.4 })
  const cy_ = useSpring(y, { stiffness: 800, damping: 40, mass: 0.4 })
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      setHover(!!t?.closest('a, button, [data-cursor="hover"], select, input'))
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
    }
  }, [x, y])

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[120] hidden md:block"
      style={{ x: cx_, y: cy_ }}
    >
      {/* Seta — brilho pulsando entre os 2 frames do .ani original */}
      <motion.div
        className="absolute"
        style={{ left: -arrowOffset.x, top: -arrowOffset.y, width: ARROW_SIZE, height: ARROW_SIZE }}
        animate={{ opacity: hover ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <img src={cursorArrow1} alt="" className="h-full w-full select-none" draggable={false} />
        <motion.img
          src={cursorArrow2}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, times: [0, 0.5, 1], repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      {/* Mão apontando — sobre link/botão/[data-cursor="hover"] */}
      <motion.div
        className="absolute"
        style={{ left: -handOffset.x, top: -handOffset.y, width: HAND_SIZE, height: HAND_SIZE }}
        animate={{ opacity: hover ? 1 : 0, scale: hover ? 1 : 0.85 }}
        transition={{ duration: 0.15 }}
      >
        <img src={cursorHand} alt="" className="h-full w-full select-none" draggable={false} />
      </motion.div>
    </motion.div>
  )
}

// ------------------------------------------------------------------
//  Elemento magnético (atraído pelo cursor)
// ------------------------------------------------------------------

export function Magnetic({
  children,
  strength = 0.35,
  className
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 250, damping: 18, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 250, damping: 18, mass: 0.4 })

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} onMouseMove={onMove} onMouseLeave={reset} className={className}>
      {children}
    </motion.div>
  )
}

// ------------------------------------------------------------------
//  Tipografia cinética — revela linha a linha (máscara)
// ------------------------------------------------------------------

export function RevealLines({
  lines,
  className,
  delay = 0,
  stagger = 0.1
}: {
  lines: ReactNode[]
  className?: string
  delay?: number
  stagger?: number
}) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className="block"
            initial={{ y: '115%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.95, ease: EASE, delay: delay + i * stagger }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

// ------------------------------------------------------------------
//  Reveal genérico ao entrar na viewport
// ------------------------------------------------------------------

export function Reveal({
  children,
  className,
  delay = 0,
  y = 26
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

// ------------------------------------------------------------------
//  Contador animado
// ------------------------------------------------------------------

export function Counter({
  to,
  duration = 1.8,
  suffix = '',
  className
}: {
  to: number
  duration?: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => setVal(Math.floor(v))
    })
    return () => controls.stop()
  }, [inView, to, duration])

  return (
    <span ref={ref} className={cx('tnum', className)}>
      {val}
      {suffix}
    </span>
  )
}

// ------------------------------------------------------------------
//  Marquee (faixa infinita)
// ------------------------------------------------------------------

export function Marquee({
  children,
  speed = 26,
  className
}: {
  children: ReactNode
  speed?: number
  className?: string
}) {
  return (
    <div className={cx('relative flex overflow-hidden', className)}>
      <motion.div
        className="flex shrink-0 items-center"
        animate={{ x: ['0%', '-100%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {children}
      </motion.div>
      <motion.div
        aria-hidden
        className="flex shrink-0 items-center"
        animate={{ x: ['0%', '-100%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// ------------------------------------------------------------------
//  Cabeçalho editorial de tela
// ------------------------------------------------------------------

export function ScreenHeader({
  kicker,
  title,
  accent,
  children
}: {
  kicker: string
  title: ReactNode
  accent?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <p className="kicker mb-3">
            <span className="h-1.5 w-1.5 bg-blood-600" />
            {kicker}
          </p>
          <h1 className="display text-5xl text-zinc-100 md:text-6xl">
            {title}
            {accent && <span className="italic text-blood-500"> {accent}</span>}
          </h1>
        </Reveal>
        {children && <Reveal delay={0.08}>{children}</Reveal>}
      </div>
      <Reveal delay={0.12}>
        <div className="rule mt-5" />
      </Reveal>
    </div>
  )
}

// ------------------------------------------------------------------
//  Grão de filme (textura sutil)
// ------------------------------------------------------------------

const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

export function Grain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[110] opacity-[0.035] mix-blend-overlay"
      style={{ backgroundImage: `url("${NOISE}")` }}
    />
  )
}
