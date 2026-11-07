import { useState } from 'react'
import { uid, useStore } from '../../store/Store'
import type { Personalization, PersonalizationOption } from '../../types'
import { Badge, Confirm, Empty, Field, Modal } from '../../components/ui'
import { brl } from '../../lib/format'
import { agruparOpcoes, precoMinimo, quantidadesDe } from '../../lib/pricing'
import { PageHead } from './AdminLayout'

const QTDS_PADRAO = [1, 10, 25, 50, 100, 250, 500, 1000]

const empty = (): Personalization => ({
  id: '', codigo: '', tipo: '',
  opcoes: [{ id: uid('op'), area: null, cores: 1, faixas: [] }],
})

export default function Personalizations() {
  const { db, upsert, remove } = useStore()
  const [edit, setEdit] = useState<Personalization | null>(null)
  const [view, setView] = useState<Personalization | null>(null)
  const [del, setDel] = useState<Personalization | null>(null)
  const used = (id: string) => db.products.filter((p) => p.personalizacaoIds.includes(id)).length

  return (
    <>
      <PageHead title="Personalização" sub="Técnicas e preço por peça conforme a quantidade, a área e o número de cores"
        actions={<button className="btn primary" onClick={() => setEdit(empty())}>+ Nova personalização</button>} />

      {db.personalizations.length === 0 ? <Empty title="Nenhuma personalização cadastrada" /> : (
        <div className="pz-grid">
          {db.personalizations.map((z) => (
            <article key={z.id} className="pz-card">
              <div className="pz-top"><span className="pz-type">{z.tipo}</span>{z.codigo && <Badge>{z.codigo}</Badge>}</div>
              <span className="pz-val"><small className="pz-from">a partir de</small>{brl(precoMinimo(z))}<small>/peça</small></span>
              <span className="muted small">{resumoOpcoes(z)} · {quantidadesDe(z.opcoes).length} faixas de quantidade</span>
              <span className="muted small">Disponível em {used(z.id)} produto(s)</span>
              <div className="pz-actions">
                <button className="btn dark sm" onClick={() => setView(z)}>Ver tabela</button>
                <button className="btn ghost sm" onClick={() => setEdit(z)}>Editar</button>
                <button className="btn ghost sm danger-text" onClick={() => setDel(z)}>Excluir</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="field-hint mt-8">Preço por peça, válido a partir da quantidade indicada. Áreas superiores sob consulta.</p>

      {view && (
        <Modal open wide title={`${view.codigo ? `${view.codigo} · ` : ''}${view.tipo}`} onClose={() => setView(null)}>
          <PriceTable pz={view} />
        </Modal>
      )}
      {edit && <PzForm initial={edit} onClose={() => setEdit(null)} onSave={(z) => { upsert('personalizations', z); setEdit(null) }} />}
      <Confirm open={!!del} title="Excluir personalização" onClose={() => setDel(null)} onConfirm={() => del && remove('personalizations', del.id)}
        message={<>Excluir <strong>{del?.tipo}</strong>?{del && used(del.id) > 0 && <> Ela será removida de {used(del.id)} produto(s).</>} Pedidos já feitos mantêm o valor original.</>} />
    </>
  )
}

function resumoOpcoes(z: Personalization) {
  const areas = new Set(z.opcoes.map((o) => o.area).filter(Boolean)).size
  const cores = Math.max(0, ...z.opcoes.map((o) => o.cores ?? 0))
  const partes = []
  if (areas) partes.push(`${areas} ${areas > 1 ? 'áreas' : 'área'}`)
  if (cores) partes.push(`até ${cores} ${cores > 1 ? 'cores' : 'cor'}`)
  return partes.join(' · ') || `${z.opcoes.length} opção(ões)`
}

/** Seletor de área (quando a técnica é por cor e tem várias áreas). */
function AreaTabs({ areas, value, onChange }: { areas: string[]; value: number; onChange: (i: number) => void }) {
  if (areas.length < 2) return areas[0] ? <p className="pz-area">Área: <strong>{areas[0]}</strong></p> : null
  return (
    <div className="tabs" role="tablist" aria-label="Área de gravação">
      {areas.map((a, i) => (
        <button key={a || i} role="tab" aria-selected={i === value} className={`tab${i === value ? ' on' : ''}`} onClick={() => onChange(i)}>{a || 'Sem área'}</button>
      ))}
    </div>
  )
}

function PriceTable({ pz }: { pz: Personalization }) {
  const { grupos, coluna } = agruparOpcoes(pz.opcoes)
  const [g, setG] = useState(0)
  const grupo = grupos[Math.min(g, grupos.length - 1)]
  if (!grupo) return <p className="muted">Sem preços cadastrados.</p>
  const qtds = quantidadesDe(grupo.opcoes)
  return (
    <>
      <AreaTabs areas={grupos.map((x) => x.area)} value={g} onChange={setG} />
      <div className="table-wrap price-wrap">
        <table className="table price-table">
          <thead>
            <tr><th>A partir de</th>{grupo.opcoes.map((o) => <th key={o.id} className="num">{coluna(o)}</th>)}</tr>
          </thead>
          <tbody>
            {qtds.map((q) => (
              <tr key={q}>
                <td className="tnum">{q.toLocaleString('pt-BR')} un.</td>
                {grupo.opcoes.map((o) => {
                  const f = o.faixas.find((x) => x.qtdMin === q)
                  return <td key={o.id} className="num">{f ? brl(f.preco) : '—'}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Editor: grade de preços (linhas = quantidade mínima, colunas = opções) ── */
interface Draft {
  codigo: string
  tipo: string
  qtds: number[]
  opcoes: { id: string; area: string; cores: string; precos: Record<number, string> }[]
}

function toDraft(z: Personalization): Draft {
  const qtds = quantidadesDe(z.opcoes)
  return {
    codigo: z.codigo,
    tipo: z.tipo,
    qtds: qtds.length ? qtds : QTDS_PADRAO,
    opcoes: z.opcoes.map((o) => ({
      id: o.id,
      area: o.area ?? '',
      cores: o.cores ? String(o.cores) : '',
      precos: Object.fromEntries(o.faixas.map((f) => [f.qtdMin, String(f.preco)])),
    })),
  }
}

function PzForm({ initial, onClose, onSave }: { initial: Personalization; onClose: () => void; onSave: (z: Personalization) => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(initial))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [novaQtd, setNovaQtd] = useState('')
  const [g, setG] = useState(0)

  const draftOptions: PersonalizationOption[] = d.opcoes.map((o) => ({ id: o.id, area: o.area.trim() || null, cores: Number(o.cores) || null, faixas: [] }))
  const { grupos, coluna } = agruparOpcoes(draftOptions)
  const grupo = grupos[Math.min(g, grupos.length - 1)]
  const visiveis = new Set(grupo?.opcoes.map((o) => o.id))

  const setOp = (id: string, c: Partial<Draft['opcoes'][number]>) => setD({ ...d, opcoes: d.opcoes.map((o) => (o.id === id ? { ...o, ...c } : o)) })
  const setPreco = (id: string, q: number, v: string) => setD({ ...d, opcoes: d.opcoes.map((o) => (o.id === id ? { ...o, precos: { ...o.precos, [q]: v } } : o)) })
  const addQtd = () => {
    const q = Math.floor(Number(novaQtd))
    if (!(q >= 1) || d.qtds.includes(q)) return
    setD({ ...d, qtds: [...d.qtds, q].sort((a, b) => a - b) })
    setNovaQtd('')
  }
  const addOpcao = () => {
    const base = d.opcoes[d.opcoes.length - 1]
    setD({ ...d, opcoes: [...d.opcoes, { id: uid('op'), area: grupo?.area ?? base?.area ?? '', cores: base?.cores ? String(Number(base.cores) + 1) : '', precos: {} }] })
  }

  const submit = () => {
    const e: Record<string, string> = {}
    if (!d.tipo.trim()) e.tipo = 'Informe o nome da técnica.'
    if (!d.opcoes.length) e.grade = 'Inclua ao menos uma opção.'
    const opcoes: PersonalizationOption[] = d.opcoes.map((o) => ({
      id: o.id,
      area: o.area.trim() || null,
      cores: Number(o.cores) > 0 ? Math.floor(Number(o.cores)) : null,
      faixas: d.qtds
        .filter((q) => o.precos[q] !== undefined && o.precos[q] !== '' && Number(o.precos[q]) >= 0)
        .map((q) => ({ qtdMin: q, preco: Math.round(Number(o.precos[q]) * 100) / 100 })),
    }))
    if (opcoes.some((o) => o.faixas.length === 0)) e.grade = 'Cada opção precisa de ao menos um preço.'
    setErrs(e)
    if (!Object.keys(e).length) onSave({ id: initial.id || uid('pz'), codigo: d.codigo.trim().toUpperCase(), tipo: d.tipo.trim(), opcoes })
  }

  return (
    <Modal open wide title={initial.id ? 'Editar personalização' : 'Nova personalização'} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={submit}>Salvar</button></>}>
      <div className="form-grid">
        <Field label="Nome da técnica" error={errs.tipo}>{(id) => <input id={id} className="input" placeholder="Ex.: Silk Screen" value={d.tipo} onChange={(e) => setD({ ...d, tipo: e.target.value })} />}</Field>
        <Field label="Código" hint="Código da tabela do fornecedor (opcional).">{(id) => <input id={id} className="input" placeholder="Ex.: SCR2" value={d.codigo} onChange={(e) => setD({ ...d, codigo: e.target.value })} />}</Field>
      </div>

      <p className="label">Preço por peça</p>
      <p className="field-hint" style={{ marginTop: -6, marginBottom: 12 }}>Cada linha vale a partir da quantidade indicada. Deixe em branco o que não se aplica.</p>
      <AreaTabs areas={grupos.map((x) => x.area)} value={g} onChange={setG} />
      {errs.grade && <p className="field-error">{errs.grade}</p>}
      <div className="table-wrap price-wrap">
        <table className="table price-table edit">
          <thead>
            <tr>
              <th>A partir de</th>
              {d.opcoes.filter((o) => visiveis.has(o.id)).map((o) => (
                <th key={o.id}>
                  <div className="price-col">
                    <input className="input sm" aria-label="Área" placeholder="Área (ex.: 25 × 70 mm)" value={o.area} onChange={(e) => setOp(o.id, { area: e.target.value })} />
                    <input className="input sm" aria-label="Nº de cores" placeholder="Cores" type="number" min={0} value={o.cores} onChange={(e) => setOp(o.id, { cores: e.target.value })} />
                    <button className="icon-btn" title="Remover opção" aria-label={`Remover opção ${coluna(draftOptions.find((x) => x.id === o.id)!)}`} onClick={() => setD({ ...d, opcoes: d.opcoes.filter((x) => x.id !== o.id) })}>✕</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.qtds.map((q) => (
              <tr key={q}>
                <td className="nowrap">
                  {q.toLocaleString('pt-BR')} un.
                  <button className="icon-btn sm" title="Remover faixa" aria-label={`Remover faixa de ${q} unidades`} onClick={() => setD({ ...d, qtds: d.qtds.filter((x) => x !== q) })}>✕</button>
                </td>
                {d.opcoes.filter((o) => visiveis.has(o.id)).map((o) => (
                  <td key={o.id}>
                    <input className="input sm price-in" type="number" min={0} step="0.01" inputMode="decimal" aria-label={`Preço a partir de ${q} un.`}
                      value={o.precos[q] ?? ''} onChange={(e) => setPreco(o.id, q, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="price-tools">
        <input className="input sm" type="number" min={1} placeholder="Qtd. mínima" aria-label="Nova faixa: quantidade mínima" value={novaQtd}
          onChange={(e) => setNovaQtd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQtd()} />
        <button className="btn ghost sm" onClick={addQtd}>+ Faixa</button>
        <button className="btn ghost sm" onClick={addOpcao}>+ Opção (área / cores)</button>
      </div>
    </Modal>
  )
}
