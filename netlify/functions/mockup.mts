/* Função Netlify: /api/mockup em produção.
   Configure GEMINI_API_KEY (e opcionalmente GEMINI_IMAGE_MODEL) em
   Site configuration → Environment variables. */
import { handleMockup } from '../../server/mockup.ts'

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  const out = await handleMockup(await req.text(), {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL,
    GEMINI_API_REVISION: process.env.GEMINI_API_REVISION,
  })
  return Response.json(out.json, { status: out.status })
}

export const config = { path: '/api/mockup' }
