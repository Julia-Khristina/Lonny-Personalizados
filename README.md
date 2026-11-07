# Lonny Personalizados — Monte sua Experiência + Painel

Interfaces do cliente (wizard "Monte sua Experiência") e da administradora, com dados **mockados**.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ (pronto para Netlify)
```

| Rota | Tela |
|---|---|
| `/experiencia` | Wizard do cliente (6 passos) |
| `/admin/login` | Login (demo: `admin@gmail.com` / `123`) |
| `/admin` | Início: indicadores + orientações |
| `/admin/pedidos` | Fila de pedidos (cards) → `/admin/pedidos/:id` detalhe + PDF |
| `/admin/produtos` · `/fornecedores` · `/personalizacao` | CRUDs |
| `/admin/configuracoes` | Margem, taxa de cartão, estoque mínimo |

## Fluxo do cliente

1. **Contexto**: ocasião, público, quantidade estimada, prazo
2. **Produtos**: catálogo em cartões com foto, nome, categoria e cores; busca e filtro por categoria
3. **Logo**: upload único; em cada produto, arrastar, redimensionar e **girar** a logo; **cores com quantidade** (uma quantidade por cor); técnica de personalização; **prévia realista com IA** (Gemini) na cor escolhida e com a textura da técnica
4. **Embalagem**
5. **Mensagem** (cartão)
6. **Encaminhar**: mockups, **valor final** por produto e total do pedido, dados de entrega e contato vindos do **perfil do cliente** (mockado) e frete calculado automaticamente

## Prévia com IA (Gemini)

1. Copie `.env.example` para `.env.local` e preencha `GEMINI_API_KEY` (chave em https://aistudio.google.com/apikey).
2. Reinicie o `npm run dev`.

A chave fica **só no servidor**: o navegador chama `/api/mockup`, que é atendido pelo próprio Vite no desenvolvimento (`vite.config.ts`) e pela função `netlify/functions/mockup.mts` em produção (configure `GEMINI_API_KEY` nas variáveis de ambiente do Netlify). O prompt e a textura de cada técnica ficam em `server/mockup.ts`. Modelo padrão: `gemini-nano-banana-2.1` (troque com `GEMINI_IMAGE_MODEL`). Sem a chave, o resto do app funciona normalmente e a tela mostra um aviso.

O pedido enviado aparece na fila da admin (mesmo navegador, sincroniza entre abas).

## Identidade visual

Segue o manual `arquivos-base/ID_LONNY_SET2026.pdf`.

| O quê | Onde |
|---|---|
| Cores (laranja `#FF6200`, rosa `#FF0080`, cinza `#E8E7E7`, preto) e demais tokens | `src/index.css` → `:root` |
| Logo oficial (versões vertical, horizontal e só nome; colorida ou branca) | `src/components/Logo.tsx` |
| Fontes: Open Sauce Sans (texto, conforme manual) e Fraunces (títulos, no lugar da Argent, que é paga) | `src/main.tsx` |

Para usar a Argent CF, instale a licença como webfont e coloque o nome dela no início de `--font-d`.

## Onde trocar pelos dados reais

| O quê | Arquivo |
|---|---|
| Modelos de dados | `src/types.ts` |
| Catálogo de produtos (gerado da planilha + fotos de `arquivos-base/`) | `python scripts/importar_produtos.py` → `src/data/produtos.ts` e `public/produtos/` |
| Estoque, cores, fornecedor e personalizações de cada produto (não vêm na planilha) | tabela `CURADORIA` em `scripts/importar_produtos.py` |
| Tabela de preços de personalização (por faixa de quantidade, área e cores) | `python scripts/importar_personalizacoes.py` → `src/data/personalizacoes.ts` |
| Dados de exemplo (fornecedores, pedidos, configurações) | `src/data/seed.ts` |
| Persistência (hoje `localStorage`) → API | `src/store/Store.tsx` |
| Frete Lalamove (hoje mock) | `src/services/freight.ts`: a chamada real precisa rodar no servidor (assinatura HMAC com o secret) |
| Login (hoje mock) | `src/pages/admin/AdminLayout.tsx` (`auth`) |
| Perfil do cliente (hoje mock: contato e endereço preenchidos no passo 6) | `src/data/perfil.ts` |
| Cálculo financeiro (painel e tela do cliente) | `src/lib/format.ts` → `calcTotals` |

Após mudar `seed.ts` ou reimportar produtos, incremente `DB_VERSION` em `seed.ts` (o navegador recarrega sozinho) ou use **Configurações → Restaurar dados de exemplo** (ou limpe o `localStorage`) para recarregar.

### Cálculo do pedido
- personalização = preço por peça da faixa em que a quantidade do item cai (ex.: 80 un. → faixa "a partir de 50"), conforme técnica, área e cores (`src/lib/pricing.ts`)
- **Custo total do pedido** = (Qtd × custo do item) + (Qtd × custo da personalização) + (Frete 1 + Frete 2) + (Horas × valor da hora)
  - Frete 1 = coleta (fornecedor → Lonny) · Frete 2 = entrega ao cliente (cotação Lalamove)
- **Preço final da encomenda** = Custo ÷ (1 − Margem − Taxa do cartão)
  - margem e taxa são % do preço final (precisam somar menos de 100%)

Margem, taxa, valor da hora, horas padrão e Frete 1 padrão ficam em Configurações; margem, taxa, Frete 1 e horas podem ser ajustados em cada pedido. A fórmula fica em um único lugar: `src/lib/format.ts` → `calcTotals`.

## PDF para o Illustrator
Uma página por produto, no tamanho da foto. A foto e a logo são **objetos separados**: no Illustrator dá para selecionar a logo e trocá-la pelo vetor original mantendo a posição.
Imagens de outro domínio (ex.: R2) precisam liberar CORS para o PDF ser gerado.

## Limitações desta fase
- Tudo fica no navegador (`localStorage`, cerca de 5 MB). Imagens enviadas são reduzidas automaticamente.
- A logo é armazenada como PNG (até 900 px); para produção, use o arquivo vetorial do cliente.
