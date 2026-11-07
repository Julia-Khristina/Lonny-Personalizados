import { Link } from 'react-router-dom'
import { useStore } from '../../store/Store'
import { PageHead } from './AdminLayout'

const DAY = 86_400_000

export default function Dashboard() {
  const { db } = useStore()
  const now = new Date()
  const t = now.getTime()
  const orders = db.orders

  const semana = orders.filter((o) => t - new Date(o.createdAt).getTime() <= 7 * DAY).length
  const inMonth = (d: Date, y: number, m: number) => d.getFullYear() === y && d.getMonth() === m
  const mesAtual = orders.filter((o) => inMonth(new Date(o.createdAt), now.getFullYear(), now.getMonth())).length
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const mesAnterior = orders.filter((o) => inMonth(new Date(o.createdAt), prev.getFullYear(), prev.getMonth())).length
  const crescimento = mesAnterior === 0 ? null : ((mesAtual - mesAnterior) / mesAnterior) * 100

  const acabando = db.products.filter((p) => p.estoque <= db.settings.estoqueMinimo).sort((a, b) => a.estoque - b.estoque)
  const novos = orders.filter((o) => o.status === 'novo').length
  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <>
      <PageHead title={<>Olá! Aqui está o <em>resumo</em></>} sub={now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} />

      {novos > 0 && (
        <Link to="/admin/pedidos" className="banner-new">
          <span className="pulse" aria-hidden />
          <span>Você tem <strong>{novos} pedido{novos > 1 ? 's' : ''} novo{novos > 1 ? 's' : ''}</strong> aguardando na fila →</span>
        </Link>
      )}

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-lbl">Encomendas na semana</span>
          <span className="kpi-val">{semana}</span>
          <span className="kpi-meta">últimos 7 dias</span>
        </div>
        <div className="kpi">
          <span className="kpi-lbl">Encomendas no mês</span>
          <span className="kpi-val">{mesAtual}</span>
          <span className="kpi-meta">{mesNome} · mês anterior: {mesAnterior}</span>
        </div>
        <div className="kpi">
          <span className="kpi-lbl">Crescimento no mês</span>
          <span className={`kpi-val ${!crescimento ? '' : crescimento > 0 ? 'up' : 'down'}`}>
            {crescimento === null ? '—' : `${crescimento > 0 ? '▲ ' : crescimento < 0 ? '▼ ' : ''}${Math.abs(crescimento).toFixed(0)}%`}
          </span>
          <span className="kpi-meta">{crescimento === null ? 'sem pedidos no mês anterior' : 'comparado ao mês anterior'}</span>
        </div>
        <div className="kpi kpi-stock">
          <span className="kpi-lbl">Produtos acabando</span>
          <span className="kpi-row">
            <span className={`kpi-val ${acabando.length ? 'down' : ''}`}>{acabando.length}</span>
            <span className="kpi-meta">com {db.settings.estoqueMinimo} un. ou menos</span>
          </span>
          {acabando.length === 0 ? (
            <span className="kpi-meta">Estoque em dia 👍</span>
          ) : (
            <>
              <ul className="stock-list">
                {acabando.slice(0, 3).map((p) => {
                  const nivel = Math.max(4, Math.min(100, (p.estoque / Math.max(1, db.settings.estoqueMinimo)) * 100))
                  return (
                    <li key={p.id}>
                      <Link to={`/admin/produtos?q=${encodeURIComponent(p.codigo)}`} className="stock-item" title={`${p.nome} · ${p.estoque} un. em estoque`}>
                        {p.imagens[0] ? <img src={p.imagens[0]} alt="" /> : <span className="stock-thumb" />}
                        <span className="stock-info">
                          <span className="stock-name">{p.nome}</span>
                          <span className="stock-bar" aria-hidden><i style={{ width: `${nivel}%` }} className={p.estoque <= db.settings.estoqueMinimo / 2 ? 'crit' : ''} /></span>
                        </span>
                        <strong className="stock-qty">{p.estoque}<small> un.</small></strong>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <Link to="/admin/produtos" className="stock-more">{acabando.length > 3 ? `Ver todos os ${acabando.length} →` : 'Ver em Produtos →'}</Link>
            </>
          )}
        </div>
      </div>

      <section className="guide">
        <h2 className="section-title">Como usar a <em>plataforma</em></h2>
        <div className="guide-grid">
          <Guide n="1" title="Acompanhe os pedidos" to="/admin/pedidos">
            Os pedidos chegam em fila, do mais antigo para o mais novo. Abra um card para ver o orçamento completo, baixar o PDF com a logo e mudar o status (Novo → Em produção → Enviado → Concluído).
          </Guide>
          <Guide n="2" title="Mantenha os produtos em dia" to="/admin/produtos">
            Cadastre código, nome, imagens, descrição, estoque, cores e valor. Marque quais personalizações cada produto aceita — só elas aparecem para o cliente.
          </Guide>
          <Guide n="3" title="Cadastre as personalizações" to="/admin/personalizacao">
            Defina cada técnica (serigrafia, laser, bordado…) e o valor por unidade. Esse valor entra automaticamente no cálculo de cada pedido.
          </Guide>
          <Guide n="4" title="Organize os fornecedores" to="/admin/fornecedores">
            Guarde nome, endereço, telefone e e-mail e vincule cada produto ao seu fornecedor.
          </Guide>
          <Guide n="5" title="Ajuste margem e taxas" to="/admin/configuracoes">
            Defina a margem de lucro e a taxa de cartão padrão, e o estoque mínimo que dispara o alerta de "produtos acabando". Dá para ajustar a margem em cada pedido.
          </Guide>
          <Guide n="6" title="PDF para o Illustrator" to="/admin/pedidos">
            No detalhe do pedido, baixe o PDF com a foto e a logo posicionada. Os dois são objetos separados: abra no Illustrator e substitua a logo pelo vetor final.
          </Guide>
        </div>
      </section>
    </>
  )
}

function Guide({ n, title, to, children }: { n: string; title: string; to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="guide-card">
      <span className="guide-n">{n.padStart(2, '0')}</span>
      <span className="guide-title">{title}</span>
      <span className="guide-desc">{children}</span>
    </Link>
  )
}
