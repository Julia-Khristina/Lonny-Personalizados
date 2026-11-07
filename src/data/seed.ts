/* ─────────────────────────────────────────────
   DADOS DE EXEMPLO
   Produtos: catálogo real (src/data/produtos.ts).
   Personalizações: tabela real de preços (src/data/personalizacoes.ts).
   Fornecedores e pedidos: fictícios.
   Estrutura dos modelos: src/types.ts
   ───────────────────────────────────────────── */
import type { DB, Order, OrderStatus, Personalization, Product, Supplier } from '../types'
import { demoLogo } from '../lib/placeholder'
import { PRODUTOS } from './produtos'
import { PERSONALIZACOES } from './personalizacoes'
import { cotarItem } from '../lib/pricing'

export const DB_VERSION = 4 // incrementar ao trocar o seed: o navegador recarrega os dados de exemplo

/* Tabela real de preços (por faixa de quantidade): gerada por scripts/importar_personalizacoes.py */
const personalizations: Personalization[] = PERSONALIZACOES

const suppliers: Supplier[] = [
  { id: 'sp-1', nome: 'Fornecedor Exemplo A', endereco: 'Rua Exemplo, 100 — São Paulo/SP', telefone: '(11) 90000-0001', email: 'contato@fornecedor-a.com.br' },
  { id: 'sp-2', nome: 'Fornecedor Exemplo B', endereco: 'Av. Modelo, 2000 — Guarulhos/SP', telefone: '(11) 90000-0002', email: 'vendas@fornecedor-b.com.br' },
  { id: 'sp-3', nome: 'Fornecedor Exemplo C', endereco: 'Rua Teste, 45 — Osasco/SP', telefone: '(11) 90000-0003', email: 'comercial@fornecedor-c.com.br' },
]

/* Catálogo real: gerado de arquivos-base/ por scripts/importar_produtos.py */
const products: Product[] = PRODUTOS

/* Pedidos de demonstração espalhados nos últimos ~60 dias para alimentar o painel */
function buildOrders(): Order[] {
  const now = Date.now()
  const day = 86_400_000
  const empresas = ['Empresa Alfa', 'Beta Consultoria', 'Gama Tech', 'Delta Eventos', 'Ômega Saúde', 'Sigma Educação']
  const ocasioes = ['Boas-vindas', 'Corporativo', 'Eventos', 'Natal / Fim de ano']
  const statuses: OrderStatus[] = ['concluido', 'concluido', 'enviado', 'producao', 'novo']
  const offsets = [58, 52, 47, 44, 39, 35, 31, 27, 22, 18, 14, 11, 9, 6, 4, 3, 2, 1, 0.4, 0.1]

  return offsets.map((off, i) => {
    const p1 = products[i % products.length]
    const p2 = products[(i + 3) % products.length]
    const empresa = empresas[i % empresas.length]
    const pz = (p: Product) => personalizations.find((z) => z.id === p.personalizacaoIds[0])
    const item = (p: Product, qtd: number, pl: { x: number; y: number; w: number }) => ({
      productId: p.id, nome: p.nome, codigo: p.codigo, categoria: p.categoria, imagem: p.imagens[0],
      valorUnidade: p.valor, quantidade: qtd, cor: p.cores[0], placement: pl,
      ...cotarItem(pz(p), null, qtd),
    })
    const recent = off < 7
    const status: OrderStatus = recent ? (off < 2 ? 'novo' : 'producao') : statuses[i % statuses.length]
    return {
      id: `od-${i + 1}`,
      numero: 1001 + i,
      createdAt: new Date(now - off * day).toISOString(),
      status,
      ocasiao: ocasioes[i % ocasioes.length],
      destinatario: i % 2 ? 'Clientes' : 'Colaboradores',
      quantidadeEstimada: '50–100 un.',
      prazo: new Date(now + (20 - off / 3) * day).toISOString().slice(0, 10),
      logo: demoLogo(empresa.split(' ')[0]),
      logoAspect: 2.5,
      itens: i % 3 === 0
        ? [item(p1, 50, { x: 0.33, y: 0.38, w: 0.34 }), item(p2, 50, { x: 0.35, y: 0.4, w: 0.3 })]
        : [item(p1, 30 + (i % 4) * 25, { x: 0.33, y: 0.4, w: 0.34 })],
      embalagens: i % 2 ? ['Caixa rígida personalizada', 'Papel de seda personalizado'] : [],
      cartao: i % 2 ? { mensagem: 'Obrigado por fazer parte da nossa história!', assinatura: `Equipe ${empresa}` } : null,
      contato: { nome: `Contato ${i + 1}`, empresa, email: `compras${i + 1}@exemplo.com.br`, telefone: '(11) 99999-0000' },
      entrega: { cep: '01310-100', endereco: 'Av. Paulista', numero: String(1000 + i * 10), complemento: '' },
      frete: { provider: 'lalamove', serviceType: 'CAR', label: 'Carro', price: 42 + (i % 5) * 7.5, etaMin: 70, quotationId: `MOCK-Q${i + 1}` },
      observacoes: '',
      margemPct: null,
      taxaCartaoPct: null,
      frete1: null,
      horas: null,
    }
  })
}

export function createSeed(): DB {
  return {
    version: DB_VERSION,
    products,
    suppliers,
    personalizations,
    orders: buildOrders(),
    settings: { margemPct: 35, taxaCartaoPct: 4.99, estoqueMinimo: 20, valorHora: 45, horasPadrao: 2, frete1Padrao: 25 },
  }
}
