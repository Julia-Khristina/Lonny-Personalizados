import { useEffect, useState } from 'react'
import { useStore } from '../../store/Store'
import { Confirm, Field } from '../../components/ui'
import { PageHead } from './AdminLayout'
import { brl } from '../../lib/format'

export default function SettingsPage() {
  const { db, updateSettings, resetDemo } = useStore()
  const [s, setS] = useState(db.settings)
  const [saved, setSaved] = useState(false)
  const [reset, setReset] = useState(false)
  useEffect(() => setS(db.settings), [db.settings])

  const [err, setErr] = useState('')
  const save = () => {
    const next = {
      margemPct: Math.max(0, s.margemPct), taxaCartaoPct: Math.max(0, s.taxaCartaoPct),
      estoqueMinimo: Math.max(0, Math.round(s.estoqueMinimo)),
      valorHora: Math.max(0, s.valorHora), horasPadrao: Math.max(0, s.horasPadrao), frete1Padrao: Math.max(0, s.frete1Padrao),
    }
    if (next.margemPct + next.taxaCartaoPct >= 100) return setErr('Margem + taxa do cartão precisam somar menos de 100%.')
    setErr('')
    updateSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const exemplo = 1000 / (1 - s.margemPct / 100 - s.taxaCartaoPct / 100)

  return (
    <>
      <PageHead title="Configurações" sub="Valores padrão usados no cálculo de todos os pedidos" />
      <section className="panel narrow">
        <p className="field-hint formula-box">
          <strong>Custo</strong> = (Qtd × custo do item) + (Qtd × custo da personalização) + (Frete 1 + Frete 2) + (Horas × valor da hora)<br />
          <strong>Preço final</strong> = Custo ÷ (1 − Margem − Taxa do cartão)
        </p>
        <Field label="Margem de lucro padrão (%)" hint={Number.isFinite(exemplo) && exemplo > 0 ? `Porcentagem do preço final. Ex.: custo de R$ 1.000 → preço de ${brl(exemplo)}.` : 'Porcentagem do preço final.'} error={err || undefined}>
          {(id) => <input id={id} className="input" type="number" min={0} step="0.1" value={s.margemPct} onChange={(e) => setS({ ...s, margemPct: Number(e.target.value) })} />}
        </Field>
        <Field label="Taxa de cartão de crédito (%)" hint="Porcentagem do preço final.">
          {(id) => <input id={id} className="input" type="number" min={0} step="0.01" value={s.taxaCartaoPct} onChange={(e) => setS({ ...s, taxaCartaoPct: Number(e.target.value) })} />}
        </Field>
        <Field label="Valor da hora de produção (R$)" hint="Mão de obra de montagem, personalização e conferência.">
          {(id) => <input id={id} className="input" type="number" min={0} step="0.5" value={s.valorHora} onChange={(e) => setS({ ...s, valorHora: Number(e.target.value) })} />}
        </Field>
        <Field label="Horas por pedido (padrão)" hint="Estimativa usada na tela do cliente; ajustável em cada pedido.">
          {(id) => <input id={id} className="input" type="number" min={0} step="0.5" value={s.horasPadrao} onChange={(e) => setS({ ...s, horasPadrao: Number(e.target.value) })} />}
        </Field>
        <Field label="Frete 1 · coleta padrão (R$)" hint="Fornecedor → Lonny. O Frete 2 (entrega ao cliente) vem da cotação Lalamove.">
          {(id) => <input id={id} className="input" type="number" min={0} step="0.01" value={s.frete1Padrao} onChange={(e) => setS({ ...s, frete1Padrao: Number(e.target.value) })} />}
        </Field>
        <Field label="Estoque mínimo (un.)" hint='Produtos com estoque igual ou abaixo deste valor aparecem em "Produtos acabando".'>
          {(id) => <input id={id} className="input" type="number" min={0} value={s.estoqueMinimo} onChange={(e) => setS({ ...s, estoqueMinimo: Number(e.target.value) })} />}
        </Field>
        <div className="row-end">
          <span className="saved-msg" role="status">{saved ? '✓ Salvo' : ''}</span>
          <button className="btn primary" onClick={save}>Salvar configurações</button>
        </div>
      </section>

      <section className="panel narrow danger-zone">
        <h2 className="panel-title">Dados de demonstração</h2>
        <p className="muted small">Apaga tudo o que foi cadastrado neste navegador e restaura os dados de exemplo.</p>
        <button className="btn danger" onClick={() => setReset(true)}>Restaurar dados de exemplo</button>
      </section>
      <Confirm open={reset} title="Restaurar dados de exemplo" confirmLabel="Restaurar" onClose={() => setReset(false)}
        onConfirm={resetDemo}
        message="Todos os produtos, fornecedores, personalizações e pedidos deste navegador serão substituídos pelos dados de exemplo." />
    </>
  )
}
