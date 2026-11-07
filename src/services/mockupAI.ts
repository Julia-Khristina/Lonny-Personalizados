/* Cliente da prévia com IA: compõe a foto com a logo no navegador e pede ao servidor
   (/api/mockup → Gemini) a versão na cor escolhida com a textura da técnica. */
import type { LogoPlacement, Personalization } from '../types'
import { composeMockup, shrinkToJpeg } from '../lib/compose'

export class MockupAIError extends Error {}

/** Identifica a configuração usada; se mudar, a prévia fica desatualizada. */
export function mockupKey(productId: string, cor: string, p: LogoPlacement, pzId: string | null, logo: string) {
  const r = (n: number) => Math.round(n * 1000)
  return [productId, cor, r(p.x), r(p.y), r(p.w), Math.round(p.r ?? 0), pzId ?? '-', logo.length, logo.slice(-24)].join('|')
}

export async function gerarPreviaIA(args: {
  image: string
  logo: string
  placement: LogoPlacement
  produto: string
  categoria: string
  cor: string
  pz: Personalization | undefined
}) {
  const composta = await composeMockup(args.image, args.logo, args.placement)
  let res: Response
  try {
    res = await fetch('/api/mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: composta,
        logo: args.logo,
        produto: args.produto,
        categoria: args.categoria,
        cor: args.cor,
        tecnica: args.pz ? { codigo: args.pz.codigo, tipo: args.pz.tipo } : null,
      }),
    })
  } catch {
    throw new MockupAIError('Sem conexão com o servidor da prévia. Verifique a internet e tente de novo.')
  }
  const json = (await res.json().catch(() => ({}))) as { image?: string; error?: string }
  if (!res.ok || !json.image) {
    if (res.status === 404) throw new MockupAIError('Prévia com IA disponível só no servidor do app (npm run dev / Netlify).')
    throw new MockupAIError(json.error ?? 'Não foi possível gerar a prévia agora.')
  }
  // compacta para caber no rascunho e no pedido (armazenamento local)
  return shrinkToJpeg(json.image, 720)
}
