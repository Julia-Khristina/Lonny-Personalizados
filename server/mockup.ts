/* ─────────────────────────────────────────────
   Prévia realista com IA (Gemini — edição de imagem)
   Roda SÓ no servidor: a chave GEMINI_API_KEY nunca vai para o navegador.
   Usado por:
     - vite.config.ts  → rota /api/mockup no `npm run dev` / `npm run preview`
     - netlify/functions/mockup.mts → rota /api/mockup em produção
   Entrada: foto do produto já com a logo posicionada (composta no navegador),
   a logo original, a cor desejada e a técnica de personalização.
   ───────────────────────────────────────────── */

export interface MockupRequest {
  image: string // data URL da foto do produto com a logo na posição/rotação escolhidas
  logo: string // data URL da logo original (referência de fidelidade)
  produto: string
  categoria?: string
  cor: string // nome da cor em português
  tecnica?: { codigo: string; tipo: string } | null
}

export interface MockupEnv {
  GEMINI_API_KEY?: string
  GEMINI_IMAGE_MODEL?: string
  GEMINI_API_REVISION?: string
}

export const DEFAULT_MODEL = 'gemini-nano-banana-2.1'
const DEFAULT_REVISION = '2026-05-20'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'

/** Aparência de cada técnica (códigos da tabela de preços). */
const TEXTURAS: Record<string, string> = {
  SCR2: 'silk-screen printing: flat, opaque ink with a slightly raised matte finish and crisp edges, sitting on top of the surface',
  LSR1: 'laser engraving: the logo is etched INTO the material as a single tone (no ink colours), slightly recessed; on metal it reveals a lighter brushed/bright metal, on plastic or painted surfaces a lighter or darker engraved tone',
  LAS1: 'rotary laser engraving on a cylindrical surface: the logo is etched into the material as a single tone (no ink colours), wrapping naturally around the curvature',
  TXP1: 'textile screen printing: ink absorbed into the fabric, following the weave texture, folds and seams, matte finish',
  TRS1: 'heat transfer: a thin, slightly glossy vinyl/film layer bonded to the fabric, full colour, following folds',
  TRD1: 'digital transfer: vivid full-colour digital print on a thin glossy film, sharp details, following the surface',
}

const CORES_EN: Record<string, string> = {
  rosa: 'pink', vermelho: 'red', laranja: 'orange', amarelo: 'yellow', verde: 'green', 'verde-limão': 'lime green',
  azul: 'blue', 'azul-marinho': 'navy blue', 'azul-claro': 'light blue', 'azul-turquesa': 'turquoise', roxo: 'purple',
  preto: 'black', branco: 'white', cinza: 'grey', prata: 'silver', bege: 'beige', kraft: 'kraft brown',
  vinho: 'burgundy', transparente: 'transparent / clear',
}

export function buildPrompt(r: MockupRequest) {
  const corEn = CORES_EN[r.cor.trim().toLowerCase()] ?? r.cor
  const textura = (r.tecnica && TEXTURAS[r.tecnica.codigo]) || 'a realistic professional print that follows the surface of the object'
  return [
    `Photorealistic product mockup edit. The first image is a product photo ("${r.produto}"${r.categoria ? `, category: ${r.categoria}` : ''}) with a logo already placed on it.`,
    `1) Recolour the product itself to ${corEn} (colour name in Portuguese: "${r.cor}"). Keep its shape, materials, stitching, hardware and lighting; keep the plain white background.`,
    `2) Make the logo look physically applied with ${textura}. Respect the surface curvature, perspective, folds and lighting.`,
    '3) Keep the logo EXACTLY where it is: same position, size and rotation angle. Do not move, resize, mirror, crop or redraw it, and do not add any other text or logos.',
    'The second image is the original logo file, for shape and colour fidelity only.',
    'Return a single image with the same framing and aspect ratio as the first image.',
  ].join('\n')
}

const splitDataUrl = (d: string) => {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(d)
  if (!m) throw new MockupError(400, 'Imagem inválida (esperado data URL base64).')
  return { mime_type: m[1], data: m[2] }
}

export class MockupError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Procura a primeira imagem base64 na resposta (Interactions API ou formato generateContent). */
function findImage(node: unknown): { data: string; mime: string } | null {
  if (!node || typeof node !== 'object') return null
  const o = node as Record<string, unknown>
  const inline = (o.inlineData ?? o.inline_data) as Record<string, unknown> | undefined
  if (inline && typeof inline.data === 'string') return { data: inline.data, mime: String(inline.mimeType ?? inline.mime_type ?? 'image/png') }
  const mime = String(o.mime_type ?? o.mimeType ?? '')
  if (typeof o.data === 'string' && o.data.length > 200 && (o.type === 'image' || mime.startsWith('image/'))) {
    return { data: o.data, mime: mime || 'image/png' }
  }
  for (const v of Object.values(o)) {
    const found = Array.isArray(v) ? v.map(findImage).find(Boolean) : findImage(v)
    if (found) return found
  }
  return null
}

export async function generateMockup(r: MockupRequest, env: MockupEnv): Promise<{ image: string; model: string }> {
  if (!env.GEMINI_API_KEY) throw new MockupError(503, 'Prévia com IA indisponível: configure GEMINI_API_KEY no servidor.')
  if (!r?.image || !r?.logo || !r?.cor || !r?.produto) throw new MockupError(400, 'Dados incompletos para gerar a prévia.')
  const model = env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL
  const prod = splitDataUrl(r.image)
  const logo = splitDataUrl(r.logo)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
      'Api-Revision': env.GEMINI_API_REVISION || DEFAULT_REVISION,
    },
    body: JSON.stringify({
      model,
      input: [
        { type: 'text', text: buildPrompt(r) },
        { type: 'image', ...prod },
        { type: 'image', ...logo },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const text = await res.text()
  if (!res.ok) {
    let msg = text.slice(0, 300)
    try { msg = JSON.parse(text)?.error?.message ?? msg } catch { /* mantém texto */ }
    console.warn(`[mockup] Gemini ${res.status} (${model}): ${msg}`)
    if (res.status === 429 && /limit: 0\b/.test(msg)) {
      throw new MockupError(429, 'Prévia com IA indisponível: a chave do Gemini está no plano gratuito, que não inclui geração de imagens. Ative o faturamento no Google AI Studio.')
    }
    if (res.status === 429) throw new MockupError(429, 'Muitas prévias em pouco tempo. Aguarde um minuto e tente de novo.')
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new MockupError(502, `Prévia com IA indisponível: o Gemini recusou a chave ou o modelo (${res.status}).`)
    }
    throw new MockupError(502, `Gemini respondeu ${res.status}: ${msg}`)
  }
  const img = findImage(JSON.parse(text))
  if (!img) throw new MockupError(502, 'O Gemini não devolveu imagem. Tente gerar novamente.')
  return { image: `data:${img.mime};base64,${img.data}`, model }
}

/** Adaptador HTTP comum (Vite e Netlify). */
export async function handleMockup(body: string, env: MockupEnv): Promise<{ status: number; json: unknown }> {
  try {
    const out = await generateMockup(JSON.parse(body) as MockupRequest, env)
    return { status: 200, json: out }
  } catch (e) {
    if (e instanceof MockupError) return { status: e.status, json: { error: e.message } }
    if (e instanceof SyntaxError) return { status: 400, json: { error: 'Requisição inválida.' } }
    const aborted = e instanceof Error && e.name === 'TimeoutError'
    return { status: aborted ? 504 : 500, json: { error: aborted ? 'O Gemini demorou demais. Tente novamente.' : 'Falha ao gerar a prévia.' } }
  }
}
