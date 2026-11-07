import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../../store/Store'
import type { Order, OrderItem, OrderStatus } from '../../types'
import { Badge, Empty } from '../../components/ui'
import { Mockup } from '../../components/Mockup'
import { brl, dateBR, dateTimeBR, describePlacement, orderTotals, pct, STATUS, STATUS_ORDER } from '../../lib/format'
import { cotarItem, opcaoLabel } from '../../lib/pricing'

export default function OrderDetail() {
  const { id } = useParams()
  const { db, updateOrder } = useStore()
  const o = db.orders.find((x) => x.id === id)
  const [busy, setBusy] = useState<string | null>(null)
  const [pdfErr, setPdfErr] = useState('')

  if (!o) return <Empty title="Pedido não encontrado"><Link to="/admin/pedidos" className="link">← Voltar para a fila</Link></Empty>

  const t = orderTotals(o, db.settings)
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(o.status) + 1] as OrderStatus | undefined

  const pdf = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setPdfErr('')
    try {
      await fn()
    } catch {
      setPdfErr('Não foi possível gerar o PDF. Se as imagens vierem de outro domínio, ele precisa permitir acesso (CORS).')
    } finally {
      setBusy(null)
    }
  }


  return (
    <>
      <Link to="/admin/pedidos" className="back-link">← Fila de pedidos</Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pedido #{o.numero} <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge></h1>
          <p className="muted">Recebido em {dateTimeBR(o.createdAt)} · {o.contato.empresa || o.contato.nome}</p>
        </div>
        <div className="page-actions">
          <label className="inline-field">
            <span className="sr-only">Status</span>
            <select className="input w-auto" value={o.status} onChange={(e) => updateOrder(o.id, { status: e.target.value as OrderStatus })}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
          </label>
          {nextStatus && <button className="btn primary" onClick={() => updateOrder(o.id, { status: nextStatus })}>Mover para “{STATUS[nextStatus].label}”</button>}
        </div>
      </div>

      <div className="detail-grid">
        {/* ── Orçamento do cliente ── */}
        <section className="panel">
          <h2 className="panel-title">Orçamento do cliente</h2>
          <dl className="kv">
            <div><dt>Contato</dt><dd>{o.contato.nome}{o.contato.empresa && ` · ${o.contato.empresa}`}</dd></div>
            <div><dt>E-mail</dt><dd><a href={`mailto:${o.contato.email}`}>{o.contato.email}</a></dd></div>
            <div><dt>Telefone</dt><dd><a href={`https://wa.me/55${o.contato.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">{o.contato.telefone}</a></dd></div>
            <div><dt>Ocasião</dt><dd>{o.ocasiao}{o.destinatario && ` · para ${o.destinatario}`}</dd></div>
            {o.quantidadeEstimada && <div><dt>Qtd. estimada</dt><dd>{o.quantidadeEstimada}</dd></div>}
            {o.prazo && <div><dt>Prazo desejado</dt><dd>{dateBR(o.prazo + 'T12:00')}</dd></div>}
            <div><dt>Embalagem</dt><dd>{o.embalagens.length ? o.embalagens.join(', ') : 'Sem embalagem adicional'}</dd></div>
            <div><dt>Cartão</dt><dd>{o.cartao ? <>“{o.cartao.mensagem}”{o.cartao.assinatura && <> — {o.cartao.assinatura}</>}</> : 'Não'}</dd></div>
            <div><dt>Entrega</dt><dd>{[o.entrega.endereco, o.entrega.numero, o.entrega.complemento].filter(Boolean).join(', ')} · CEP {o.entrega.cep}</dd></div>
            <div><dt>Frete</dt><dd>{o.frete ? `Lalamove · ${o.frete.label} · ${brl(o.frete.price)}` : 'A combinar (fora da área ou não calculado)'}</dd></div>
            {o.observacoes && <div><dt>Observações</dt><dd>{o.observacoes}</dd></div>}
          </dl>

          <h3 className="panel-sub">Financeiro</h3>
          <div className="fin-overrides">
            <label>
              <span>Margem de lucro (%)</span>
              <input className="input" type="number" step="0.1" min={0} value={o.margemPct ?? ''} placeholder={`${db.settings.margemPct} (padrão)`}
                onChange={(e) => updateOrder(o.id, { margemPct: e.target.value === '' ? null : Number(e.target.value) })} />
            </label>
            <label>
              <span>Taxa do cartão (%)</span>
              <input className="input" type="number" step="0.01" min={0} value={o.taxaCartaoPct ?? ''} placeholder={`${db.settings.taxaCartaoPct} (padrão)`}
                onChange={(e) => updateOrder(o.id, { taxaCartaoPct: e.target.value === '' ? null : Number(e.target.value) })} />
            </label>
            <label>
              <span>Frete 1 · coleta (R$)</span>
              <input className="input" type="number" step="0.01" min={0} value={o.frete1 ?? ''} placeholder={`${db.settings.frete1Padrao} (padrão)`}
                onChange={(e) => updateOrder(o.id, { frete1: e.target.value === '' ? null : Number(e.target.value) })} />
            </label>
            <label>
              <span>Horas de produção</span>
              <input className="input" type="number" step="0.5" min={0} value={o.horas ?? ''} placeholder={`${db.settings.horasPadrao} (padrão)`}
                onChange={(e) => updateOrder(o.id, { horas: e.target.value === '' ? null : Number(e.target.value) })} />
            </label>
          </div>
          <table className="fin-table">
            <tbody>
              <tr className="fin-group"><td colSpan={2}>Custo do pedido</td></tr>
              <tr><td>Itens <span className="muted small">· Qtd × custo do item</span></td><td className="num">{brl(t.produtos)}</td></tr>
              <tr><td>Personalização <span className="muted small">· Qtd × custo da personalização</span></td><td className="num">{brl(t.personalizacao)}</td></tr>
              <tr><td>Frete 1 · coleta</td><td className="num">{brl(t.frete1)}</td></tr>
              <tr><td>Frete 2 · entrega {o.frete ? <span className="muted small">· Lalamove {o.frete.label}</span> : <span className="muted small">· a combinar</span>}</td><td className="num">{brl(t.frete2)}</td></tr>
              <tr><td>Mão de obra <span className="muted small">· {t.horas.toLocaleString('pt-BR')} h × {brl(t.valorHora)}</span></td><td className="num">{brl(t.maoDeObra)}</td></tr>
              <tr className="subtotal"><td>Custo total</td><td className="num">{brl(t.custo)}</td></tr>
              <tr className="fin-group"><td colSpan={2}>Preço final = custo ÷ (1 − {pct(t.margemPct)} − {pct(t.taxaPct)})</td></tr>
              <tr><td>Margem de lucro <span className="muted small">· {pct(t.margemPct)} do preço</span></td><td className="num">{t.divisorValido ? brl(t.margem) : '—'}</td></tr>
              <tr><td>Taxa do cartão <span className="muted small">· {pct(t.taxaPct)} do preço</span></td><td className="num">{t.divisorValido ? brl(t.taxaCartao) : '—'}</td></tr>
              <tr className="total"><td>Preço final da encomenda</td><td className="num">{t.divisorValido ? brl(t.total) : '—'}</td></tr>
            </tbody>
          </table>
          {!t.divisorValido && <p className="alert error">Margem + taxa do cartão precisam somar menos de 100% para calcular o preço.</p>}
          <p className="field-hint">Custo = itens + personalização + Frete 1 + Frete 2 + horas × valor da hora. Margem e taxa são porcentagens do preço final. Deixe os campos vazios para usar o padrão de Configurações.</p>
        </section>

        {/* ── Produtos com a logo + PDF ── */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Produtos com a logo</h2>
            <button className="btn dark sm" disabled={!!busy} onClick={() => pdf('all', async () => (await import('../../lib/pdf')).downloadOrderPdf(o))}>
              {busy === 'all' ? 'Gerando…' : '⬇ PDF de todos'}
            </button>
          </div>
          {pdfErr && <p className="alert error">{pdfErr}</p>}
          <div className="detail-items">
            {o.itens.map((it, i) => (
              <ItemBlock key={i} o={o} it={it} busy={busy === `i${i}`} disabled={!!busy}
                onPdf={() => pdf(`i${i}`, async () => (await import('../../lib/pdf')).downloadItemPdf(o, it))}
                onChangePz={(pid, opcaoId) => {
                  const z = db.personalizations.find((x) => x.id === pid)
                  // faixa de preço pelo total do produto (todas as cores do pedido)
                  const total = o.itens.filter((x) => x.productId === it.productId).reduce((t, x) => t + x.quantidade, 0)
                  if (!z) return
                  const c = cotarItem(z, opcaoId, total)
                  updateOrder(o.id, { itens: o.itens.map((x) => (x.productId === it.productId ? { ...x, ...c } : x)) })
                }} />
            ))}
          </div>
          <div className="logo-file">
            <span className="muted small">Logo enviada pelo cliente</span>
            <img src={o.logo} alt="Logo do cliente" />
            <a className="link small" href={o.logo} download={`logo-pedido-${o.numero}.png`}>Baixar logo</a>
          </div>
        </section>
      </div>
    </>
  )
}

function ItemBlock({ o, it, busy, disabled, onPdf, onChangePz }: { o: Order; it: OrderItem; busy: boolean; disabled: boolean; onPdf: () => void; onChangePz: (id: string, opcaoId: string | null) => void }) {
  const { db } = useStore()
  const product = db.products.find((p) => p.id === it.productId)
  const options = product ? db.personalizations.filter((z) => product.personalizacaoIds.includes(z.id)) : db.personalizations
  const current = db.personalizations.find((z) => z.id === it.personalizacaoId)
  return (
    <article className="detail-item">
      <div className="detail-mock">
        <Mockup image={it.imagem} logo={o.logo} placement={it.placement} alt={`${it.nome} com a logo`} />
        {it.mockupIA && (
          <figure className="detail-ia">
            <img src={it.mockupIA} alt={`Prévia gerada por IA: ${it.nome} em ${it.cor}`} />
            <figcaption>✨ Prévia IA vista pelo cliente</figcaption>
          </figure>
        )}
      </div>
      <div className="detail-item-info">
        <h3 className="h3">{it.nome}</h3>
        <p className="muted small mono">{it.codigo}</p>
        <dl className="kv compact">
          <div><dt>Quantidade</dt><dd>{it.quantidade} un.</dd></div>
          <div><dt>Cor</dt><dd>{it.cor || '—'}</dd></div>
          <div><dt>Posição da logo</dt><dd>{describePlacement(it.placement, o.logoAspect)}</dd></div>
          <div><dt>Valor do produto</dt><dd>{brl(it.valorUnidade)}/un.</dd></div>
          <div>
            <dt>Personalização</dt>
            <dd>
              <select className="input sm" value={it.personalizacaoId ?? ''} onChange={(e) => onChangePz(e.target.value, null)} aria-label="Tipo de personalização">
                {!it.personalizacaoId && <option value="">A definir</option>}
                {it.personalizacaoId && !options.some((z) => z.id === it.personalizacaoId) && <option value={it.personalizacaoId}>{it.personalizacaoTipo}</option>}
                {options.map((z) => <option key={z.id} value={z.id}>{z.tipo}</option>)}
              </select>
              {current && current.opcoes.length > 1 && (
                <select className="input sm pz-opt" value={it.personalizacaoOpcaoId ?? ''} onChange={(e) => onChangePz(current.id, e.target.value)} aria-label="Área e cores">
                  {current.opcoes.map((op) => <option key={op.id} value={op.id}>{opcaoLabel(op)}</option>)}
                </select>
              )}
              {current?.opcoes.length === 1 && it.personalizacaoOpcao && <span className="muted small"> {it.personalizacaoOpcao}</span>}
              <span className="muted small pz-price">{brl(it.personalizacaoValor)}/un. na faixa de {it.quantidade} un. · {brl(it.personalizacaoValor * it.quantidade)}</span>
            </dd>
          </div>
        </dl>
        <button className="btn ghost sm" onClick={onPdf} disabled={disabled}>{busy ? 'Gerando…' : '⬇ PDF para o Illustrator'}</button>
      </div>
    </article>
  )
}
