import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/Store'
import type { Order, Product } from '../../types'
import { Wordmark } from '../../components/ui'
import { cotarItem } from '../../lib/pricing'
import { Mockup } from '../../components/Mockup'
import { dateBR } from '../../lib/format'
import {
  clearDraft, DEFAULT_PLACEMENT, initialState, linhasDe, loadDraft, qtdTotal, QTDS, saveDraft, SEM_EMBALAGEM, STEPS, type WizardState,
} from './wizardState'
import { coresDe } from '../../lib/colors'
import { mockupKey } from '../../services/mockupAI'
import { PERFIL_DEMO } from '../../data/perfil'
import { StepContexto, StepEmbalagem, StepEncaminhar, StepLogo, StepMensagem, StepProdutos } from './steps'

export type Patch = (p: Partial<WizardState> | ((cur: WizardState) => Partial<WizardState>)) => void

const WA_NUMBER = '5511977780505'

export default function Experience() {
  const { db, createOrder } = useStore()
  const [s, setS] = useState<WizardState>(() => loadDraft() ?? initialState())
  const [errors, setErrors] = useState<string[]>([])
  const [savedMsg, setSavedMsg] = useState('')
  const [done, setDone] = useState<Order | null>(null)
  const patch: Patch = (p) => setS((cur) => ({ ...cur, ...(typeof p === 'function' ? p(cur) : p) }))

  const products = db.products
  const selectedProducts = useMemo(
    () => s.selected.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[],
    [s.selected, products],
  )

  // Garante uma configuração para cada produto selecionado
  useEffect(() => {
    const def = QTDS.find((q) => q.val === s.qty)?.def ?? 50
    const missing = selectedProducts.filter((p) => !s.items[p.id])
    if (!missing.length) return
    setS((cur) => {
      const items = { ...cur.items }
      for (const p of missing) {
        items[p.id] = { placement: DEFAULT_PLACEMENT, personalizacaoId: p.personalizacaoIds[0] ?? null, cores: { [coresDe(p.cores)[0]]: def }, ia: {} }
      }
      return { ...cur, items }
    })
  }, [selectedProducts, s.items, s.qty])

  // Autosalva o rascunho
  useEffect(() => {
    if (!done) saveDraft(s)
  }, [s, done])

  const validate = (step: number): string[] => {
    const e: string[] = []
    if (step === 1) {
      if (!s.occ || (s.occ === 'outro' && !s.occOutro.trim())) e.push('Escolha ou descreva a ocasião.')
    }
    if (step === 2 && !s.selected.length) e.push('Selecione pelo menos um produto.')
    if (step === 3) {
      if (!s.logo) e.push('Envie a logo da sua marca.')
      selectedProducts.forEach((p) => {
        if (p.personalizacaoIds.length && !s.items[p.id]?.personalizacaoId) e.push(`Escolha a personalização de "${p.nome}".`)
        if (qtdTotal(s.items[p.id]) < 1) e.push(`Informe a quantidade de ao menos uma cor de "${p.nome}".`)
      })
    }
    if (step === 4 && !s.emb.length) e.push('Escolha ao menos uma opção de embalagem (ou "Sem embalagem adicional").')
    if (step === 5 && s.msg === 'sim' && !s.msgTxt.trim()) e.push('Escreva a mensagem do cartão ou escolha "Não por agora".')
    if (step === 6) {
      if (!s.contato.nome.trim()) e.push('Informe seu nome.')
      if (!/^\S+@\S+\.\S+$/.test(s.contato.email)) e.push('Informe um e-mail válido.')
      if (s.contato.telefone.replace(/\D/g, '').length < 10) e.push('Informe um telefone com DDD.')
      if (s.entrega.cep.replace(/\D/g, '').length !== 8) e.push('Informe o CEP de entrega.')
    }
    return e
  }

  const go = (to: number) => {
    if (to > s.step) {
      for (let st = s.step; st < to; st++) {
        const e = validate(st)
        if (e.length) {
          setErrors(e)
          if (st !== s.step) patch({ step: st })
          return
        }
      }
    }
    setErrors([])
    patch({ step: to })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = () => {
    const e = validate(6)
    if (e.length) return setErrors(e)
    const order = createOrder({
      ocasiao: s.occ === 'outro' ? s.occOutro : s.occ,
      destinatario: s.dest,
      quantidadeEstimada: s.qty,
      prazo: s.prazo,
      logo: s.logo,
      logoAspect: s.logoAspect,
      // uma linha por cor; a faixa de preço da personalização usa o total do produto (todas as cores)
      itens: selectedProducts.flatMap((p) => {
        const it = s.items[p.id]
        const pz = db.personalizations.find((z) => z.id === it.personalizacaoId)
        const cotacao = cotarItem(pz, null, qtdTotal(it))
        return linhasDe(it).map(({ cor, quantidade }) => {
          const ia = it.ia?.[cor]
          const atual = ia && ia.key === mockupKey(p.id, cor, it.placement, it.personalizacaoId, s.logo)
          return {
            productId: p.id, nome: p.nome, codigo: p.codigo, categoria: p.categoria, imagem: p.imagens[0] ?? '',
            valorUnidade: p.valor, quantidade, cor, placement: it.placement,
            ...cotacao,
            ...(atual ? { mockupIA: ia.img } : {}),
          }
        })
      }),
      embalagens: s.emb.filter((x) => x !== SEM_EMBALAGEM),
      cartao: s.msg === 'sim' ? { mensagem: s.msgTxt, assinatura: s.msgFrom } : null,
      contato: s.contato,
      entrega: s.entrega,
      frete: s.frete,
      observacoes: s.observacoes,
      margemPct: null,
      taxaCartaoPct: null,
      frete1: null,
      horas: null,
    })
    clearDraft()
    setDone(order)
    window.scrollTo({ top: 0 })
  }

  const restart = () => {
    setS(initialState())
    setDone(null)
    setErrors([])
  }

  const stepProps = { s, patch, products, selectedProducts, personalizations: db.personalizations, settings: db.settings }

  return (
    <div className="client">
      <header className="client-hdr">
        <Link to="/" className="client-brand" aria-label="Lonny Personalizados — início"><Wordmark /></Link>
        <span className="client-hdr-title"><span aria-hidden>✦</span> Monte sua Experiência</span>
        <span className="client-hdr-user" title={`${PERFIL_DEMO.email} · ${PERFIL_DEMO.empresa}`}>
          <span className="client-avatar" aria-hidden>{PERFIL_DEMO.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
          <span className="client-hdr-user-txt"><strong>{PERFIL_DEMO.nome}</strong><small>{PERFIL_DEMO.empresa}</small></span>
        </span>
        <Link to="/admin" className="client-hdr-admin">Área da administradora</Link>
      </header>

      {done ? (
        <Success order={done} onRestart={restart} />
      ) : (
        <div className="exp-layout">
          <main className="exp-left">
            <ol className="exp-progress" aria-label="Etapas">
              {STEPS.map((label, i) => {
                const n = i + 1
                const state = n === s.step ? 'current' : n < s.step ? 'done' : ''
                return (
                  <li key={label} className={state}>
                    <button type="button" onClick={() => go(n)} aria-current={n === s.step ? 'step' : undefined}>
                      <span className="exp-progress-n">{n < s.step ? '✓' : n}</span>
                      <span className="exp-progress-l">{label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>

            <section className="exp-step" key={s.step}>
              {s.step === 1 && <StepContexto {...stepProps} />}
              {s.step === 2 && <StepProdutos {...stepProps} />}
              {s.step === 3 && <StepLogo {...stepProps} />}
              {s.step === 4 && <StepEmbalagem {...stepProps} />}
              {s.step === 5 && <StepMensagem {...stepProps} />}
              {s.step === 6 && <StepEncaminhar {...stepProps} />}
            </section>

            {errors.length > 0 && (
              <div className="alert error" role="alert">
                <strong>Antes de continuar:</strong>
                <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}

            <nav className="exp-nav">
              <span className="exp-nav-info">{s.step} de {STEPS.length}</span>
              <div className="exp-nav-btns">
                {s.step > 1 && <button className="btn ghost" onClick={() => go(s.step - 1)}>← Anterior</button>}
                {s.step < STEPS.length
                  ? <button className="btn primary" onClick={() => go(s.step + 1)}>Próximo →</button>
                  : <button className="btn primary" onClick={submit}>Encaminhar pedido</button>}
              </div>
            </nav>
          </main>

          <Preview s={s} selectedProducts={selectedProducts} onSave={() => {
            setSavedMsg(saveDraft(s) ? '✓ Rascunho salvo neste navegador' : 'Não foi possível salvar o rascunho')
            setTimeout(() => setSavedMsg(''), 2500)
          }} savedMsg={savedMsg} />
        </div>
      )}
    </div>
  )
}

function Preview({ s, selectedProducts, onSave, savedMsg }: { s: WizardState; selectedProducts: Product[]; onSave: () => void; savedMsg: string }) {
  const occ = s.occ === 'outro' ? s.occOutro : s.occ
  const meta = [s.dest, s.qty, s.prazo && `até ${dateBR(s.prazo + 'T12:00')}`].filter(Boolean).join(' · ')
  const checks = [!!occ, s.selected.length > 0, !!s.logo, s.emb.length > 0, s.msg !== null, !!s.contato.nome && !!s.entrega.cep]
  return (
    <aside className="exp-right" aria-label="Resumo da experiência">
      <div className="exp-prev-hdr">
        <p className="exp-prev-title">Sua experiência</p>
        <p className="exp-prev-sub">O kit se forma em tempo real</p>
        <div className="pbar"><div className="pbar-fill" style={{ width: `${(s.step / STEPS.length) * 100}%` }} /></div>
        <p className="exp-prev-step">Passo {s.step} de {STEPS.length}</p>
      </div>
      <div className="exp-prev-body">
        {occ && (
          <div className="prev-block">
            <span className="prev-lbl">Ocasião</span>
            <p className="prev-val">{occ}</p>
            {meta && <p className="prev-meta">{meta}</p>}
          </div>
        )}
        <div className="prev-block">
          <span className="prev-lbl">Produtos {selectedProducts.length > 0 && <em>{selectedProducts.length}</em>}</span>
          {selectedProducts.length === 0 ? <p className="prev-empty">Nenhum produto ainda</p> : (
            <div className="prev-thumbs">
              {selectedProducts.map((p) => (
                <Mockup key={p.id} image={p.imagens[0]} logo={s.logo || undefined} placement={s.items[p.id]?.placement} alt={p.nome} className="prev-thumb"
                  ai={Object.values(s.items[p.id]?.ia ?? {})[0]?.img} />
              ))}
            </div>
          )}
        </div>
        {s.emb.length > 0 && (
          <div className="prev-block">
            <span className="prev-lbl">Embalagem</span>
            <div className="prev-pills">{s.emb.map((e) => <span key={e} className="pill sm">{e}</span>)}</div>
          </div>
        )}
        {s.msg === 'sim' && s.msgTxt && (
          <div className="prev-block">
            <span className="prev-lbl">Cartão personalizado</span>
            <p className="prev-msg">“{s.msgTxt}”{s.msgFrom && <><br />— {s.msgFrom}</>}</p>
          </div>
        )}
        {s.frete && (
          <div className="prev-block">
            <span className="prev-lbl">Frete</span>
            <p className="prev-val">Lalamove · {s.frete.label}</p>
          </div>
        )}
      </div>
      <div className="exp-prev-cta">
        <div className="score">
          <span>Completude</span>
          <span className="score-dots">{checks.map((c, i) => <i key={i} className={c ? 'on' : ''} />)}</span>
        </div>
        <button className="btn ghost block" onClick={onSave}>💾 Salvar rascunho</button>
        <p className="saved-msg" role="status">{savedMsg}</p>
      </div>
    </aside>
  )
}

function Success({ order, onRestart }: { order: Order; onRestart: () => void }) {
  const msg = `Olá! Acabei de enviar o pedido #${order.numero} pelo Monte sua Experiência (${order.contato.empresa || order.contato.nome}).`
  return (
    <div className="success">
      <div className="success-card">
        <span className="success-icon" aria-hidden>✓</span>
        <p className="eyebrow">Pedido #{order.numero}</p>
        <h1 className="display">Recebemos a sua <em>experiência</em></h1>
        <p className="lead">Nossa equipe vai revisar os mockups e retornar com a proposta completa em até 48 horas úteis no e-mail <strong>{order.contato.email}</strong>.</p>
        <div className="success-items">
          {order.itens.map((it) => (
            <figure key={`${it.productId}-${it.cor}`}>
              <Mockup image={it.imagem} logo={order.logo} placement={it.placement} alt={it.nome} ai={it.mockupIA} />
              <figcaption>{it.nome}<span>{it.quantidade} un. · {it.cor}</span></figcaption>
            </figure>
          ))}
        </div>
        <div className="success-btns">
          <a className="btn wa" href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
          <button className="btn ghost" onClick={onRestart}>Montar nova experiência</button>
        </div>
      </div>
    </div>
  )
}
