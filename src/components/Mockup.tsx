/* Mockup do produto com a logo sobreposta.
   - <Mockup> é só visualização (ou mostra a prévia gerada por IA, que já traz a logo aplicada).
   - <LogoPlacer> permite arrastar (mover), redimensionar pelo canto e girar pela alça superior.
   Coordenadas sempre relativas à imagem (0–1), então funcionam em qualquer tamanho de tela
   e são reaproveitadas no PDF de produção e na geração por IA. */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { LogoPlacement } from '../types'

const MIN_W = 0.06
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
/** Normaliza o ângulo para -180…180. */
export const normAngle = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180

const logoStyle = (p: LogoPlacement) => ({
  left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.w * 100}%`,
  transform: p.r ? `rotate(${p.r}deg)` : undefined,
})

export function Mockup({ image, logo, placement, alt, className = '', ai }: { image: string; logo?: string; placement?: LogoPlacement; alt: string; className?: string; ai?: string }) {
  if (ai) {
    return (
      <div className={`mockup ${className}`}>
        <img className="mockup-img" src={ai} alt={alt} draggable={false} />
        <span className="mockup-ai" title="Prévia gerada por IA">✨ IA</span>
      </div>
    )
  }
  return (
    <div className={`mockup ${className}`}>
      <img className="mockup-img" src={image} alt={alt} draggable={false} />
      {logo && placement && <img className="mockup-logo" src={logo} alt="" draggable={false} style={logoStyle(placement)} />}
    </div>
  )
}

interface PlacerProps {
  image: string
  logo: string
  logoAspect: number
  value: LogoPlacement
  onChange: (p: LogoPlacement) => void
  alt: string
}

type Drag =
  | { mode: 'move' | 'resize'; sx: number; sy: number; start: LogoPlacement }
  | { mode: 'rotate'; cx: number; cy: number; a0: number; start: LogoPlacement }

export function LogoPlacer({ image, logo, logoAspect, value, onChange, alt }: PlacerProps) {
  const box = useRef<HTMLDivElement>(null)
  const logoEl = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [imgAspect, setImgAspect] = useState(1) // largura / altura da foto
  const [active, setActive] = useState(false)
  const rot = value.r ?? 0

  // altura da logo como fração da altura da imagem
  const hFrac = (w: number) => (w * imgAspect) / logoAspect

  const fit = (p: LogoPlacement): LogoPlacement => {
    const maxW = Math.min(1, logoAspect / imgAspect) // não ultrapassa altura
    const w = clamp(p.w, MIN_W, maxW)
    return { w, x: clamp(p.x, 0, 1 - w), y: clamp(p.y, 0, 1 - hFrac(w)), r: p.r ? normAngle(Math.round(p.r)) : 0 }
  }

  const begin = (mode: 'move' | 'resize' | 'rotate') => (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (mode === 'rotate') {
      const r = logoEl.current!.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      drag.current = { mode, cx, cy, a0: Math.atan2(e.clientY - cy, e.clientX - cx), start: value }
    } else {
      drag.current = { mode, sx: e.clientX, sy: e.clientY, start: value }
    }
    setActive(true)
  }

  const move = (e: PointerEvent) => {
    const d = drag.current
    const rect = box.current?.getBoundingClientRect()
    if (!d || !rect) return
    if (d.mode === 'rotate') {
      const a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx)
      let r = (d.start.r ?? 0) + ((a - d.a0) * 180) / Math.PI
      if (e.shiftKey) r = Math.round(r / 15) * 15 // Shift: passos de 15°
      onChange(fit({ ...d.start, r }))
      return
    }
    const dx = (e.clientX - d.sx) / rect.width
    const dy = (e.clientY - d.sy) / rect.height
    if (d.mode === 'move') onChange(fit({ ...d.start, x: d.start.x + dx, y: d.start.y + dy }))
    else onChange(fit({ ...d.start, w: d.start.w + dx }))
  }

  const end = () => {
    drag.current = null
    setActive(false)
  }

  // Acessibilidade: setas movem, +/− redimensionam, [ ] giram (Shift = passo maior)
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.05 : 0.01
    const ang = e.shiftKey ? 15 : 1
    const map: Record<string, Partial<LogoPlacement>> = {
      ArrowLeft: { x: value.x - step }, ArrowRight: { x: value.x + step },
      ArrowUp: { y: value.y - step }, ArrowDown: { y: value.y + step },
      '+': { w: value.w + step }, '=': { w: value.w + step }, '-': { w: value.w - step },
      '[': { r: rot - ang }, ']': { r: rot + ang }, '{': { r: rot - ang }, '}': { r: rot + ang },
    }
    if (map[e.key]) {
      e.preventDefault()
      onChange(fit({ ...value, ...map[e.key] }))
    }
  }

  const center = () => onChange(fit({ ...value, x: (1 - value.w) / 2, y: (1 - hFrac(value.w)) / 2 }))

  return (
    <div className="placer">
      <div ref={box} className={`mockup placer-box${active ? ' dragging' : ''}`} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <img className="mockup-img" src={image} alt={alt} draggable={false}
          onLoad={(e) => setImgAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 1)} />
        <div
          ref={logoEl}
          className="placer-logo"
          role="slider"
          tabIndex={0}
          aria-label="Logo: setas movem, + ou − redimensionam, [ ou ] giram"
          aria-valuetext={`x ${Math.round(value.x * 100)}%, y ${Math.round(value.y * 100)}%, largura ${Math.round(value.w * 100)}%, rotação ${rot}°`}
          style={logoStyle(value)}
          onPointerDown={begin('move')}
          onKeyDown={onKey}
        >
          <img src={logo} alt="" draggable={false} />
          <span className="placer-rotate" onPointerDown={begin('rotate')} aria-hidden title="Girar" />
          <span className="placer-handle" onPointerDown={begin('resize')} aria-hidden />
        </div>
      </div>
      <div className="placer-tools">
        <label className="placer-size">
          <span>Tamanho</span>
          <input type="range" min={MIN_W * 100} max={100} value={Math.round(value.w * 100)}
            onChange={(e) => {
              const w = Number(e.target.value) / 100
              const cx = value.x + value.w / 2
              const cy = value.y + hFrac(value.w) / 2
              onChange(fit({ ...value, w, x: cx - w / 2, y: cy - hFrac(w) / 2 }))
            }} />
          <span className="tnum">{Math.round(value.w * 100)}%</span>
        </label>
        <label className="placer-size">
          <span>Rotação</span>
          <input type="range" min={-180} max={180} value={rot} onChange={(e) => onChange(fit({ ...value, r: Number(e.target.value) }))} />
          <span className="tnum">{rot}°</span>
        </label>
        <div className="placer-btns">
          <button type="button" className="btn ghost sm" onClick={center}>Centralizar</button>
          {rot !== 0 && <button type="button" className="btn ghost sm" onClick={() => onChange(fit({ ...value, r: 0 }))}>Zerar rotação</button>}
        </div>
      </div>
      <p className="field-hint">Arraste a logo para mover, use o canto inferior direito para redimensionar e a bolinha de cima para girar (Shift = passos de 15°).</p>
    </div>
  )
}
