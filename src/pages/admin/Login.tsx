import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Field } from '../../components/ui'
import { Logo } from '../../components/Logo'
import { auth, DEMO_LOGIN } from './AdminLayout'

export default function Login() {
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (email.trim().toLowerCase() !== DEMO_LOGIN.email || senha !== DEMO_LOGIN.senha) {
      setErr('E-mail ou senha incorretos.')
      return
    }
    auth.login(email.trim().toLowerCase())
    nav(loc.state?.from ?? '/admin', { replace: true })
  }

  return (
    <div className="login">
      <div className="login-art" aria-hidden>
        <Logo layout="stacked" tone="mono" className="login-logo" />
        <p className="login-quote">Brindes que transformam <em>marca em memória</em>.</p>
      </div>
      <form className="login-card" onSubmit={submit} noValidate>
        <p className="eyebrow">Painel administrativo</p>
        <h1 className="display sm">Bem-vinda de <em>volta</em></h1>
        <Field label="E-mail">
          {(id) => <input id={id} className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
        </Field>
        <Field label="Senha" error={err}>
          {(id) => <input id={id} className="input" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />}
        </Field>
        <button className="btn primary block" type="submit">Entrar</button>
        <p className="demo-hint">
          Acesso de demonstração: <code>{DEMO_LOGIN.email}</code> · <code>{DEMO_LOGIN.senha}</code>
          <button type="button" className="link" onClick={() => { setEmail(DEMO_LOGIN.email); setSenha(DEMO_LOGIN.senha) }}>preencher</button>
        </p>
      </form>
    </div>
  )
}
