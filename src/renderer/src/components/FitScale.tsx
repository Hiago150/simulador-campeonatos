import { Maximize2, Minus, Plus } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const MIN = 0.4
const MAX = 1.6
const STEP = 0.1

/**
 * Viewport com zoom ajustável para o chaveamento de mata-mata. Por padrão
 * ajusta o conteúdo à largura disponível (mantendo os cards legíveis) e
 * permite scroll quando maior que a área; o usuário pode aumentar/diminuir o
 * zoom (−/+) ou voltar ao ajuste automático.
 */
export function FitScale({ children, maxHeight = '72vh' }: { children: ReactNode; maxHeight?: string }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [nat, setNat] = useState({ w: 0, h: 0 })
  const userAdjusted = useRef(false)

  const clamp = (v: number): number => Math.max(MIN, Math.min(MAX, v))

  const fit = useCallback((): void => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner || !inner.scrollWidth) return
    userAdjusted.current = false
    setScale(clamp(Math.min(1, (outer.clientWidth - 6) / inner.scrollWidth)))
  }, [])

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    let raf = 0
    let lastW = -1
    let lastH = -1
    let lastAvail = -1

    const measure = (): void => {
      const w = inner.scrollWidth
      const h = inner.scrollHeight
      const avail = outer.clientWidth
      // só reage quando o tamanho NATURAL ou a largura disponível mudam de fato
      // (evita o loop de ResizeObserver causado pelo aparecimento da scrollbar)
      if (w === lastW && h === lastH && avail === lastAvail) return
      lastW = w
      lastH = h
      lastAvail = avail
      setNat((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
      if (!userAdjusted.current && w) {
        setScale(clamp(Math.min(1, (avail - 6) / w)))
      }
    }

    const schedule = (): void => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }

    measure()
    // observa só o conteúdo (largura/altura natural); a largura disponível vem
    // do window resize — não observamos o `outer` para não realimentar o loop
    const ro = new ResizeObserver(schedule)
    ro.observe(inner)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])

  const zoom = (delta: number): void => {
    userAdjusted.current = true
    setScale((s) => clamp(Number((s + delta).toFixed(2))))
  }

  const btn =
    'flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-ink-850 text-zinc-300 transition hover:border-blood-600/50 hover:text-white disabled:opacity-40'

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1">
        <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Zoom</span>
        <button onClick={() => zoom(-STEP)} disabled={scale <= MIN} className={btn} title="Diminuir">
          <Minus size={14} />
        </button>
        <span className="tnum w-11 text-center text-xs font-semibold text-zinc-300">{Math.round(scale * 100)}%</span>
        <button onClick={() => zoom(STEP)} disabled={scale >= MAX} className={btn} title="Aumentar">
          <Plus size={14} />
        </button>
        <button onClick={fit} className={btn} title="Ajustar à largura">
          <Maximize2 size={13} />
        </button>
      </div>
      <div ref={outerRef} className="overflow-auto" style={{ maxHeight }}>
        <div style={{ width: nat.w * scale || undefined, height: nat.h * scale || undefined, marginInline: 'auto' }}>
          <div
            ref={innerRef}
            style={{ width: 'max-content', transform: `scale(${scale})`, transformOrigin: '0 0' }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
