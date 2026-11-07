/* Composição produto + logo em canvas (respeita posição, tamanho e rotação). */
import type { LogoPlacement } from '../types'
import { loadImage } from './image'

/** Caixa da logo em pixels da imagem de destino. */
function logoBox(p: LogoPlacement, W: number, H: number, aspect: number) {
  const w = p.w * W
  const h = w / aspect
  return { w, h, cx: p.x * W + w / 2, cy: p.y * H + h / 2, rad: ((p.r ?? 0) * Math.PI) / 180 }
}

/** Foto do produto com a logo aplicada, como JPEG (entrada da IA). */
export async function composeMockup(productSrc: string, logoSrc: string, p: LogoPlacement, maxSide = 1024) {
  const [prod, logo] = await Promise.all([loadImage(productSrc), loadImage(logoSrc)])
  const s = Math.min(1, maxSide / Math.max(prod.naturalWidth, prod.naturalHeight))
  const W = Math.round(prod.naturalWidth * s)
  const H = Math.round(prod.naturalHeight * s)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(prod, 0, 0, W, H)
  const b = logoBox(p, W, H, logo.naturalWidth / logo.naturalHeight || 1)
  ctx.translate(b.cx, b.cy)
  ctx.rotate(b.rad)
  ctx.drawImage(logo, -b.w / 2, -b.h / 2, b.w, b.h)
  return c.toDataURL('image/jpeg', 0.9)
}

/**
 * Logo já girada, recortada na própria caixa envolvente (para o PDF: continua sendo
 * um objeto separado da foto). Retorna posição/tamanho em frações da imagem.
 */
export function rotatedLogo(logo: HTMLImageElement, p: LogoPlacement, imgAspect: number, maxSide = 1600) {
  const aspect = logo.naturalWidth / logo.naturalHeight || 1
  // trabalha numa imagem de referência 1000 × (1000 / imgAspect)
  const W = 1000
  const H = 1000 / imgAspect
  const b = logoBox(p, W, H, aspect)
  const cos = Math.abs(Math.cos(b.rad))
  const sin = Math.abs(Math.sin(b.rad))
  const bw = b.w * cos + b.h * sin
  const bh = b.w * sin + b.h * cos
  const scale = maxSide / Math.max(bw, bh)
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bw * scale))
  c.height = Math.max(1, Math.round(bh * scale))
  const ctx = c.getContext('2d')!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(b.rad)
  ctx.drawImage(logo, (-b.w / 2) * scale, (-b.h / 2) * scale, b.w * scale, b.h * scale)
  return { canvas: c, x: (b.cx - bw / 2) / W, y: (b.cy - bh / 2) / H, w: bw / W, h: bh / H }
}

/** Reduz uma imagem (data URL) para JPEG compacto — cabe no armazenamento local. */
export async function shrinkToJpeg(src: string, maxSide = 720, quality = 0.84) {
  const img = await loadImage(src)
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * s)
  c.height = Math.round(img.naturalHeight * s)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', quality)
}
