/* ─────────────────────────────────────────────
   Servidor de produção (Render / Docker / qualquer Node ≥ 22.18)
   - entrega o app compilado (dist/) com fallback de SPA para index.html
   - atende POST /api/mockup (prévia com IA) — GEMINI_API_KEY só no servidor
   Uso:  npm run build && npm start      (porta: variável PORT, padrão 3000)
   ───────────────────────────────────────────── */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleMockup } from './mockup.ts'

const DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist')
const PORT = Number(process.env.PORT) || 3000
const MAX_BODY = 15 * 1024 * 1024 // foto composta + logo em base64

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
}

function sendFile(res: ServerResponse, file: string, cache: string) {
  res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': cache })
  createReadStream(file).pipe(res)
}

/** Caminho dentro de dist/ (bloqueia ../). */
function safePath(urlPath: string) {
  let p: string
  try { p = decodeURIComponent(urlPath) } catch { return null }
  const full = normalize(join(DIST, p))
  return full === DIST || full.startsWith(DIST + sep) ? full : null
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > MAX_BODY) throw new Error('payload')
    chunks.push(c as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function api(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') { res.writeHead(405).end(); return }
  let body: string
  try { body = await readBody(req) } catch {
    res.writeHead(413, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Imagem grande demais.' }))
    return
  }
  const out = await handleMockup(body, process.env)
  res.writeHead(out.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(out.json))
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname === '/api/mockup') return api(req, res)
  if (url.pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok'); return }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }

  const file = safePath(url.pathname)
  if (file && existsSync(file) && statSync(file).isFile()) {
    // arquivos com hash no nome (assets/) podem ficar em cache para sempre
    return sendFile(res, file, url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
  }
  // rotas do app (/experiencia, /admin/...) → index.html
  if (!extname(url.pathname)) return sendFile(res, join(DIST, 'index.html'), 'no-cache')
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado')
})

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html não encontrado — rode "npm run build" antes de "npm start".')
  process.exit(1)
}
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Lonny no ar em http://localhost:${PORT} · prévia com IA: ${process.env.GEMINI_API_KEY ? 'ativa' : 'sem GEMINI_API_KEY'}`)
})
