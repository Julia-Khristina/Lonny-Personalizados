/* Utilitários de imagem: leitura de arquivos, redução de tamanho e rasterização. */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = src
  })
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Reduz a imagem para caber no armazenamento local. PNG preserva transparência (logos). */
export async function fileToDataUrl(file: File, maxSide: number, type: 'image/png' | 'image/jpeg' = 'image/jpeg') {
  const src = await readFile(file)
  const img = await loadImage(src)
  const ratio = img.naturalWidth / img.naturalHeight
  const { canvas } = rasterize(img, maxSide)
  return { dataUrl: canvas.toDataURL(type, 0.86), aspect: ratio }
}

/** Desenha a imagem num canvas cujo maior lado é `maxSide` px. */
export function rasterize(img: HTMLImageElement, maxSide: number) {
  const nw = img.naturalWidth || 800
  const nh = img.naturalHeight || 800
  const scale = Math.min(1, maxSide / Math.max(nw, nh)) || 1
  // SVG sem tamanho intrínseco grande: permite ampliar até maxSide
  const s = img.src.startsWith('data:image/svg') ? maxSide / Math.max(nw, nh) : scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(nw * s)
  canvas.height = Math.round(nh * s)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { canvas, width: canvas.width, height: canvas.height }
}
