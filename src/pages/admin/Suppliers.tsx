import { useState } from 'react'
import { uid, useStore } from '../../store/Store'
import type { Supplier } from '../../types'
import { Confirm, Empty, Field, Modal } from '../../components/ui'
import { PageHead } from './AdminLayout'

const empty = (): Supplier => ({ id: '', nome: '', endereco: '', telefone: '', email: '' })

export default function Suppliers() {
  const { db, upsert, remove } = useStore()
  const [edit, setEdit] = useState<Supplier | null>(null)
  const [del, setDel] = useState<Supplier | null>(null)
  const linked = (id: string) => db.products.filter((p) => p.fornecedorId === id).length

  return (
    <>
      <PageHead title="Fornecedores" sub={`${db.suppliers.length} fornecedores`}
        actions={<button className="btn primary" onClick={() => setEdit(empty())}>+ Novo fornecedor</button>} />

      {db.suppliers.length === 0 ? <Empty title="Nenhum fornecedor cadastrado" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nome</th><th>Endereço</th><th>Telefone</th><th>E-mail</th><th className="num">Produtos</th><th><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>
              {db.suppliers.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.nome}</strong></td>
                  <td>{s.endereco}</td>
                  <td className="nowrap"><a href={`tel:${s.telefone.replace(/\D/g, '')}`}>{s.telefone}</a></td>
                  <td><a href={`mailto:${s.email}`}>{s.email}</a></td>
                  <td className="num">{linked(s.id)}</td>
                  <td className="actions">
                    <button className="btn ghost sm" onClick={() => setEdit(s)}>Editar</button>
                    <button className="btn ghost sm danger-text" onClick={() => setDel(s)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && <SupplierForm initial={edit} onClose={() => setEdit(null)} onSave={(s) => { upsert('suppliers', s); setEdit(null) }} />}
      <Confirm open={!!del} title="Excluir fornecedor" onClose={() => setDel(null)} onConfirm={() => del && remove('suppliers', del.id)}
        message={<>Excluir <strong>{del?.nome}</strong>?{del && linked(del.id) > 0 && <> {linked(del.id)} produto(s) ficarão sem fornecedor.</>}</>} />
    </>
  )
}

function SupplierForm({ initial, onClose, onSave }: { initial: Supplier; onClose: () => void; onSave: (s: Supplier) => void }) {
  const [s, setS] = useState(initial)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const set = (c: Partial<Supplier>) => setS((cur) => ({ ...cur, ...c }))
  const submit = () => {
    const e: Record<string, string> = {}
    if (!s.nome.trim()) e.nome = 'Informe o nome.'
    if (s.email && !/^\S+@\S+\.\S+$/.test(s.email)) e.email = 'E-mail inválido.'
    setErrs(e)
    if (!Object.keys(e).length) onSave({ ...s, id: s.id || uid('sp'), nome: s.nome.trim() })
  }
  return (
    <Modal open title={initial.id ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={submit}>Salvar</button></>}>
      <Field label="Nome" error={errs.nome}>{(id) => <input id={id} className="input" value={s.nome} onChange={(e) => set({ nome: e.target.value })} />}</Field>
      <Field label="Endereço">{(id) => <input id={id} className="input" value={s.endereco} onChange={(e) => set({ endereco: e.target.value })} />}</Field>
      <div className="form-grid">
        <Field label="Telefone">{(id) => <input id={id} className="input" type="tel" value={s.telefone} onChange={(e) => set({ telefone: e.target.value })} />}</Field>
        <Field label="E-mail" error={errs.email}>{(id) => <input id={id} className="input" type="email" value={s.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
      </div>
    </Modal>
  )
}
