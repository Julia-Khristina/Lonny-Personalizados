import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Logo } from './Logo'

/** Logo da marca. `light` = versão branca (fundos escuros, laranja ou rosa); `sub` = rótulo de área (ex.: "Painel"). */
export function Wordmark({ light = false, sub }: { light?: boolean; sub?: string }) {
  return (
    <span className={`wordmark${light ? ' light' : ''}`}>
      <Logo layout="horizontal" tone={light ? 'mono' : 'color'} className="wordmark-logo" />
      {sub && <span className="wordmark-sub">{sub}</span>}
    </span>
  )
}

export function Modal({
  open, title, onClose, children, footer, wide = false,
}: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className={`modal${wide ? ' wide' : ''}`} onClose={onClose} onCancel={onClose}>
      {open && (
        <>
          <header className="modal-hdr">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-ftr">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}

export function Confirm({
  open, title, message, confirmLabel = 'Excluir', onConfirm, onClose,
}: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn danger" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
      </>}>
      <p className="muted">{message}</p>
    </Modal>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="muted">{children}</div>}
    </div>
  )
}

/** Campo de tags (ex.: cores do produto). Enter ou vírgula adiciona. */
export function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const add = (raw: string) => {
    const t = raw.trim()
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t])
  }
  return (
    <div className="tag-input">
      {value.map((t) => (
        <span key={t} className="tag">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remover ${t}`}>✕</button>
        </span>
      ))}
      <input
        id={id}
        placeholder={value.length ? '' : placeholder}
        onKeyDown={(e) => {
          const el = e.currentTarget
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(el.value)
            el.value = ''
          } else if (e.key === 'Backspace' && !el.value && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={(e) => { add(e.currentTarget.value); e.currentTarget.value = '' }}
      />
    </div>
  )
}
