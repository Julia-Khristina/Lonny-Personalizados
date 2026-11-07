import type { LogoPlacement, Order, OrderItem, OrderStatus, Settings } from '../types'

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
export const dateBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
export const dateTimeBR = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  novo: { label: 'Novo', tone: 'accent' },
  producao: { label: 'Em produção', tone: 'info' },
  enviado: { label: 'Enviado', tone: 'warn' },
  concluido: { label: 'Concluído', tone: 'ok' },
}
export const STATUS_ORDER: OrderStatus[] = ['novo', 'producao', 'enviado', 'concluido']

/** Descrição legível da posição da logo (ex.: "Centro · meio · 34% da largura"). */
export function describePlacement(p: LogoPlacement, logoAspect: number, imgAspect = 1) {
  const h = (p.w * imgAspect) / logoAspect
  const cx = p.x + p.w / 2
  const cy = p.y + h / 2
  const hz = cx < 0.4 ? 'Esquerda' : cx > 0.6 ? 'Direita' : 'Centro'
  const vt = cy < 0.4 ? 'superior' : cy > 0.6 ? 'inferior' : 'meio'
  return `${hz} · ${vt} · ${Math.round(p.w * 100)}% da largura${p.r ? ` · girada ${p.r}°` : ''}`
}

/* ── Cálculo financeiro do pedido ──────────────────────────
   Custo total  = (Qtd × Custo do item) + (Qtd × Custo da personalização)
                + (Frete 1 + Frete 2) + (Horas × Valor da hora)
   Preço final  = Custo ÷ (1 − Margem − Taxa do cartão)
     Frete 1 = coleta (fornecedor → Lonny) · Frete 2 = entrega ao cliente (Lalamove)
     Margem e taxa são % do PREÇO FINAL: margem R$ = preço × margem%, taxa R$ = preço × taxa%
   ────────────────────────────────────────────────────────── */
type LinhaValor = Pick<OrderItem, 'valorUnidade' | 'personalizacaoValor' | 'quantidade'>

export interface CustoParams {
  itens: LinhaValor[]
  frete1: number // coleta
  frete2: number // entrega ao cliente
  horas: number
  valorHora: number
  margemPct: number
  taxaPct: number
}

/** Divisor do preço: 1 − Margem − Taxa (frações). ≤ 0 = configuração impossível. */
export const divisorPreco = (margemPct: number, taxaPct: number) => 1 - margemPct / 100 - taxaPct / 100

/** Converte uma parte do custo em preço final (mesma fórmula do pedido). */
export const precoDe = (custo: number, margemPct: number, taxaPct: number) => {
  const d = divisorPreco(margemPct, taxaPct)
  return d > 0 ? custo / d : NaN
}

/** Cálculo único usado no painel e na tela do cliente — troque aqui para mudar a fórmula. */
export function calcTotals(p: CustoParams) {
  const produtos = p.itens.reduce((t, i) => t + i.quantidade * i.valorUnidade, 0)
  const personalizacao = p.itens.reduce((t, i) => t + i.quantidade * i.personalizacaoValor, 0)
  const frete = p.frete1 + p.frete2
  const maoDeObra = p.horas * p.valorHora
  const custo = produtos + personalizacao + frete + maoDeObra
  const divisor = divisorPreco(p.margemPct, p.taxaPct)
  const total = divisor > 0 ? custo / divisor : NaN
  return {
    produtos, personalizacao,
    frete1: p.frete1, frete2: p.frete2, frete,
    horas: p.horas, valorHora: p.valorHora, maoDeObra,
    custo, divisor, divisorValido: divisor > 0,
    margemPct: p.margemPct, taxaPct: p.taxaPct,
    margem: total * (p.margemPct / 100),
    taxaCartao: total * (p.taxaPct / 100),
    total,
    quantidade: p.itens.reduce((t, i) => t + i.quantidade, 0),
  }
}

/** Preço final de uma linha (item + personalização) para o cliente. */
export function valorFinalLinha(i: LinhaValor, margemPct: number, taxaPct: number) {
  return precoDe((i.valorUnidade + i.personalizacaoValor) * i.quantidade, margemPct, taxaPct)
}

export function orderTotals(o: Order, s: Settings) {
  return calcTotals({
    itens: o.itens,
    frete1: o.frete1 ?? s.frete1Padrao,
    frete2: o.frete?.price ?? 0,
    horas: o.horas ?? s.horasPadrao,
    valorHora: s.valorHora,
    margemPct: o.margemPct ?? s.margemPct,
    taxaPct: o.taxaCartaoPct ?? s.taxaCartaoPct,
  })
}
