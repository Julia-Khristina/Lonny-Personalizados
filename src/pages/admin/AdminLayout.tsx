import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Wordmark } from '../../components/ui'
import { Logo } from '../../components/Logo'
import { useStore } from '../../store/Store'

/* ── Autenticação MOCK ─────────────────────────
   Apenas visual. Substituir por autenticação real (ex.: Netlify Identity,
   Supabase Auth) antes de publicar. */
const SESSION_KEY = 'lonny_admin_session'
export const DEMO_LOGIN = { email: 'admin@gmail.com', senha: '123' }

export const auth = {
  get: () => { try { return sessionStorage.getItem(SESSION_KEY) } catch { return null } },
  login: (email: string) => { try { sessionStorage.setItem(SESSION_KEY, email) } catch { /* ignora */ } },
  logout: () => { try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignora */ } },
}

const NAV = [
  { to: '/admin', label: 'Início', icon: '◐', end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '▤' },
  { to: '/admin/produtos', label: 'Produtos', icon: '◫' },
  { to: '/admin/fornecedores', label: 'Fornecedores', icon: '⌂' },
  { to: '/admin/personalizacao', label: 'Personalização', icon: '✦' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: '⚙' },
]

export default function AdminLayout() {
  const user = auth.get()
  const loc = useLocation()
  const nav = useNavigate()
  const { db, saveError } = useStore()
  const [open, setOpen] = useState(false)
  if (!user) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />

  const novos = db.orders.filter((o) => o.status === 'novo').length

  return (
    <div className="admin">
      <aside className={`admin-side${open ? ' open' : ''}`}>
        <div className="admin-brand"><Wordmark light sub="Painel" /></div>
        <nav className="admin-nav" onClick={() => setOpen(false)}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `admin-link${isActive ? ' active' : ''}`}>
              <span className="admin-link-icon" aria-hidden>{n.icon}</span>
              {n.label}
              {n.to === '/admin/pedidos' && novos > 0 && <span className="admin-count">{novos}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-side-ftr">
          <a href="/experiencia" target="_blank" rel="noopener" className="admin-link small">↗ Ver site do cliente</a>
          <div className="admin-user">
            <span className="avatar" aria-hidden>{user[0]?.toUpperCase()}</span>
            <span className="admin-user-mail">{user}</span>
          </div>
          <button className="btn ghost-light sm block" onClick={() => { auth.logout(); nav('/admin/login') }}>Sair</button>
        </div>
      </aside>
      {open && <div className="admin-scrim" onClick={() => setOpen(false)} />}
      <div className="admin-main">
        <header className="admin-top">
          <button className="icon-btn admin-burger" onClick={() => setOpen(true)} aria-label="Abrir menu">☰</button>
          <span className="admin-top-title"><Logo layout="horizontal" className="wordmark-logo" /></span>
        </header>
        {saveError && <div className="alert error m-16">{saveError}</div>}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PageHead({ title, sub, actions }: { title: React.ReactNode; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
