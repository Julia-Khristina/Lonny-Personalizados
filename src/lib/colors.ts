/* Amostras de cor para os nomes usados no catálogo. */
const HEX: Record<string, string> = {
  rosa: '#ec4c9c', vermelho: '#d93a32', laranja: '#f47a20', amarelo: '#f5cf1e', verde: '#1f9a55',
  'verde-limão': '#a4d63c', azul: '#2463c9', 'azul-marinho': '#1e2d55', 'azul-claro': '#5fb8e6',
  'azul-turquesa': '#18b5c4', roxo: '#7d4aa8', preto: '#1c1c1c', branco: '#ffffff', cinza: '#9aa0a6',
  prata: '#c7cbd1', bege: '#e5d6b8', kraft: '#b98b5e', vinho: '#6e1f2f', transparente: 'transparent',
}

export function swatch(cor: string) {
  return HEX[cor.trim().toLowerCase()] ?? '#d9d4cf'
}

/** Cores disponíveis do produto (produto sem cores cadastradas = "Única"). */
export const coresDe = (cores: string[]) => (cores.length ? cores : ['Única'])
