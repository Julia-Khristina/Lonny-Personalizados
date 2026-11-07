import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/Store'
import type { OrderStatus } from '../../types'
import { Badge, Empty } from '../../components/ui'
import { Mockup } from '../../components/Mockup'
import { brl, dateTimeBR, describePlacement, orderTotals, pct, STATUS, STATUS_ORDER } from '../../lib/format'
import { PageHead } from './AdminLayout'

type Filter = 'aberto' | OrderStatus | 'todos'

export default function Orders() {
  const { db } = useStore()
  const [filter, setFilter] = useState<Filter>('aberto')

  const queue = useMemo(
    () => [...db.orders]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)) // fila: ordem de chegada
      .filter((o) => filter === 'todos' || (filter === 'aberto' ? o.status !== 'concluido' : o.status === filter)),
    [db.orders, filter],
  )
  const count = (f: Filter) => db.orders.filter((o) => f === 'todos' || (f === 'aberto' ? o.status !== 'concluido' : o.status === f)).length
  const tabs: { f: Filter; label: string }[] = [
    { f: 'aberto', label: 'Em aberto' },
    ...STATUS_ORDER.map((s) => ({ f: s as Filter, label: STATUS[s].label })),
    { f: 'todos', label: 'Todos' },
  ]

  return (
    <>
      <PageHead title="Pedidos" sub="Fila por ordem de chegada — o mais antigo aparece primeiro" />
      <div className="tabs" role="tablist" aria-label="Filtrar por status">
        {tabs.map((t) => (
          <button key={t.f} role="tab" aria-selected={filter === t.f} className={`tab${filter === t.f ? ' on' : ''}`} onClick={() => setFilter(t.f)}>
            {t.label}<span className="tab-count">{count(t.f)}</span>
          </button>
        ))}
      </div>

      {queue.length === 0 ? <Empty title="Nenhum pedido aqui">Quando um cliente encaminhar uma experiência, ela aparece nesta fila.</Empty> : (
        <div className="order-grid">
          {queue.map((o, idx) => {
            const t = orderTotals(o, db.settings)
            return (
              <Link key={o.id} to={`/admin/pedidos/${o.id}`} className={`order-card status-${o.status}`}>
                <header className="order-card-hdr">
                  <span className="queue-pos" title="Posição na fila">{idx + 1}º</span>
                  <div className="order-card-id">
                    <strong>#{o.numero} · {o.contato.empresa || o.contato.nome}</strong>
                    <span className="muted small">{dateTimeBR(o.createdAt)} · {o.ocasiao}</span>
                  </div>
                  <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                </header>

                <ul className="order-items">
                  {o.itens.map((it, i) => (
                    <li key={i} className="order-item">
                      <Mockup image={it.imagem} logo={o.logo} placement={it.placement} alt={it.nome} className="order-thumb" />
                      <div className="order-item-info">
                        <span className="order-item-name">{it.nome}</span>
                        <span className="order-item-meta"><strong>{it.quantidade} un.</strong> · {it.cor}</span>
                        <span className="order-item-meta">Logo: {describePlacement(it.placement, o.logoAspect)}</span>
                        <span className="order-item-meta">{it.personalizacaoTipo}{it.personalizacaoOpcao ? ` (${it.personalizacaoOpcao})` : ''}: {brl(it.personalizacaoValor * it.quantidade)} <span className="muted">({brl(it.personalizacaoValor)}/un.)</span></span>
                      </div>
                    </li>
                  ))}
                </ul>

                <dl className="order-fin">
                  <div><dt>Custo total</dt><dd>{brl(t.custo)}</dd></div>
                  <div><dt>Frete (coleta + entrega)</dt><dd>{o.frete ? brl(t.frete) : `${brl(t.frete1)} + a combinar`}</dd></div>
                  <div><dt>Margem ({pct(t.margemPct)})</dt><dd>{t.divisorValido ? brl(t.margem) : '—'}</dd></div>
                  <div><dt>Taxa cartão ({pct(t.taxaPct)})</dt><dd>{t.divisorValido ? brl(t.taxaCartao) : '—'}</dd></div>
                  <div className="order-fin-total"><dt>Preço final</dt><dd>{t.divisorValido ? brl(t.total) : '—'}</dd></div>
                </dl>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
