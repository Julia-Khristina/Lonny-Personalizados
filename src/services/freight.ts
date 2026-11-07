/* ─────────────────────────────────────────────
   Frete — Lalamove (MOCK)

   Integração real (a fazer quando houver credenciais):
   • Endpoint: POST https://rest.lalamove.com/v3/quotations  (sandbox: rest.sandbox.lalamove.com)
   • Autenticação por HMAC-SHA256 com API key + secret → a chamada PRECISA
     rodar no servidor (ex.: Netlify Function), nunca no navegador.
   • Market: BR, cidade de São Paulo. Payload: serviceType, stops[] (coleta + entrega
     com coordenadas e endereço), item (quantidade/peso).
   • A Lalamove atende entregas dentro da mesma cidade/região metropolitana.

   Para trocar o mock: implemente `quoteFreight` chamando a sua função de servidor
   e devolva o mesmo formato (FreightQuote[]).
   ───────────────────────────────────────────── */
import type { FreightQuote } from '../types'

export interface FreightRequest {
  cep: string
  numero: string
  totalItens: number
}

export class FreightError extends Error {}

const SERVICES = [
  { serviceType: 'MOTORCYCLE', label: 'Moto', base: 14, perKm: 1.6, maxItens: 30, eta: 45 },
  { serviceType: 'CAR', label: 'Carro', base: 28, perKm: 2.4, maxItens: 200, eta: 70 },
  { serviceType: 'VAN', label: 'Van', base: 75, perKm: 3.6, maxItens: 1500, eta: 110 },
  { serviceType: 'TRUCK', label: 'Caminhão', base: 160, perKm: 5.2, maxItens: Infinity, eta: 160 },
]

const onlyDigits = (s: string) => s.replace(/\D/g, '')

export async function quoteFreight(req: FreightRequest): Promise<FreightQuote[]> {
  await new Promise((r) => setTimeout(r, 900)) // simula latência de rede

  const cep = onlyDigits(req.cep)
  if (cep.length !== 8) throw new FreightError('CEP inválido. Use o formato 00000-000.')
  const prefix = Number(cep.slice(0, 2))
  // Grande São Paulo: CEPs 01000-000 a 09999-999
  if (prefix < 1 || prefix > 9) {
    throw new FreightError('Este CEP está fora da área atendida pela Lalamove (Grande São Paulo). Nossa equipe enviará o frete no orçamento.')
  }

  // "distância" fictícia e estável derivada do CEP
  const km = 4 + (Number(cep.slice(2, 5)) % 38)
  return SERVICES.filter((s) => req.totalItens <= s.maxItens)
    .slice(0, 3)
    .map((s) => ({
      provider: 'lalamove' as const,
      serviceType: s.serviceType,
      label: s.label,
      price: Math.round((s.base + s.perKm * km) * 100) / 100,
      etaMin: s.eta + Math.round(km * 1.5),
      quotationId: `MOCK-${s.serviceType}-${cep}-${Date.now().toString(36)}`,
    }))
}

export const formatCep = (v: string) => {
  const d = onlyDigits(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}
