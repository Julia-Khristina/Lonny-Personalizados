/* ─────────────────────────────────────────────
   Modelos de dados da plataforma Lonny
   ───────────────────────────────────────────── */

export type ID = string

export interface Supplier {
  id: ID
  nome: string
  endereco: string
  telefone: string
  email: string
}

/** Preço por peça válido a partir de `qtdMin` peças. */
export interface PriceTier {
  qtdMin: number
  preco: number
}

/** Variação de uma técnica: área de gravação e/ou número de cores, com a própria tabela de faixas. */
export interface PersonalizationOption {
  id: ID
  area: string | null // ex.: "25 × 70 mm", "até 20 × 26 cm"
  cores: number | null // nº de cores (técnicas por cor)
  faixas: PriceTier[] // ordenadas por qtdMin crescente
}

export interface Personalization {
  id: ID
  codigo: string // código da tabela do fornecedor, ex.: SCR2, LSR1
  tipo: string // ex.: Silk Screen, Laser, Transfer…
  opcoes: PersonalizationOption[]
}

export interface Product {
  id: ID
  codigo: string
  nome: string
  categoria: string
  descricao: string
  estoque: number
  cores: string[]
  valor: number // R$ por unidade (custo/preço base)
  imagens: string[] // URLs ou data URLs; a primeira é a principal
  fornecedorId: ID | null
  personalizacaoIds: ID[] // tipos de personalização que o produto suporta
}

/** Posição da logo relativa à imagem do produto (0–1). */
export interface LogoPlacement {
  x: number // canto superior esquerdo, fração da largura
  y: number // canto superior esquerdo, fração da altura
  w: number // largura da logo, fração da largura da imagem
  r?: number // rotação em graus (sentido horário), em torno do centro da logo
}

export type OrderStatus = 'novo' | 'producao' | 'enviado' | 'concluido'

export interface OrderItem {
  productId: ID
  /* snapshot no momento do pedido — edições futuras no produto não alteram o pedido */
  nome: string
  codigo: string
  categoria: string
  imagem: string
  valorUnidade: number
  quantidade: number
  cor: string
  placement: LogoPlacement
  personalizacaoId: ID | null
  personalizacaoTipo: string
  personalizacaoOpcaoId: ID | null
  personalizacaoOpcao: string // rótulo da opção (área · cores) no momento do pedido
  personalizacaoValor: number // R$ por unidade, pela faixa da quantidade
  mockupIA?: string // prévia realista gerada por IA (cor + textura da técnica), JPEG data URL
}

export interface FreightQuote {
  provider: 'lalamove'
  serviceType: string // MOTORCYCLE | CAR | VAN | TRUCK
  label: string
  price: number
  etaMin: number
  quotationId: string
}

export interface Order {
  id: ID
  numero: number
  createdAt: string // ISO
  status: OrderStatus
  /* contexto (passo 1) */
  ocasiao: string
  destinatario: string
  quantidadeEstimada: string
  prazo: string
  /* identidade */
  logo: string // data URL
  logoAspect: number // largura / altura
  itens: OrderItem[]
  /* passos 4 e 5 */
  embalagens: string[]
  cartao: { mensagem: string; assinatura: string } | null
  /* envio */
  contato: { nome: string; empresa: string; email: string; telefone: string }
  entrega: { cep: string; endereco: string; numero: string; complemento: string }
  frete: FreightQuote | null
  observacoes: string
  /* financeiro (ajustável pela admin; nulo = usa configuração global) */
  margemPct: number | null
  taxaCartaoPct: number | null
  frete1: number | null // Frete 1 — coleta (fornecedor → Lonny), R$; nulo = padrão das configurações
  horas: number | null // horas de produção/montagem do pedido; nulo = padrão das configurações
}

export interface Settings {
  margemPct: number // % do preço final
  taxaCartaoPct: number // % do preço final
  estoqueMinimo: number
  valorHora: number // R$ por hora de produção/montagem
  horasPadrao: number // horas estimadas por pedido
  frete1Padrao: number // Frete 1 (coleta) estimado por pedido, R$
}

export interface DB {
  version: number
  products: Product[]
  suppliers: Supplier[]
  personalizations: Personalization[]
  orders: Order[]
  settings: Settings
}
