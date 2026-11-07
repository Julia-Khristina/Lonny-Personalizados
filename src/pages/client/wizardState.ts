import type { FreightQuote, LogoPlacement } from '../../types'
import { PERFIL_DEMO } from '../../data/perfil'

export interface ItemConfig {
  placement: LogoPlacement
  personalizacaoId: string | null
  /** Quantidade por cor (cor → unidades). Só entram no pedido as cores com quantidade > 0. */
  cores: Record<string, number>
  /** Prévias geradas por IA por cor; `key` registra a configuração usada (posição, técnica…). */
  ia: Record<string, { img: string; key: string }>
}

/** Linhas cor × quantidade de um produto (só as preenchidas). */
export const linhasDe = (c: ItemConfig | undefined) =>
  Object.entries(c?.cores ?? {}).filter(([, q]) => q > 0).map(([cor, quantidade]) => ({ cor, quantidade }))

/** Total de unidades do produto (todas as cores) — define a faixa de preço da personalização. */
export const qtdTotal = (c: ItemConfig | undefined) => linhasDe(c).reduce((t, l) => t + l.quantidade, 0)

export interface WizardState {
  step: number
  occ: string
  occOutro: string
  dest: string
  qty: string
  prazo: string
  selected: string[] // ids de produto, na ordem de seleção
  logo: string
  logoAspect: number
  logoName: string
  items: Record<string, ItemConfig>
  emb: string[]
  msg: 'sim' | 'nao' | null
  msgTxt: string
  msgFrom: string
  contato: { nome: string; empresa: string; email: string; telefone: string }
  entrega: { cep: string; endereco: string; numero: string; complemento: string }
  frete: FreightQuote | null
  observacoes: string
}

export const STEPS = ['Contexto', 'Produtos', 'Logo', 'Embalagem', 'Mensagem', 'Encaminhar'] as const

export const initialState = (): WizardState => ({
  step: 1, occ: '', occOutro: '', dest: '', qty: '', prazo: '',
  selected: [], logo: '', logoAspect: 1, logoName: '', items: {},
  emb: [], msg: null, msgTxt: '', msgFrom: '',
  // perfil mockado: cliente já cadastrado, dados chegam preenchidos
  contato: { nome: PERFIL_DEMO.nome, empresa: PERFIL_DEMO.empresa, email: PERFIL_DEMO.email, telefone: PERFIL_DEMO.telefone },
  entrega: { cep: PERFIL_DEMO.entrega.cep, endereco: PERFIL_DEMO.entrega.endereco, numero: PERFIL_DEMO.entrega.numero, complemento: PERFIL_DEMO.entrega.complemento },
  frete: null, observacoes: '',
})

export const OCASIOES = [
  { val: 'Boas-vindas', icon: '🤝' },
  { val: 'Corporativo', icon: '🏢' },
  { val: 'Eventos', icon: '🎪' },
  { val: 'Natal / Fim de ano', icon: '🎁' },
  { val: 'Dia das Mães', icon: '💐' },
  { val: 'outro', icon: '✏️', label: 'Outra ocasião' },
]
export const DESTINOS = ['Colaboradores', 'Clientes', 'Parceiros', 'Leads / Prospects', 'Speakers / VIPs']
export const QTDS = [
  { val: 'Até 50 un.', label: 'Até 50', def: 50 },
  { val: '50–100 un.', label: '50–100', def: 50 },
  { val: '100–200 un.', label: '100–200', def: 100 },
  { val: '200–500 un.', label: '200–500', def: 200 },
  { val: '500+ un.', label: '500+', def: 500 },
]
export const EMBALAGENS = [
  { val: 'Caixa rígida personalizada', name: 'Caixa rígida', desc: 'Estrutura premium com a sua marca na tampa.' },
  { val: 'Papel de seda personalizado', name: 'Papel de seda', desc: 'Camada de proteção estampada com a identidade.' },
  { val: 'Fita de cetim personalizada', name: 'Fita de cetim', desc: 'Acabamento elegante com a logo aplicada.' },
  { val: 'Adesivo / lacre personalizado', name: 'Adesivo / lacre', desc: 'Fechamento que reforça a marca no unboxing.' },
]
export const SEM_EMBALAGEM = 'Sem embalagem'

export const DEFAULT_PLACEMENT: LogoPlacement = { x: 0.33, y: 0.4, w: 0.34, r: 0 }

const DRAFT_KEY = 'lonny_exp_draft_v2' // v2: quantidade por cor + prévias IA
export function loadDraft(): WizardState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...initialState(), ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}
export function saveDraft(s: WizardState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(s))
    return true
  } catch {
    return false
  }
}
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignora */
  }
}
