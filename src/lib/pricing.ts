/* ─────────────────────────────────────────────
   Preço de personalização por faixa de quantidade
   Cada técnica tem opções (área × cores); cada opção tem faixas
   "a partir de N peças → R$ X por peça".
   ───────────────────────────────────────────── */
import type { OrderItem, Personalization, PersonalizationOption, PriceTier } from '../types'

export const coresLabel = (n: number) => `${n} ${n > 1 ? 'cores' : 'cor'}`

/** "até 20 × 26 cm · 2 cores", "25 × 70 mm", "1 cor". */
export function opcaoLabel(o: PersonalizationOption) {
  return [o.area, o.cores ? coresLabel(o.cores) : null].filter(Boolean).join(' · ') || 'Padrão'
}

/** Preço da maior faixa cuja quantidade mínima é ≤ qtd (abaixo da primeira faixa, usa a primeira). */
export function precoFaixa(faixas: PriceTier[], qtd: number) {
  const ord = [...faixas].sort((a, b) => a.qtdMin - b.qtdMin)
  let preco = ord[0]?.preco ?? 0
  for (const f of ord) if (qtd >= f.qtdMin) preco = f.preco
  return preco
}

export function opcaoDe(pz: Personalization | undefined, opcaoId: string | null) {
  if (!pz) return undefined
  return pz.opcoes.find((o) => o.id === opcaoId) ?? pz.opcoes[0]
}

/** Menor preço por peça da técnica (maior volume, menor área). */
export function precoMinimo(pz: Personalization) {
  const precos = pz.opcoes.flatMap((o) => o.faixas.map((f) => f.preco))
  return precos.length ? Math.min(...precos) : 0
}

/** Campos de personalização de um item de pedido, já com o preço da faixa. */
export function cotarItem(
  pz: Personalization | undefined,
  opcaoId: string | null,
  qtd: number,
): Pick<OrderItem, 'personalizacaoId' | 'personalizacaoTipo' | 'personalizacaoOpcaoId' | 'personalizacaoOpcao' | 'personalizacaoValor'> {
  const op = opcaoDe(pz, opcaoId)
  if (!pz || !op) {
    return { personalizacaoId: pz?.id ?? null, personalizacaoTipo: pz?.tipo ?? 'A definir', personalizacaoOpcaoId: null, personalizacaoOpcao: '', personalizacaoValor: 0 }
  }
  return {
    personalizacaoId: pz.id,
    personalizacaoTipo: pz.tipo,
    personalizacaoOpcaoId: op.id,
    personalizacaoOpcao: opcaoLabel(op),
    personalizacaoValor: precoFaixa(op.faixas, qtd),
  }
}

/**
 * Agrupa as opções para exibir a tabela:
 * - técnicas por cor com várias áreas → um grupo por área, colunas = cores
 * - demais → um único grupo, colunas = área (ou cores)
 */
export function agruparOpcoes(opcoes: PersonalizationOption[]) {
  const porCor = opcoes.some((o) => o.cores != null)
  const grupos = new Map<string, PersonalizationOption[]>()
  for (const o of opcoes) {
    const k = porCor ? (o.area ?? '') : ''
    grupos.set(k, [...(grupos.get(k) ?? []), o])
  }
  return {
    grupos: [...grupos.entries()].map(([area, ops]) => ({ area, opcoes: ops })),
    coluna: (o: PersonalizationOption) => (porCor && o.cores ? coresLabel(o.cores) : o.area ?? 'Padrão'),
  }
}

/** Quantidades (linhas) presentes em qualquer opção, em ordem crescente. */
export function quantidadesDe(opcoes: PersonalizationOption[]) {
  return [...new Set(opcoes.flatMap((o) => o.faixas.map((f) => f.qtdMin)))].sort((a, b) => a - b)
}
