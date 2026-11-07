/* ─────────────────────────────────────────────
   PERFIL DE CLIENTE (mockado)
   Simula um cliente já cadastrado/logado: contato e endereço de entrega
   chegam preenchidos no passo 6. Troque pela conta real quando houver login de cliente.
   ───────────────────────────────────────────── */
export interface ClientProfile {
  id: string
  nome: string
  cargo: string
  empresa: string
  cnpj: string
  email: string
  telefone: string
  entrega: { cep: string; endereco: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string }
  /** Instruções de recebimento que a transportadora deve ver. */
  instrucoesEntrega: string
}

export const PERFIL_DEMO: ClientProfile = {
  id: 'cli-demo',
  nome: 'Mariana Alves',
  cargo: 'Analista de Endomarketing',
  empresa: 'Beta Consultoria',
  cnpj: '12.345.678/0001-90',
  email: 'mariana.alves@betaconsultoria.com.br',
  telefone: '(11) 98765-4321',
  entrega: {
    cep: '01310-100',
    endereco: 'Av. Paulista',
    numero: '1578',
    complemento: 'Conj. 42 — Recepção',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  instrucoesEntrega: 'Entregar na recepção, de segunda a sexta, das 9h às 18h.',
}
