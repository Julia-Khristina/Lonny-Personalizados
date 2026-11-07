import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { handleMockup, type MockupEnv } from './server/mockup.ts'

/** Rota /api/mockup (prévia com IA) no servidor local — a chave fica só no Node. */
function mockupApi(env: MockupEnv): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url !== '/api/mockup') return next()
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end()
    }
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const out = await handleMockup(Buffer.concat(chunks).toString('utf8'), env)
    res.statusCode = out.status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(out.json))
  }
  return {
    name: 'lonny-mockup-api',
    configureServer: (s) => { s.middlewares.use(handler) },
    configurePreviewServer: (s) => { s.middlewares.use(handler) },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // carrega .env / .env.local sem o prefixo VITE_ (variáveis privadas, não vão para o bundle)
  const env = loadEnv(mode, process.cwd(), '') as MockupEnv
  return {
    plugins: [react(), mockupApi(env)],
  }
})
