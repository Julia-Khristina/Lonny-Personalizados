import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FreightQuote, Personalization, Product, Settings } from '../../types'
import type { Patch } from './Experience'
import { DESTINOS, EMBALAGENS, linhasDe, OCASIOES, qtdTotal, QTDS, SEM_EMBALAGEM, type ItemConfig, type WizardState } from './wizardState'
import { Field } from '../../components/ui'
import { LogoPlacer, Mockup } from '../../components/Mockup'
import { fileToDataUrl } from '../../lib/image'
import { brl, calcTotals, precoDe, valorFinalLinha } from '../../lib/format'
import { cotarItem, precoMinimo } from '../../lib/pricing'
import { coresDe, swatch } from '../../lib/colors'
import { formatCep, FreightError, quoteFreight } from '../../services/freight'
import { gerarPreviaIA, MockupAIError, mockupKey } from '../../services/mockupAI'
import { PERFIL_DEMO } from '../../data/perfil'

interface StepProps {
  s: WizardState
  patch: Patch
  products: Product[]
  selectedProducts: Product[]
  personalizations: Personalization[]
  settings: Settings
}

function StepHead({ n, tag, title, lead }: { n: number; tag: string; title: ReactNode; lead: string }) {
  return (
    <>
      <p className="eyebrow">Passo {n} de 6 · {tag}</p>
      <h1 className="display">{title}</h1>
      <p className="lead">{lead}</p>
    </>
  )
}

/* ── 1 · Contexto ─────────────────────────── */
export function StepContexto({ s, patch }: StepProps) {
  return (
    <>
      <StepHead n={1} tag="Contexto" title={<>Qual é a <em>ocasião</em>?</>} lead="Cada experiência começa com um propósito. Escolha abaixo ou descreva a sua." />
      <div className="group">
        <div className="occ-grid" role="radiogroup" aria-label="Ocasião">
          {OCASIOES.map((o) => (
            <button key={o.val} type="button" role="radio" aria-checked={s.occ === o.val}
              className={`occ-card${s.occ === o.val ? ' on' : ''}`} onClick={() => patch({ occ: o.val })}>
              <span className="occ-icon" aria-hidden>{o.icon}</span>
              <span>{o.label ?? o.val}</span>
            </button>
          ))}
        </div>
        {s.occ === 'outro' && (
          <input className="input mt-8" placeholder="Descreva a ocasião…" value={s.occOutro} onChange={(e) => patch({ occOutro: e.target.value })} autoFocus />
        )}
      </div>
      <div className="group">
        <span className="label">Para quem é o brinde?</span>
        <Choice options={DESTINOS.map((d) => ({ val: d, label: d }))} value={s.dest} onChange={(v) => patch({ dest: v })} label="Para quem é o brinde" />
      </div>
      <div className="group">
        <span className="label">Quantidade estimada</span>
        <Choice options={QTDS} value={s.qty} onChange={(v) => patch({ qty: v })} label="Quantidade estimada" chip />
      </div>
      <div className="group">
        <Field label="Prazo de entrega">
          {(id) => <input id={id} className="input w-auto" type="date" value={s.prazo} min={new Date().toISOString().slice(0, 10)} onChange={(e) => patch({ prazo: e.target.value })} />}
        </Field>
      </div>
    </>
  )
}

function Choice({ options, value, onChange, label, chip }: { options: { val: string; label: string }[]; value: string; onChange: (v: string) => void; label: string; chip?: boolean }) {
  return (
    <div className="pills" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.val} type="button" role="radio" aria-checked={value === o.val}
          className={`pill${chip ? ' chip' : ''}${value === o.val ? ' on' : ''}`}
          onClick={() => onChange(value === o.val ? '' : o.val)}>{o.label}</button>
      ))}
    </div>
  )
}

/* ── 2 · Produtos (cartões com foto, nome e categoria) ─ */
export function StepProdutos({ s, patch, products }: StepProps) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todas')
  const cats = useMemo(() => ['Todas', ...Array.from(new Set(products.map((p) => p.categoria))).sort()], [products])
  const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const list = products.filter((p) => (cat === 'Todas' || p.categoria === cat) && (!q || norm(`${p.nome} ${p.codigo} ${p.categoria}`).includes(norm(q))))
  const toggle = (id: string) => patch({ selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id] })

  return (
    <>
      <StepHead n={2} tag="Produtos" title={<>Escolha os <em>produtos</em></>} lead="Selecione um ou mais itens do catálogo para compor a sua experiência." />
      <div className="list-tools">
        <input className="input search" type="search" placeholder="Buscar por nome, código ou categoria…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produto" />
      </div>
      <div className="pills cat-pills" role="radiogroup" aria-label="Filtrar por categoria">
        {cats.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={cat === c} className={`pill chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <p className="muted small">{list.length} produto(s) · <strong className="accent">{s.selected.length} selecionado(s)</strong></p>
      <div className="prod-grid">
        {list.map((p) => {
          const on = s.selected.includes(p.id)
          return (
            <button key={p.id} type="button" role="checkbox" aria-checked={on} className={`prod-card${on ? ' on' : ''}`} onClick={() => toggle(p.id)}>
              <span className="prod-card-img">
                {p.imagens[0] ? <img src={p.imagens[0]} alt="" loading="lazy" /> : <span className="thumb-empty" />}
                <span className="prod-card-chk" aria-hidden>{on ? '✓' : '+'}</span>
              </span>
              <span className="prod-card-info">
                <span className="prod-card-cat">{p.categoria}</span>
                <span className="prod-card-name">{p.nome}</span>
                <span className="prod-card-meta">
                  <span className="swatches" aria-label={`Cores: ${p.cores.join(', ')}`}>
                    {p.cores.slice(0, 6).map((c) => <i key={c} style={{ background: swatch(c) }} title={c} />)}
                    {p.cores.length > 6 && <small>+{p.cores.length - 6}</small>}
                  </span>
                  <span className="mono">{p.codigo}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {list.length === 0 && <p className="muted pad">Nenhum produto encontrado.</p>}
    </>
  )
}

/* ── 3 · Logo, cores e prévia com IA ─────────────── */
export function StepLogo({ s, patch, selectedProducts, personalizations }: StepProps) {
  const [idx, setIdx] = useState(0)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'posicionar' | 'ia'>('posicionar')
  const [iaCor, setIaCor] = useState('')
  const [gerando, setGerando] = useState<string | null>(null)
  const [iaErr, setIaErr] = useState('')
  const i = Math.min(idx, selectedProducts.length - 1)
  const p = selectedProducts[i]
  const cfg = p ? s.items[p.id] : undefined

  const setItem = (id: string, c: Partial<ItemConfig>) => patch({ items: { ...s.items, [id]: { ...s.items[id], ...c } } })

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setErr('')
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) return setErr('Envie PNG, JPG, SVG ou WEBP. Prefira PNG com fundo transparente.')
    if (f.size > 10 * 1024 * 1024) return setErr('Arquivo acima de 10 MB.')
    setLoading(true)
    try {
      const { dataUrl, aspect } = await fileToDataUrl(f, 900, 'image/png')
      patch({ logo: dataUrl, logoAspect: aspect, logoName: f.name })
    } catch {
      setErr('Não foi possível ler a imagem.')
    } finally {
      setLoading(false)
    }
  }

  const applyAll = () => {
    if (!cfg) return
    const items = { ...s.items }
    selectedProducts.forEach((sp) => { items[sp.id] = { ...items[sp.id], placement: cfg.placement } })
    patch({ items })
  }

  const goTo = (n: number) => { setIdx(n); setView('posicionar'); setIaErr('') }

  if (!s.logo || !p || !cfg) {
    return (
      <>
        <StepHead n={3} tag="Logo" title={<>Sua <em>logo</em> em cada produto</>} lead="Envie a logo uma vez, posicione e gire em cada produto, escolha as cores e veja a prévia realista." />
        <LogoUpload s={s} loading={loading} onFile={onFile} />
        {err && <p className="field-error">{err}</p>}
      </>
    )
  }

  const cores = coresDe(p.cores)
  const linhas = linhasDe(cfg)
  const total = qtdTotal(cfg)
  const pz = personalizations.find((z) => z.id === cfg.personalizacaoId)
  const corIA = linhas.some((l) => l.cor === iaCor) ? iaCor : (linhas[0]?.cor ?? cores[0])
  const keyAtual = mockupKey(p.id, corIA, cfg.placement, cfg.personalizacaoId, s.logo)
  const iaAtual = cfg.ia?.[corIA]
  const iaValida = iaAtual && iaAtual.key === keyAtual
  const genId = `${p.id}|${corIA}`

  const setQtd = (cor: string, v: number) => setItem(p.id, { cores: { ...cfg.cores, [cor]: Math.max(0, Math.floor(v) || 0) } })

  const gerar = async () => {
    setIaErr('')
    setGerando(genId)
    try {
      const img = await gerarPreviaIA({ image: p.imagens[0], logo: s.logo, placement: cfg.placement, produto: p.nome, categoria: p.categoria, cor: corIA, pz })
      patch((cur) => {
        const atual = cur.items[p.id]
        return { items: { ...cur.items, [p.id]: { ...atual, ia: { ...atual.ia, [corIA]: { img, key: keyAtual } } } } }
      })
      setView('ia')
    } catch (e) {
      setIaErr(e instanceof MockupAIError ? e.message : 'Não foi possível gerar a prévia agora.')
    } finally {
      setGerando(null)
    }
  }

  return (
    <>
      <StepHead n={3} tag="Logo" title={<>Sua <em>logo</em> em cada produto</>} lead="Envie a logo uma vez, posicione e gire em cada produto, escolha as cores e veja a prévia realista." />
      <LogoUpload s={s} loading={loading} onFile={onFile} />
      {err && <p className="field-error">{err}</p>}

      <div className="logo-editor">
        <div className="logo-tabs" role="tablist" aria-label="Produtos">
          {selectedProducts.map((sp, n) => (
            <button key={sp.id} role="tab" aria-selected={n === i} className={`logo-tab${n === i ? ' on' : ''}`} onClick={() => goTo(n)}>
              <span className="logo-tab-n">{n + 1}</span>{sp.nome}
            </button>
          ))}
        </div>

        <div className="logo-editor-grid">
          <div>
            <div className="view-toggle" role="tablist" aria-label="Visualização">
              <button role="tab" aria-selected={view === 'posicionar'} className={`tab${view === 'posicionar' ? ' on' : ''}`} onClick={() => setView('posicionar')}>Posicionar logo</button>
              <button role="tab" aria-selected={view === 'ia'} className={`tab${view === 'ia' ? ' on' : ''}`} onClick={() => setView('ia')}>✨ Prévia realista · {corIA}</button>
            </div>
            {view === 'posicionar' ? (
              <LogoPlacer key={p.id} image={p.imagens[0]} logo={s.logo} logoAspect={s.logoAspect} alt={p.nome}
                value={cfg.placement} onChange={(pl) => setItem(p.id, { placement: pl })} />
            ) : (
              <div className="ia-view">
                {gerando === genId ? (
                  <div className="ia-loading mockup" role="status"><span className="ia-spinner" aria-hidden />Gerando a prévia em {corIA}…<small>Isso leva de 10 a 30 segundos.</small></div>
                ) : iaAtual ? (
                  <>
                    <Mockup image={p.imagens[0]} alt={`${p.nome} em ${corIA} com a logo`} ai={iaAtual.img} />
                    {!iaValida && <p className="alert warn">Você mudou a posição, a rotação ou a técnica depois desta prévia. Gere de novo para atualizar.</p>}
                  </>
                ) : (
                  <div className="ia-empty mockup">
                    <Mockup image={p.imagens[0]} logo={s.logo} placement={cfg.placement} alt={p.nome} />
                    <p>Gere a prévia para ver o produto em <strong>{corIA}</strong> com a textura de <strong>{pz?.tipo ?? 'personalização'}</strong>.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="logo-side">
            <p className="eyebrow">Produto {i + 1} de {selectedProducts.length}</p>
            <h2 className="h3">{p.nome}</h2>
            <p className="muted small">{p.categoria}</p>

            <fieldset className="group">
              <legend className="label">Cores e quantidades</legend>
              <div className="color-qty">
                {cores.map((cor) => {
                  const qtd = cfg.cores?.[cor] ?? 0
                  return (
                    <label key={cor} className={`color-row${qtd > 0 ? ' on' : ''}`}>
                      <i className="color-dot" style={{ background: swatch(cor) }} aria-hidden />
                      <span className="color-name">{cor}</span>
                      <input className="input sm" type="number" min={0} step={1} inputMode="numeric" placeholder="0"
                        aria-label={`Quantidade na cor ${cor}`} value={qtd || ''} onChange={(e) => setQtd(cor, Number(e.target.value))} />
                      <span className="muted small">un.</span>
                    </label>
                  )
                })}
              </div>
              <p className="field-hint">Total: <strong>{total} un.</strong>{linhas.length > 1 && ` em ${linhas.length} cores`}. Deixe em branco as cores que não quiser.</p>
            </fieldset>

            <fieldset className="group">
              <legend className="label">Tipo de personalização</legend>
              {p.personalizacaoIds.length === 0 && <p className="muted small">Nossa equipe vai indicar a melhor técnica para este produto.</p>}
              <div className="radio-list">
                {p.personalizacaoIds.map((pid) => {
                  const z = personalizations.find((x) => x.id === pid)
                  if (!z) return null
                  return (
                    <label key={pid} className={`radio-row${cfg.personalizacaoId === pid ? ' on' : ''}`}>
                      <input type="radio" name={`pz-${p.id}`} checked={cfg.personalizacaoId === pid} onChange={() => setItem(p.id, { personalizacaoId: pid })} />
                      {z.tipo}
                      <span className="muted small">a partir de {brl(precoMinimo(z))}/un.</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="ia-box">
              <p className="label">✨ Prévia realista com IA</p>
              <p className="field-hint">Muda a cor do produto e aplica a textura da técnica (ex.: gravação a laser), mantendo a posição e a rotação da logo.</p>
              {linhas.length > 1 && (
                <div className="pills">
                  {linhas.map((l) => (
                    <button key={l.cor} type="button" className={`pill sm-pill${corIA === l.cor ? ' on' : ''}`} onClick={() => setIaCor(l.cor)}>
                      <i className="color-dot sm" style={{ background: swatch(l.cor) }} aria-hidden />{l.cor}{cfg.ia?.[l.cor] && ' ✓'}
                    </button>
                  ))}
                </div>
              )}
              <button className="btn dark block" onClick={gerar} disabled={!!gerando || total < 1}>
                {gerando === genId ? 'Gerando…' : iaAtual ? `Gerar de novo em ${corIA}` : `Gerar prévia em ${corIA}`}
              </button>
              {iaErr && <p className="field-error" role="alert">{iaErr}</p>}
            </div>

            {selectedProducts.length > 1 && <button className="btn ghost sm" onClick={applyAll}>Usar esta posição em todos</button>}

            <div className="logo-side-nav">
              <button className="btn ghost sm" disabled={i === 0} onClick={() => goTo(i - 1)}>← Produto anterior</button>
              <button className="btn ghost sm" disabled={i === selectedProducts.length - 1} onClick={() => goTo(i + 1)}>Próximo produto →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function LogoUpload({ s, loading, onFile }: { s: WizardState; loading: boolean; onFile: (f: File | undefined) => void }) {
  return (
    <div className={`upload${s.logo ? ' has-file' : ''}`}>
      <input id="logo-file" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => onFile(e.target.files?.[0])} />
      {s.logo ? (
        <div className="upload-done">
          <img src={s.logo} alt="Logo enviada" />
          <div>
            <p className="strong">{s.logoName || 'Logo enviada'}</p>
            <label htmlFor="logo-file" className="link">Trocar arquivo</label>
          </div>
        </div>
      ) : (
        <label htmlFor="logo-file" className="upload-empty">
          <span className="upload-icon" aria-hidden>📎</span>
          <span className="strong">{loading ? 'Processando…' : 'Clique para enviar a logo'}</span>
          <span className="muted small">PNG com fundo transparente (recomendado), SVG, JPG · até 10 MB</span>
        </label>
      )}
    </div>
  )
}

/* ── 4 · Embalagem ────────────────────────── */
export function StepEmbalagem({ s, patch }: StepProps) {
  const toggle = (v: string) => {
    if (v === SEM_EMBALAGEM) return patch({ emb: s.emb.includes(v) ? [] : [v] })
    const base = s.emb.filter((x) => x !== SEM_EMBALAGEM)
    patch({ emb: base.includes(v) ? base.filter((x) => x !== v) : [...base, v] })
  }
  const all = [...EMBALAGENS, { val: SEM_EMBALAGEM, name: 'Sem embalagem adicional', desc: 'Os produtos seguem na embalagem padrão do fornecedor.' }]
  return (
    <>
      <StepHead n={4} tag="Embalagem" title={<>A <em>embalagem</em> da experiência</>} lead="O unboxing é o primeiro momento da experiência. Cada camada aumenta o valor percebido." />
      <div className="emb-grid">
        {all.map((e) => {
          const on = s.emb.includes(e.val)
          return (
            <button key={e.val} type="button" role="checkbox" aria-checked={on} className={`emb-card${on ? ' on' : ''}${e.val === SEM_EMBALAGEM ? ' full' : ''}`} onClick={() => toggle(e.val)}>
              <span className="emb-chk" aria-hidden>{on ? '✓' : ''}</span>
              <span><span className="emb-name">{e.name}</span><span className="emb-desc">{e.desc}</span></span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ── 5 · Mensagem ─────────────────────────── */
export function StepMensagem({ s, patch }: StepProps) {
  return (
    <>
      <StepHead n={5} tag="Mensagem" title={<>A camada <em>emocional</em></>} lead="Um cartão personalizado transforma um produto em uma memória." />
      <div className="toggle-row" role="radiogroup" aria-label="Incluir cartão">
        {([['sim', '💌', 'Sim, quero um cartão'], ['nao', '📦', 'Não por agora']] as const).map(([v, icon, lbl]) => (
          <button key={v} type="button" role="radio" aria-checked={s.msg === v} className={`toggle-opt${s.msg === v ? ' on' : ''}`} onClick={() => patch({ msg: v })}>
            <span className="toggle-icon" aria-hidden>{icon}</span>{lbl}
          </button>
        ))}
      </div>
      {s.msg === 'sim' && (
        <>
          <Field label="Mensagem do cartão" hint={`${s.msgTxt.length}/320 caracteres`}>
            {(id) => <textarea id={id} className="input" maxLength={320} rows={4} value={s.msgTxt} placeholder="Ex.: Bem-vindo à equipe! Estamos felizes em ter você com a gente." onChange={(e) => patch({ msgTxt: e.target.value })} />}
          </Field>
          <Field label="Assinado por">
            {(id) => <input id={id} className="input" value={s.msgFrom} placeholder="Ex.: Equipe Recursos Humanos" onChange={(e) => patch({ msgFrom: e.target.value })} />}
          </Field>
        </>
      )}
    </>
  )
}

/* ── 6 · Encaminhar pedido ────────────────── */
export function StepEncaminhar({ s, patch, selectedProducts, personalizations, settings }: StepProps) {
  const [quotes, setQuotes] = useState<FreightQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [freightErr, setFreightErr] = useState('')
  const [editContato, setEditContato] = useState(false)
  const [editEntrega, setEditEntrega] = useState(false)
  const totalItens = selectedProducts.reduce((t, p) => t + qtdTotal(s.items[p.id]), 0)

  const setEntrega = (c: Partial<WizardState['entrega']>) => patch({ entrega: { ...s.entrega, ...c }, ...(c.cep !== undefined ? { frete: null } : {}) })
  const setContato = (c: Partial<WizardState['contato']>) => patch({ contato: { ...s.contato, ...c } })

  const calc = async () => {
    setLoading(true)
    setFreightErr('')
    try {
      const q = await quoteFreight({ cep: s.entrega.cep, numero: s.entrega.numero, totalItens })
      setQuotes(q)
      patch((cur) => ({ frete: cur.frete && q.some((x) => x.serviceType === cur.frete!.serviceType) ? q.find((x) => x.serviceType === cur.frete!.serviceType)! : q[0] ?? null }))
    } catch (e) {
      setQuotes([])
      setFreightErr(e instanceof FreightError ? e.message : 'Não foi possível calcular o frete agora. Tente novamente.')
      patch({ frete: null })
    } finally {
      setLoading(false)
    }
  }

  // Cliente cadastrado: calcula o frete automaticamente com o endereço do perfil
  const cepOk = s.entrega.cep.replace(/\D/g, '').length === 8
  useEffect(() => {
    if (cepOk && totalItens > 0) void calc()
    // recalcula quando o CEP ou o volume mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.entrega.cep, totalItens])

  // Linhas de valor (mesma fórmula do painel: src/lib/format.ts → calcTotals)
  const linhas = selectedProducts.flatMap((p) => {
    const it = s.items[p.id]
    const pz = personalizations.find((z) => z.id === it?.personalizacaoId)
    const c = cotarItem(pz, null, qtdTotal(it))
    return linhasDe(it).map((l) => ({ productId: p.id, cor: l.cor, quantidade: l.quantidade, valorUnidade: p.valor, personalizacaoValor: c.personalizacaoValor }))
  })
  const t = calcTotals({
    itens: linhas, frete1: settings.frete1Padrao, frete2: s.frete?.price ?? 0,
    horas: settings.horasPadrao, valorHora: settings.valorHora, margemPct: settings.margemPct, taxaPct: settings.taxaCartaoPct,
  })
  const m = settings.margemPct
  const tx = settings.taxaCartaoPct
  const valorProduto = (pid: string) => linhas.filter((l) => l.productId === pid).reduce((v, l) => v + valorFinalLinha(l, m, tx), 0)
  const shownQuotes = quotes.length ? quotes : s.frete ? [s.frete] : []
  const endereco = [s.entrega.endereco && `${s.entrega.endereco}, ${s.entrega.numero}`, s.entrega.complemento].filter(Boolean).join(' · ')
  const doPerfil = s.entrega.cep === PERFIL_DEMO.entrega.cep

  return (
    <>
      <StepHead n={6} tag="Encaminhar" title={<>Revise e <em>encaminhe</em></>} lead="Confira cada produto com a sua logo, os dados de entrega e o valor final do pedido." />

      <div className="review-list">
        {selectedProducts.map((p) => {
          const it = s.items[p.id]
          if (!it) return null
          const pz = personalizations.find((z) => z.id === it.personalizacaoId)
          const ls = linhasDe(it)
          const ia = ls.map((l) => it.ia?.[l.cor]?.img).find(Boolean)
          return (
            <article key={p.id} className="review-card">
              <Mockup image={p.imagens[0]} logo={s.logo} placement={it.placement} alt={`${p.nome} com a logo`} className="review-mock" ai={ia} />
              <div className="review-info">
                <h3 className="h3">{p.nome}</h3>
                <p className="muted small">{p.categoria} · Personalização: {pz?.tipo ?? 'a definir'}</p>
                <ul className="review-colors">
                  {ls.map((l) => (
                    <li key={l.cor}><i className="color-dot sm" style={{ background: swatch(l.cor) }} aria-hidden />{l.cor}<span>{l.quantidade} un.</span></li>
                  ))}
                </ul>
                <div className="review-total">
                  <span>Valor final · {qtdTotal(it)} un.</span>
                  <strong>{brl(valorProduto(p.id))}</strong>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <h2 className="section-title">Entrega e frete</h2>
      <section className="profile-card">
        <div className="profile-card-hdr">
          <div>
            <p className="profile-card-title">Endereço de entrega</p>
            {doPerfil && <span className="badge tone-accent">Cadastrado no seu perfil</span>}
          </div>
          <button className="link small" onClick={() => setEditEntrega(!editEntrega)}>{editEntrega ? 'Concluir' : 'Alterar'}</button>
        </div>
        {editEntrega ? (
          <div className="form-grid">
            <Field label="CEP">{(id) => <input id={id} className="input" inputMode="numeric" placeholder="00000-000" value={s.entrega.cep} onChange={(e) => setEntrega({ cep: formatCep(e.target.value) })} />}</Field>
            <Field label="Número">{(id) => <input id={id} className="input" value={s.entrega.numero} onChange={(e) => setEntrega({ numero: e.target.value })} />}</Field>
            <Field label="Endereço">{(id) => <input id={id} className="input" placeholder="Rua, avenida…" value={s.entrega.endereco} onChange={(e) => setEntrega({ endereco: e.target.value })} />}</Field>
            <Field label="Complemento">{(id) => <input id={id} className="input" value={s.entrega.complemento} onChange={(e) => setEntrega({ complemento: e.target.value })} />}</Field>
          </div>
        ) : (
          <dl className="kv compact">
            <div><dt>Endereço</dt><dd>{endereco || '—'}</dd></div>
            {doPerfil && <div><dt>Bairro / cidade</dt><dd>{PERFIL_DEMO.entrega.bairro} · {PERFIL_DEMO.entrega.cidade}/{PERFIL_DEMO.entrega.uf}</dd></div>}
            <div><dt>CEP</dt><dd>{s.entrega.cep || '—'}</dd></div>
            {doPerfil && <div><dt>Recebimento</dt><dd>{PERFIL_DEMO.instrucoesEntrega}</dd></div>}
          </dl>
        )}

        <div className="freight">
          <span className="muted small">Entrega via Lalamove · {totalItens} unidade(s)</span>
          <button className="btn ghost sm" onClick={calc} disabled={loading || !cepOk}>{loading ? 'Calculando…' : 'Recalcular frete'}</button>
        </div>
        {freightErr && <p className="alert warn">{freightErr}</p>}
        {shownQuotes.length > 0 && (
          <div className="quotes" role="radiogroup" aria-label="Opções de frete">
            {shownQuotes.map((q) => (
              <label key={q.quotationId} className={`quote${s.frete?.quotationId === q.quotationId ? ' on' : ''}`}>
                <input type="radio" name="frete" checked={s.frete?.quotationId === q.quotationId} onChange={() => patch({ frete: q })} />
                <span className="quote-name">Lalamove · {q.label}</span>
                <span className="muted small">~{Math.round(q.etaMin)} min após a coleta</span>
                <strong className="quote-price">{brl(q.price)}</strong>
              </label>
            ))}
          </div>
        )}
      </section>

      <h2 className="section-title">Seus dados</h2>
      <section className="profile-card">
        <div className="profile-card-hdr">
          <div className="profile-who">
            <span className="client-avatar lg" aria-hidden>{(s.contato.nome || '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
            <div>
              <p className="profile-card-title">{s.contato.nome || 'Sem nome'}</p>
              <p className="muted small">{s.contato.nome === PERFIL_DEMO.nome ? `${PERFIL_DEMO.cargo} · ` : ''}{s.contato.empresa}</p>
            </div>
          </div>
          <button className="link small" onClick={() => setEditContato(!editContato)}>{editContato ? 'Concluir' : 'Alterar'}</button>
        </div>
        {editContato ? (
          <div className="form-grid">
            <Field label="Nome">{(id) => <input id={id} className="input" autoComplete="name" value={s.contato.nome} onChange={(e) => setContato({ nome: e.target.value })} />}</Field>
            <Field label="Empresa">{(id) => <input id={id} className="input" autoComplete="organization" value={s.contato.empresa} onChange={(e) => setContato({ empresa: e.target.value })} />}</Field>
            <Field label="E-mail">{(id) => <input id={id} className="input" type="email" autoComplete="email" value={s.contato.email} onChange={(e) => setContato({ email: e.target.value })} />}</Field>
            <Field label="Telefone / WhatsApp">{(id) => <input id={id} className="input" type="tel" autoComplete="tel" placeholder="(11) 90000-0000" value={s.contato.telefone} onChange={(e) => setContato({ telefone: e.target.value })} />}</Field>
          </div>
        ) : (
          <dl className="kv compact">
            <div><dt>E-mail</dt><dd>{s.contato.email || '—'}</dd></div>
            <div><dt>Telefone</dt><dd>{s.contato.telefone || '—'}</dd></div>
            {s.contato.empresa === PERFIL_DEMO.empresa && <div><dt>CNPJ</dt><dd>{PERFIL_DEMO.cnpj}</dd></div>}
          </dl>
        )}
      </section>

      <h2 className="section-title">Valor do pedido</h2>
      <section className="summary-card" aria-label="Resumo de valores">
        <table className="fin-table">
          <tbody>
            {selectedProducts.map((p) => (
              <tr key={p.id}><td>{p.nome} <span className="muted small">· {qtdTotal(s.items[p.id])} un.</span></td><td className="num">{brl(valorProduto(p.id))}</td></tr>
            ))}
            <tr><td>Frete <span className="muted small">· coleta + entrega{s.frete ? ` (Lalamove ${s.frete.label})` : ''}</span></td><td className="num">{brl(precoDe(t.frete, m, tx))}</td></tr>
            <tr><td>Produção e montagem <span className="muted small">· {t.horas.toLocaleString('pt-BR')} h</span></td><td className="num">{brl(precoDe(t.maoDeObra, m, tx))}</td></tr>
            <tr className="total"><td>Preço final</td><td className="num">{brl(t.total)}</td></tr>
          </tbody>
        </table>
        <p className="field-hint">Valor estimado com produtos personalizados ({totalItens} un.), frete, produção e taxas de pagamento já incluídas. A equipe confirma área de gravação e cores na proposta final.</p>
      </section>

      <Field label="Observações (opcional)">
        {(id) => <textarea id={id} className="input" rows={3} value={s.observacoes} placeholder="Algo que a nossa equipe deva saber?" onChange={(e) => patch({ observacoes: e.target.value })} />}
      </Field>
    </>
  )
}
