/* ─────────────────────────────────────────────
   Store local (mock de backend)
   Persiste tudo no localStorage do navegador e sincroniza entre abas,
   para que o pedido feito pelo cliente apareça na fila da admin.
   Trocar por chamadas de API quando o backend existir.
   ───────────────────────────────────────────── */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DB, Order, Personalization, Product, Settings, Supplier } from '../types'
import { createSeed, DB_VERSION } from '../data/seed'

const KEY = 'lonny_db_v1'

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw) as DB
      if (db.version === DB_VERSION) return db
    }
  } catch {
    /* storage indisponível ou corrompido → usa seed */
  }
  return createSeed()
}

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

type Collection = 'products' | 'suppliers' | 'personalizations'
type ItemOf<C extends Collection> = C extends 'products' ? Product : C extends 'suppliers' ? Supplier : Personalization

interface StoreApi {
  db: DB
  saveError: string | null
  upsert: <C extends Collection>(col: C, item: ItemOf<C>) => void
  remove: (col: Collection, id: string) => void
  createOrder: (o: Omit<Order, 'id' | 'numero' | 'createdAt' | 'status'>) => Order
  updateOrder: (id: string, patch: Partial<Order>) => void
  updateSettings: (s: Settings) => void
  resetDemo: () => void
}

const Ctx = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load)
  const [saveError, setSaveError] = useState<string | null>(null)
  const skipPersist = useRef(false)

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false
      return
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
      setSaveError(null)
    } catch {
      setSaveError('Não foi possível salvar: o armazenamento do navegador está cheio. Use imagens menores.')
    }
  }, [db])

  // Sincroniza entre abas (cliente numa aba, admin em outra)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        skipPersist.current = true
        setDb(JSON.parse(e.newValue))
      } catch {
        /* ignora */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const upsert = useCallback(<C extends Collection>(col: C, item: ItemOf<C>) => {
    setDb((d) => {
      const list = d[col] as ItemOf<C>[]
      const exists = list.some((x) => x.id === item.id)
      return { ...d, [col]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item] }
    })
  }, [])

  const remove = useCallback((col: Collection, id: string) => {
    setDb((d) => {
      const next = { ...d, [col]: (d[col] as { id: string }[]).filter((x) => x.id !== id) } as DB
      // mantém referências consistentes
      if (col === 'suppliers') next.products = next.products.map((p) => (p.fornecedorId === id ? { ...p, fornecedorId: null } : p))
      if (col === 'personalizations') next.products = next.products.map((p) => ({ ...p, personalizacaoIds: p.personalizacaoIds.filter((x) => x !== id) }))
      return next
    })
  }, [])

  const createOrder = useCallback((o: Omit<Order, 'id' | 'numero' | 'createdAt' | 'status'>) => {
    const current = load() // lê o estado mais recente (outra aba pode ter criado pedidos)
    const numero = Math.max(1000, ...current.orders.map((x) => x.numero)) + 1
    const order: Order = { ...o, id: uid('od'), numero, createdAt: new Date().toISOString(), status: 'novo' }
    setDb((d) => ({ ...d, orders: [...d.orders, order] }))
    return order
  }, [])

  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setDb((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
  }, [])

  const updateSettings = useCallback((s: Settings) => setDb((d) => ({ ...d, settings: s })), [])
  const resetDemo = useCallback(() => setDb(createSeed()), [])

  const api = useMemo(
    () => ({ db, saveError, upsert, remove, createOrder, updateOrder, updateSettings, resetDemo }),
    [db, saveError, upsert, remove, createOrder, updateOrder, updateSettings, resetDemo],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return v
}
