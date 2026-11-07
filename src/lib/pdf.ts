/* ─────────────────────────────────────────────
   PDF de produção: foto do produto + logo já posicionada.
   Produto e logo entram como DOIS objetos de imagem separados,
   então no Illustrator a logo pode ser selecionada, movida ou trocada
   pelo vetor original mantendo a posição de referência.
   Uma página por item, no tamanho/proporção da foto.
   ───────────────────────────────────────────── */
import { jsPDF } from 'jspdf'
import type { Order, OrderItem } from '../types'
import { loadImage, rasterize } from './image'
import { rotatedLogo } from './compose'

const PX_TO_PT = 0.75

async function addItemPage(doc: jsPDF | null, item: OrderItem, order: Order) {
  const prodImg = await loadImage(item.imagem)
  const prod = rasterize(prodImg, 2000)
  const W = prod.width * PX_TO_PT
  const H = prod.height * PX_TO_PT
  const orientation = W >= H ? 'landscape' : 'portrait'

  if (!doc) doc = new jsPDF({ unit: 'pt', format: [W, H], orientation })
  else doc.addPage([W, H], orientation)

  doc.addImage(prod.canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H, undefined, 'FAST')

  const logoImg = await loadImage(order.logo)
  if (item.placement.r) {
    // logo girada: entra já rotacionada, recortada na própria caixa (segue como objeto separado)
    const rl = rotatedLogo(logoImg, item.placement, W / H)
    doc.addImage(rl.canvas.toDataURL('image/png'), 'PNG', rl.x * W, rl.y * H, rl.w * W, rl.h * H, undefined, 'FAST')
    return doc
  }
  const logo = rasterize(logoImg, 1600) // alta resolução para produção
  const lw = item.placement.w * W
  const lh = lw / (logo.width / logo.height)
  doc.addImage(logo.canvas.toDataURL('image/png'), 'PNG', item.placement.x * W, item.placement.y * H, lw, lh, undefined, 'FAST')
  return doc
}

const slug = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

export async function downloadItemPdf(order: Order, item: OrderItem) {
  const doc = await addItemPage(null, item, order)
  doc.setProperties({ title: `Pedido #${order.numero} — ${item.nome}`, creator: 'Lonny Personalizados' })
  doc.save(`pedido-${order.numero}-${slug(item.codigo || item.nome)}.pdf`)
}

export async function downloadOrderPdf(order: Order) {
  let doc: jsPDF | null = null
  for (const item of order.itens) doc = await addItemPage(doc, item, order)
  if (!doc) return
  doc.setProperties({ title: `Pedido #${order.numero}`, creator: 'Lonny Personalizados' })
  doc.save(`pedido-${order.numero}-mockups.pdf`)
}
