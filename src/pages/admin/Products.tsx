import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { uid, useStore } from '../../store/Store'
import type { Product } from '../../types'
import { Badge, Confirm, Empty, Field, Modal, TagInput } from '../../components/ui'
import { brl } from '../../lib/format'
import { precoMinimo } from '../../lib/pricing'
import { fileToDataUrl } from '../../lib/image'
import { PageHead } from './AdminLayout'

const empty = (): Product => ({
  id: '', codigo: '', nome: '', categoria: '', descricao: '', estoque: 0, cores: [], valor: 0,
  imagens: [], fornecedorId: null, personalizacaoIds: [],
})

export default function Products() {
  const { db, upsert, remove } = useStore()
  const [params] = useSearchParams()
  const [q, setQ] = useState(() => params.get('q') ?? '') // ?q= vem de links do painel (ex.: produtos acabando)
  const [edit, setEdit] = useState<Product | null>(null)
  const [del, setDel] = useState<Product | null>(null)

  const list = useMemo(() => {
    const n = q.toLowerCase()
    return db.products.filter((p) => !n || `${p.codigo} ${p.nome} ${p.categoria}`.toLowerCase().includes(n))
  }, [db.products, q])

  const supplierName = (id: string | null) => db.suppliers.find((s) => s.id === id)?.nome ?? '—'
  const pzName = (id: string) => db.personalizations.find((z) => z.id === id)?.tipo

  return (
    <>
      <PageHead title="Produtos" sub={`${db.products.length} produtos cadastrados`}
        actions={<button className="btn primary" onClick={() => setEdit(empty())}>+ Novo produto</button>} />

      <div className="table-tools">
        <input className="input search" type="search" placeholder="Buscar por código, nome ou categoria…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produtos" />
      </div>

      {list.length === 0 ? <Empty title="Nenhum produto encontrado">Ajuste a busca ou cadastre um novo produto.</Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th><th>Código</th><th>Cores</th><th className="num">Estoque</th><th className="num">Valor</th>
                <th>Personalizações</th><th>Fornecedor</th><th><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-prod">
                      {p.imagens[0] ? <img src={p.imagens[0]} alt="" /> : <span className="thumb-empty" />}
                      <div><strong>{p.nome}</strong><span className="muted small">{p.categoria}</span></div>
                    </div>
                  </td>
                  <td className="mono">{p.codigo}</td>
                  <td>{p.cores.join(', ') || '—'}</td>
                  <td className="num">
                    <span className={p.estoque <= db.settings.estoqueMinimo ? 'low-stock' : ''}>{p.estoque}</span>
                  </td>
                  <td className="num">{brl(p.valor)}</td>
                  <td><div className="tags">{p.personalizacaoIds.map((id) => <Badge key={id}>{pzName(id)}</Badge>)}</div></td>
                  <td>{supplierName(p.fornecedorId)}</td>
                  <td className="actions">
                    <button className="btn ghost sm" onClick={() => setEdit(p)}>Editar</button>
                    <button className="btn ghost sm danger-text" onClick={() => setDel(p)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && <ProductForm initial={edit} onClose={() => setEdit(null)} onSave={(p) => { upsert('products', p); setEdit(null) }} />}
      <Confirm open={!!del} title="Excluir produto" onClose={() => setDel(null)} onConfirm={() => del && remove('products', del.id)}
        message={<>Tem certeza que deseja excluir <strong>{del?.nome}</strong>? Pedidos já feitos não são afetados.</>} />
    </>
  )
}

function ProductForm({ initial, onClose, onSave }: { initial: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const { db } = useStore()
  const [p, setP] = useState<Product>(initial)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const set = (c: Partial<Product>) => setP((cur) => ({ ...cur, ...c }))
  const isNew = !initial.id
  const categorias = Array.from(new Set(db.products.map((x) => x.categoria))).sort()

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const out: string[] = []
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue
        out.push((await fileToDataUrl(f, 1000, 'image/jpeg')).dataUrl)
      }
      set({ imagens: [...p.imagens, ...out] })
    } finally {
      setUploading(false)
    }
  }

  const submit = () => {
    const e: Record<string, string> = {}
    if (!p.codigo.trim()) e.codigo = 'Informe o código.'
    else if (db.products.some((x) => x.codigo.toLowerCase() === p.codigo.trim().toLowerCase() && x.id !== p.id)) e.codigo = 'Já existe um produto com este código.'
    if (!p.nome.trim()) e.nome = 'Informe o nome.'
    if (p.estoque < 0) e.estoque = 'Estoque não pode ser negativo.'
    if (p.valor < 0) e.valor = 'Valor não pode ser negativo.'
    setErrs(e)
    if (Object.keys(e).length) return
    onSave({ ...p, id: p.id || uid('pr'), codigo: p.codigo.trim(), nome: p.nome.trim(), categoria: p.categoria.trim() || 'Outros' })
  }

  const move = (i: number, dir: -1 | 1) => {
    const imgs = [...p.imagens]
    const j = i + dir
    if (j < 0 || j >= imgs.length) return
    ;[imgs[i], imgs[j]] = [imgs[j], imgs[i]]
    set({ imagens: imgs })
  }

  return (
    <Modal open wide title={isNew ? 'Novo produto' : `Editar · ${initial.nome}`} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={submit} disabled={uploading}>Salvar produto</button></>}>
      <div className="form-grid">
        <Field label="Código" error={errs.codigo}>{(id) => <input id={id} className="input" value={p.codigo} onChange={(e) => set({ codigo: e.target.value })} />}</Field>
        <Field label="Nome" error={errs.nome}>{(id) => <input id={id} className="input" value={p.nome} onChange={(e) => set({ nome: e.target.value })} />}</Field>
        <Field label="Categoria">
          {(id) => <>
            <input id={id} className="input" list="cat-list" value={p.categoria} onChange={(e) => set({ categoria: e.target.value })} />
            <datalist id="cat-list">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </>}
        </Field>
        <Field label="Fornecedor">
          {(id) => (
            <select id={id} className="input" value={p.fornecedorId ?? ''} onChange={(e) => set({ fornecedorId: e.target.value || null })}>
              <option value="">— Sem fornecedor —</option>
              {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          )}
        </Field>
        <Field label="Estoque (un.)" error={errs.estoque}>{(id) => <input id={id} className="input" type="number" min={0} value={p.estoque} onChange={(e) => set({ estoque: Number(e.target.value) })} />}</Field>
        <Field label="Valor por unidade (R$)" error={errs.valor}>{(id) => <input id={id} className="input" type="number" min={0} step="0.01" value={p.valor} onChange={(e) => set({ valor: Number(e.target.value) })} />}</Field>
      </div>
      <Field label="Cores disponíveis" hint="Digite a cor e pressione Enter.">
        {(id) => <TagInput id={id} value={p.cores} onChange={(cores) => set({ cores })} placeholder="Ex.: Preto, Branco…" />}
      </Field>
      <Field label="Descrição">{(id) => <textarea id={id} className="input" rows={3} value={p.descricao} onChange={(e) => set({ descricao: e.target.value })} />}</Field>

      <fieldset className="group">
        <legend className="label">Personalizações que o produto suporta</legend>
        {db.personalizations.length === 0 ? <p className="muted small">Cadastre tipos em Personalização primeiro.</p> : (
          <div className="check-grid">
            {db.personalizations.map((z) => {
              const on = p.personalizacaoIds.includes(z.id)
              return (
                <label key={z.id} className={`check-row${on ? ' on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => set({ personalizacaoIds: on ? p.personalizacaoIds.filter((x) => x !== z.id) : [...p.personalizacaoIds, z.id] })} />
                  <span>{z.tipo}</span>
                  <span className="muted small">{z.codigo} · a partir de {brl(precoMinimo(z))}/un.</span>
                </label>
              )
            })}
          </div>
        )}
      </fieldset>

      <fieldset className="group">
        <legend className="label">Imagens <span className="muted small">— a primeira é a principal e é usada no mockup</span></legend>
        <div className="img-grid">
          {p.imagens.map((src, i) => (
            <div key={i} className={`img-item${i === 0 ? ' main' : ''}`}>
              <img src={src} alt={`Imagem ${i + 1}`} />
              {i === 0 && <span className="img-main-tag">Principal</span>}
              <div className="img-actions">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda">←</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === p.imagens.length - 1} aria-label="Mover para a direita">→</button>
                <button type="button" onClick={() => set({ imagens: p.imagens.filter((_, j) => j !== i) })} aria-label="Remover imagem">✕</button>
              </div>
            </div>
          ))}
          <label className="img-add">
            <input type="file" accept="image/*" multiple onChange={(e) => { addImages(e.target.files); e.target.value = '' }} />
            <span>{uploading ? 'Enviando…' : '+ Adicionar imagens'}</span>
          </label>
        </div>
      </fieldset>
    </Modal>
  )
}
