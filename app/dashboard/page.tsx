'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CATEGORIES = ['Alimentación','Transporte','Salud','Entretenimiento','Ropa','Educación','Hogar','Tecnología','Otros']
const CAT_COLORS: Record<string,string> = {
  'Alimentación':'#4a6b3d','Transporte':'#3d5a6b','Salud':'#6b3d4a',
  'Entretenimiento':'#5a3d6b','Ropa':'#6b5a3d','Educación':'#6b4a3d',
  'Hogar':'#3d6b4a','Tecnología':'#3d4a6b','Otros':'#5a5a5a'
}
const CAT_ICONS: Record<string,string> = {
  'Alimentación':'🍖','Transporte':'⚔','Salud':'🩺','Entretenimiento':'🎌',
  'Ropa':'🧥','Educación':'📜','Hogar':'🏰','Tecnología':'⚙','Otros':'📦'
}

type Expense = { id: string; description: string; amount: number; category: string; date: string; note: string }
type Budget = { category: string; amount: number }
type Tab = 'agregar' | 'dashboard' | 'historial' | 'presupuesto'

const WingsSmall = () => (
  <svg viewBox="0 0 100 50" className="w-10 h-5 inline-block opacity-60" fill="none">
    <path d="M50 25 C43 20,32 17,18 19 C13 20,8 24,10 27 C16 25,24 24,30 27 C22 27,14 29,11 33 C16 34,24 32,30 30 C23 32,17 36,16 40 C22 39,30 36,36 32 C30 37,27 42,30 45 C36 42,41 37,44 32 C42 38,43 44,47 46 C49 42,49 37,48 32 C49 37,50 42,50 25Z" fill="#4a6b3d"/>
    <path d="M50 25 C57 20,68 17,82 19 C87 20,92 24,90 27 C84 25,76 24,70 27 C78 27,86 29,89 33 C84 34,76 32,70 30 C77 32,83 36,84 40 C78 39,70 36,64 32 C70 37,73 42,70 45 C64 42,59 37,56 32 C58 38,57 44,53 46 C51 42,51 37,52 32 C51 37,50 42,50 25Z" fill="#4a6b3d"/>
  </svg>
)

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('agregar')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentMonth] = useState(new Date().getMonth())
  const [currentYear] = useState(new Date().getFullYear())

  // Add form
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Alimentación')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Budget form
  const [budgetCat, setBudgetCat] = useState('Alimentación')
  const [budgetAmt, setBudgetAmt] = useState('')
  const [budgetMsg, setBudgetMsg] = useState('')

  // History filters
  const [filterCat, setFilterCat] = useState('')
  const [filterMonth, setFilterMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Soldado')
    const [{ data: exp }, { data: bud }] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*')
    ])
    setExpenses(exp || [])
    setBudgets(bud || [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  // Current month data
  const monthKey = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`
  const prevMonthKey = currentMonth === 0
    ? `${currentYear-1}-12`
    : `${currentYear}-${String(currentMonth).padStart(2,'0')}`

  const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey))
  const prevMonthExpenses = expenses.filter(e => e.date.startsWith(prevMonthKey))

  const totalSpent = monthExpenses.reduce((a, e) => a + e.amount, 0)
  const totalPrev = prevMonthExpenses.reduce((a, e) => a + e.amount, 0)
  const totalBudget = budgets.reduce((a, b) => a + b.amount, 0)
  const remaining = totalBudget - totalSpent

  const diffPct = totalPrev > 0
    ? Math.round(((totalSpent - totalPrev) / totalPrev) * 100)
    : null

  const monthLabel = new Date(currentYear, currentMonth, 1)
    .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()
  const prevMonthLabel = new Date(currentYear, currentMonth - 1, 1)
    .toLocaleDateString('es-PE', { month: 'long' }).toUpperCase()

  // Category totals
  const catTotals = CATEGORIES.map(c => ({
    name: c,
    short: c.slice(0, 4).toUpperCase(),
    icon: CAT_ICONS[c],
    value: monthExpenses.filter(e => e.category === c).reduce((a, e) => a + e.amount, 0)
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

  const topCat = catTotals[0]
  const bottomCat = catTotals[catTotals.length - 1]

  // Top 3 expenses
  const top3 = [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 3)

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!desc || !amount || !date) return
    setAddLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({
      user_id: user!.id, description: desc,
      amount: parseFloat(amount), category, date, note
    })
    setDesc(''); setAmount(''); setNote('')
    setAddMsg('⚔ Operación registrada')
    setTimeout(() => setAddMsg(''), 2500)
    setAddLoading(false)
    fetchData()
  }

  const handleDeleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    fetchData()
  }

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetAmt) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('budgets').upsert(
      { user_id: user!.id, category: budgetCat, amount: parseFloat(budgetAmt) },
      { onConflict: 'user_id,category' }
    )
    setBudgetAmt('')
    setBudgetMsg('✓ Presupuesto asignado')
    setTimeout(() => setBudgetMsg(''), 2000)
    fetchData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredExpenses = expenses.filter(e => {
    if (filterCat && e.category !== filterCat) return false
    if (filterMonth && !e.date.startsWith(filterMonth)) return false
    return true
  })

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen snk-bg">
      <WingsSmall />
      <p className="text-snk-green text-xs font-cinzel tracking-widest mt-3 animate-pulse">CARGANDO...</p>
    </div>
  )

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'agregar', label: 'Agregar', icon: '⚔' },
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'historial', label: 'Historial', icon: '📜' },
    { key: 'presupuesto', label: 'Misiones', icon: '🎯' },
  ]

  return (
    <div className="max-w-lg mx-auto min-h-screen snk-bg">

      {/* Header */}
      <div className="snk-header px-4 pt-10 pb-4 relative">
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2">
            <WingsSmall />
            <div>
              <p className="text-[9px] font-cinzel text-snk-muted tracking-[0.3em]">SURVEY CORPS</p>
              <p className="font-cinzel text-sm font-bold text-snk-cream tracking-wider">{userName}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="text-snk-muted text-[9px] font-cinzel tracking-widest border border-snk-green/20 px-3 py-1.5 rounded-sm hover:border-snk-green/50 hover:text-snk-green transition">
            SALIR
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/40 border-b border-snk-green/20 sticky top-0 z-10 backdrop-blur-sm">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-[9px] font-cinzel tracking-wider transition ${tab === t.key ? 'snk-tab-active' : 'text-snk-muted hover:text-snk-cream'}`}>
            <span className="block text-base leading-none mb-0.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5">

        {/* ── AGREGAR ── */}
        {tab === 'agregar' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <WingsSmall />
              <p className="text-xs font-cinzel text-snk-green tracking-widest">REGISTRAR GASTO</p>
            </div>

            <form onSubmit={handleAddExpense} className="snk-card rounded-sm p-5 space-y-4">
              {/* Amount big input */}
              <div className="text-center py-2">
                <p className="text-[10px] font-cinzel text-snk-muted tracking-widest mb-2">MONTO (S/)</p>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0" step="0.01"
                  className="snk-input w-full rounded-sm px-4 py-4 text-3xl font-cinzel font-bold text-center text-snk-gold"
                  placeholder="0.00" />
              </div>

              <hr className="snk-divider" />

              <div>
                <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">DESCRIPCIÓN</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} required
                  className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-crimson"
                  placeholder="¿En qué gastaste?" />
              </div>

              {/* Category grid */}
              <div>
                <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">CATEGORÍA</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      className={`py-2 px-1 rounded-sm text-center transition border text-xs font-crimson ${
                        category === c
                          ? 'border-snk-green/60 bg-snk-green/10 text-snk-cream'
                          : 'border-snk-green/10 text-snk-muted hover:border-snk-green/30'
                      }`}>
                      <span className="block text-lg leading-none">{CAT_ICONS[c]}</span>
                      <span className="text-[10px] mt-0.5 block">{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">FECHA</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                    className="snk-input w-full rounded-sm px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">NOTA</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)}
                    className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-crimson"
                    placeholder="Opcional..." />
                </div>
              </div>

              {addMsg && (
                <div className="border border-snk-green/30 bg-snk-green/5 rounded-sm px-3 py-2">
                  <p className="text-snk-green text-xs text-center font-cinzel tracking-wider">{addMsg}</p>
                </div>
              )}
              <button type="submit" disabled={addLoading}
                className="snk-btn w-full py-3.5 rounded-sm text-xs tracking-widest font-bold disabled:opacity-40">
                {addLoading ? 'REGISTRANDO...' : '⚔ CONFIRMAR OPERACIÓN'}
              </button>
            </form>

            {/* Quick last 3 */}
            {monthExpenses.length > 0 && (
              <div className="snk-card rounded-sm p-4">
                <p className="text-[10px] font-cinzel text-snk-muted tracking-widest mb-3">ÚLTIMOS REGISTROS</p>
                <div className="space-y-2">
                  {monthExpenses.slice(0, 3).map(e => (
                    <div key={e.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{CAT_ICONS[e.category]}</span>
                        <div>
                          <p className="text-xs text-snk-cream font-crimson">{e.description}</p>
                          <p className="text-[10px] text-snk-muted font-cinzel">{e.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-cinzel font-bold text-snk-gold">S/{e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WingsSmall />
                <p className="text-xs font-cinzel text-snk-green tracking-widest">{monthLabel}</p>
              </div>
            </div>

            {/* Main total */}
            <div className="snk-card-gold rounded-sm p-5 text-center">
              <p className="text-[10px] font-cinzel text-snk-muted tracking-widest mb-1">TOTAL GASTADO</p>
              <p className="text-4xl font-cinzel font-black text-snk-gold">S/{totalSpent.toFixed(2)}</p>
              {diffPct !== null && (
                <div className={`inline-flex items-center gap-1 mt-2 text-xs font-cinzel px-3 py-1 rounded-sm border ${
                  diffPct > 0
                    ? 'text-snk-danger border-snk-danger/30 bg-snk-danger/5'
                    : 'text-snk-green border-snk-green/30 bg-snk-green/5'
                }`}>
                  {diffPct > 0 ? '▲' : '▼'} {Math.abs(diffPct)}% vs {prevMonthLabel}
                </div>
              )}
              {totalBudget > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-cinzel text-snk-muted mb-1">
                    <span>PRESUPUESTO S/{totalBudget.toFixed(2)}</span>
                    <span className={remaining < 0 ? 'text-snk-danger' : 'text-snk-green'}>
                      {remaining < 0 ? 'EXCEDIDO' : `S/${remaining.toFixed(2)} LIBRE`}
                    </span>
                  </div>
                  <div className="progress-snk w-full h-1.5 rounded-sm overflow-hidden">
                    <div className="h-full rounded-sm transition-all"
                      style={{ width: `${Math.min(100, (totalSpent/totalBudget)*100)}%`,
                        background: totalSpent > totalBudget ? '#c4564a' : '#4a6b3d' }}/>
                  </div>
                </div>
              )}
            </div>

            {/* Top / Bottom category */}
            {catTotals.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="snk-card rounded-sm p-4">
                  <p className="text-[9px] font-cinzel text-snk-danger tracking-widest mb-2">↑ MÁS GASTO</p>
                  <span className="text-2xl">{topCat?.icon}</span>
                  <p className="text-xs font-cinzel text-snk-cream mt-1">{topCat?.name}</p>
                  <p className="text-base font-cinzel font-bold text-snk-gold mt-0.5">S/{topCat?.value.toFixed(2)}</p>
                </div>
                <div className="snk-card rounded-sm p-4">
                  <p className="text-[9px] font-cinzel text-snk-green tracking-widest mb-2">↓ MENOS GASTO</p>
                  <span className="text-2xl">{bottomCat?.icon}</span>
                  <p className="text-xs font-cinzel text-snk-cream mt-1">{bottomCat?.name}</p>
                  <p className="text-base font-cinzel font-bold text-snk-gold mt-0.5">S/{bottomCat?.value.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Bar chart */}
            {catTotals.length > 0 ? (
              <div className="snk-card rounded-sm p-4">
                <p className="text-[10px] font-cinzel text-snk-green tracking-widest mb-4">GASTOS POR CATEGORÍA</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={catTotals} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="short" tick={{ fill: '#6b6455', fontSize: 9, fontFamily: 'Cinzel, serif' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b6455', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(74,107,61,0.3)', borderRadius: '2px', fontFamily: 'Cinzel, serif', fontSize: '11px', color: '#d4c9a8' }}
                      formatter={(v: number) => [`S/ ${v.toFixed(2)}`, '']}
                      labelFormatter={(l) => catTotals.find(c => c.short === l)?.name || l}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {catTotals.map((entry) => (
                        <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#5a5a5a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="snk-card rounded-sm p-8 text-center">
                <p className="text-snk-muted text-xs font-cinzel tracking-widest">SIN OPERACIONES ESTE MES</p>
              </div>
            )}

            {/* Top 3 gastos */}
            {top3.length > 0 && (
              <div className="snk-card rounded-sm p-4">
                <p className="text-[10px] font-cinzel text-snk-green tracking-widest mb-3">TOP 3 GASTOS DEL MES</p>
                <div className="space-y-2">
                  {top3.map((e, i) => (
                    <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-snk-green/10 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-cinzel text-snk-muted w-4">#{i+1}</span>
                        <span className="text-base">{CAT_ICONS[e.category]}</span>
                        <div>
                          <p className="text-sm text-snk-cream font-crimson">{e.description}</p>
                          <p className="text-[10px] text-snk-muted font-cinzel">{e.category} · {e.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-cinzel font-bold text-snk-gold">S/{e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparison with prev month */}
            {totalPrev > 0 && (
              <div className="snk-card rounded-sm p-4">
                <p className="text-[10px] font-cinzel text-snk-green tracking-widest mb-3">COMPARACIÓN MENSUAL</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-cinzel text-snk-cream tracking-wider">{monthLabel}</span>
                    <span className="text-sm font-cinzel font-bold text-snk-gold">S/{totalSpent.toFixed(2)}</span>
                  </div>
                  <div className="progress-snk w-full h-1.5 rounded-sm overflow-hidden">
                    <div className="h-full rounded-sm bg-snk-green/60"
                      style={{ width: `${Math.min(100, (totalSpent / Math.max(totalSpent, totalPrev)) * 100)}%` }}/>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-cinzel text-snk-muted tracking-wider">{prevMonthLabel}</span>
                    <span className="text-sm font-cinzel text-snk-muted">S/{totalPrev.toFixed(2)}</span>
                  </div>
                  <div className="progress-snk w-full h-1.5 rounded-sm overflow-hidden">
                    <div className="h-full rounded-sm bg-snk-muted/40"
                      style={{ width: `${Math.min(100, (totalPrev / Math.max(totalSpent, totalPrev)) * 100)}%` }}/>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab === 'historial' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <WingsSmall />
              <p className="text-xs font-cinzel text-snk-green tracking-widest">ARCHIVO DE OPERACIONES</p>
            </div>
            <div className="flex gap-2">
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="snk-input flex-1 rounded-sm px-3 py-2 text-xs font-crimson">
                <option value="">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="snk-input flex-1 rounded-sm px-3 py-2 text-xs" />
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="snk-card rounded-sm p-8 text-center">
                <p className="text-snk-muted text-xs font-cinzel tracking-widest">SIN REGISTROS</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map(e => (
                  <div key={e.id} className="snk-card rounded-sm px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center text-base"
                        style={{ background: CAT_COLORS[e.category] + '33', border: `1px solid ${CAT_COLORS[e.category]}50` }}>
                        {CAT_ICONS[e.category] || '📦'}
                      </div>
                      <div>
                        <p className="text-sm text-snk-cream font-crimson">{e.description}</p>
                        <p className="text-[10px] text-snk-muted font-cinzel tracking-wider">{e.category} · {e.date}{e.note ? ` · ${e.note}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-cinzel font-bold text-snk-gold">S/{e.amount.toFixed(2)}</span>
                      <button onClick={() => handleDeleteExpense(e.id)}
                        className="text-snk-muted hover:text-snk-danger text-xl leading-none transition">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRESUPUESTO ── */}
        {tab === 'presupuesto' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <WingsSmall />
              <p className="text-xs font-cinzel text-snk-green tracking-widest">MISIONES DE RECURSOS</p>
            </div>
            <div className="snk-card rounded-sm p-4 space-y-4">
              {CATEGORIES.filter(c => budgets.find(b => b.category === c)).map(c => {
                const b = budgets.find(bg => bg.category === c)!
                const spent = monthExpenses.filter(e => e.category === c).reduce((a, e) => a + e.amount, 0)
                const pct = Math.min(100, Math.round((spent / b.amount) * 100))
                const over = spent > b.amount
                const near = !over && pct >= 80
                const barColor = over ? '#c4564a' : near ? '#c4a84a' : '#4a6b3d'
                return (
                  <div key={c}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-cinzel text-snk-cream tracking-wider flex items-center gap-1">
                        {CAT_ICONS[c]} {c}
                        {over && <span className="text-[9px] text-snk-danger border border-snk-danger/30 px-1.5 py-0.5 rounded-sm ml-1">EXCEDIDO</span>}
                        {near && <span className="text-[9px] text-snk-gold border border-snk-gold/30 px-1.5 py-0.5 rounded-sm ml-1">⚠ LÍMITE</span>}
                      </span>
                      <span className="text-[10px] font-cinzel text-snk-muted">S/{spent.toFixed(2)} / S/{b.amount.toFixed(2)}</span>
                    </div>
                    <div className="progress-snk w-full h-1.5 rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, background: barColor }}></div>
                    </div>
                  </div>
                )
              })}
              {budgets.length === 0 && (
                <p className="text-snk-muted text-xs font-cinzel tracking-widest text-center py-3">SIN MISIONES ACTIVAS</p>
              )}
            </div>
            <form onSubmit={handleSetBudget} className="snk-card rounded-sm p-5 space-y-3">
              <p className="text-[10px] font-cinzel text-snk-green tracking-widest">ASIGNAR PRESUPUESTO</p>
              <hr className="snk-divider" />
              <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)}
                className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-crimson">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
              <input type="number" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} required min="0"
                className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-cinzel" placeholder="Monto en S/" />
              {budgetMsg && (
                <div className="border border-snk-green/30 bg-snk-green/5 rounded-sm px-3 py-2">
                  <p className="text-snk-green text-xs text-center font-cinzel tracking-wider">{budgetMsg}</p>
                </div>
              )}
              <button type="submit" className="snk-btn w-full py-3 rounded-sm text-xs tracking-widest">
                ⚔ CONFIRMAR MISIÓN
              </button>
            </form>
          </div>
        )}

      </div>

      <div className="text-center py-6 opacity-20">
        <WingsSmall />
        <p className="text-[9px] font-cinzel text-snk-green tracking-[0.4em] mt-1">DEDICATE YOUR HEART</p>
      </div>
    </div>
  )
}
