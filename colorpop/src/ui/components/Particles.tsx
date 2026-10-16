import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  shape: 'dot' | 'star' | 'rect' | 'ring'
  rot: number
  vr: number
  gravity: number
}

export interface ParticlesHandle {
  burst(x: number, y: number, colors: string[], count?: number, speed?: number): void
  ring(x: number, y: number, color: string, size?: number): void
  confetti(count?: number): void
  sparkle(x: number, y: number, count?: number): void
}

/** Lightweight canvas particle layer – one rAF loop that sleeps when idle. */
export const Particles = forwardRef<ParticlesHandle, { disabled?: boolean }>(function Particles({ disabled }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const parts = useRef<Particle[]>([])
  const raf = useRef(0)
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  useEffect(() => {
    const c = canvasRef.current!
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  const loop = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    const arr = parts.current
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i]
      p.life++
      if (p.life >= p.max) {
        arr.splice(i, 1)
        continue
      }
      p.vy += p.gravity
      p.vx *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      const t = p.life / p.max
      ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
      ctx.fillStyle = p.color
      ctx.strokeStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      const s = p.size * (p.shape === 'ring' ? 0.4 + t * 2.4 : 1 - t * 0.4)
      if (p.shape === 'dot') {
        ctx.beginPath()
        ctx.arc(0, 0, s, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.shape === 'rect') {
        ctx.fillRect(-s, -s * 0.5, s * 2, s)
      } else if (p.shape === 'ring') {
        ctx.lineWidth = Math.max(1, 6 * (1 - t))
        ctx.beginPath()
        ctx.arc(0, 0, s, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.beginPath()
        for (let k = 0; k < 8; k++) {
          const r = k % 2 === 0 ? s : s * 0.4
          const a = (k * Math.PI) / 4
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        }
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }
    ctx.globalAlpha = 1
    if (arr.length) raf.current = requestAnimationFrame(loop)
    else raf.current = 0
  }

  const kick = () => {
    if (!raf.current) raf.current = requestAnimationFrame(loop)
  }

  const add = (p: Omit<Particle, 'life' | 'rot' | 'vr'> & Partial<Pick<Particle, 'rot' | 'vr'>>) => {
    if (parts.current.length > 500) return
    parts.current.push({ life: 0, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, ...p })
  }

  useImperativeHandle(ref, () => ({
    burst(x, y, colors, count = 14, speed = 5) {
      if (disabledRef.current) return
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const v = speed * (0.4 + Math.random() * 0.8)
        add({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 2,
          max: 34 + Math.random() * 18,
          size: 3 + Math.random() * 4,
          color: colors[i % colors.length],
          shape: i % 3 === 0 ? 'star' : 'dot',
          gravity: 0.22,
        })
      }
      kick()
    },
    ring(x, y, color, size = 30) {
      if (disabledRef.current) return
      add({ x, y, vx: 0, vy: 0, max: 26, size, color, shape: 'ring', gravity: 0, vr: 0 })
      kick()
    },
    sparkle(x, y, count = 8) {
      if (disabledRef.current) return
      for (let i = 0; i < count; i++) {
        add({
          x: x + (Math.random() - 0.5) * 60,
          y: y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -1 - Math.random() * 1.8,
          max: 40 + Math.random() * 20,
          size: 3 + Math.random() * 3,
          color: ['#fff', '#FFE36B', '#9FFFD2'][i % 3],
          shape: 'star',
          gravity: -0.01,
        })
      }
      kick()
    },
    confetti(count = 120) {
      if (disabledRef.current) return
      const colors = ['#FF6B8B', '#FFC93D', '#2FCF8F', '#4FB3FF', '#9B7BFF', '#FF7A59']
      const w = window.innerWidth
      for (let i = 0; i < count; i++) {
        add({
          x: Math.random() * w,
          y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 3,
          vy: 2 + Math.random() * 3,
          max: 140 + Math.random() * 60,
          size: 4 + Math.random() * 4,
          color: colors[i % colors.length],
          shape: 'rect',
          gravity: 0.05,
          vr: (Math.random() - 0.5) * 0.4,
        })
      }
      kick()
    },
  }))

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-40 h-full w-full" aria-hidden />
})
