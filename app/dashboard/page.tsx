'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CATEGORIES = ['Alimentación','Transporte','Salud','Entretenimiento','Ropa','Educación','Hogar','Tecnología','Otros']
const CAT_COLORS: Record<string,string> = {
  'Alimentación':'#10b981','Transporte':'#3b82f6','Salud':'#ec4899',
  'Entretenimiento':'#8b5cf6','Ropa':'#f59e0b','Educación':'#ef4444',
  'Hogar':'#84cc16','Tecnología':'#6366f1','Otros':'#9ca3af'
}

type Expense = { id: string; description: string; amount: number; category: string; date: string; note: string }
type Budget = { category: string; amount: number }
type Tab = 'resumen' | 'agregar' | 'historial' | 'presupuesto'

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('resumen')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

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
    setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario')

    const [{ data: exp }, { data: bud }] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*')
    ])
    setExpenses(exp || [])
    setBudgets(bud || [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const monthKey = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`
  const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey))
  const totalSpent = monthExpenses.reduce((a, e) => a + e.amount, 0)
  const totalBudget = budgets.reduce((a, b) => a + b.amount, 0)
  const remaining = totalBudget - totalSpent

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  const changeMonth = (dir: number) => {
    let m = currentMonth + dir, y = currentYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCurrentMonth(m); setCurrentYear(y)
  }

  const catData = CATEGORIES.map(c => ({
    name: c, value: monthExpenses.filter(e => e.category === c).reduce((a, e) => a + e.amount, 0)
  })).filter(d => d.value > 0)

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!desc || !amount || !date) return
    setAddLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({ user_id: user!.id, description: desc, amount: parseFloat(amount), category, date, note })
    setDesc(''); setAmount(''); setNote('')
    setAddMsg('✓ Gasto registrado')
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
    await supabase.from('budgets').upsert({ user_id: user!.id, category: budgetCat, amount: parseFloat(budgetAmt) }, { onConflict: 'user_id,category' })
    setBudgetAmt('')
    setBudgetMsg('✓ Guardado')
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
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-500 px-4 pt-12 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-100 text-sm">Hola,</p>
            <h1 className="text-white text-xl font-semibold">{userName} 👋</h1>
          </div>
          <button onClick={handleLogout} className="text-emerald-100 text-xs border border-emerald-300 px-3 py-1 rounded-lg">
            Salir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-10">
        {(['resumen','agregar','historial','presupuesto'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium capitalize transition ${tab === t ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}>
            {t === 'resumen' ? '📊' : t === 'agregar' ? '➕' : t === 'historial' ? '📋' : '🎯'} {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-5">

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center">‹</button>
              <span className="text-sm font-medium text-gray-700 capitalize">{monthLabel}</span>
              <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center">›</button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Gastado</p>
                <p className="text-lg font-semibold text-red-500">S/ {totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Presupuesto</p>
                <p className="text-lg font-semibold text-gray-700">{totalBudget > 0 ? `S/ ${totalBudget.toFixed(2)}` : '—'}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Disponible</p>
                <p className={`text-lg font-semibold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {totalBudget > 0 ? `S/ ${remaining.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>

            {catData.length > 0 ? (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-700 mb-3">Por categoría</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {catData.map((entry) => <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#9ca3af'} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `S/ ${v.toFixed(2)}`} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400 text-sm">Sin gastos este mes</div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-3">Últimos gastos</p>
              {monthExpenses.slice(0, 5).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-2">Sin gastos este mes</p>
              ) : (
                <div className="space-y-2">
                  {monthExpenses.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[e.category] }}></div>
                        <div>
                          <p className="text-sm text-gray-700">{e.description}</p>
                          <p className="text-xs text-gray-400">{e.category} · {e.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">S/ {e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGREGAR */}
        {tab === 'agregar' && (
          <form onSubmit={handleAddExpense} className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-sm font-medium text-gray-700">Registrar gasto</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Ej: Almuerzo, taxi, farmacia..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto (S/)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0" step="0.01"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nota (opcional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Detalles adicionales..." />
            </div>
            {addMsg && <p className="text-emerald-600 text-sm text-center">{addMsg}</p>}
            <button type="submit" disabled={addLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl text-sm transition disabled:opacity-50">
              {addLoading ? 'Guardando...' : 'Agregar gasto'}
            </button>
          </form>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                <option value="">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400 text-sm">Sin resultados</div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map(e => (
                  <div key={e.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: CAT_COLORS[e.category] }}>
                        {e.category[0]}
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">{e.description}</p>
                        <p className="text-xs text-gray-400">{e.category} · {e.date}{e.note ? ` · ${e.note}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">S/ {e.amount.toFixed(2)}</span>
                      <button onClick={() => handleDeleteExpense(e.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PRESUPUESTO */}
        {tab === 'presupuesto' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              {CATEGORIES.filter(c => budgets.find(b => b.category === c)).map(c => {
                const b = budgets.find(bg => bg.category === c)!
                const spent = monthExpenses.filter(e => e.category === c).reduce((a, e) => a + e.amount, 0)
                const pct = Math.min(100, Math.round((spent / b.amount) * 100))
                const over = spent > b.amount
                const near = !over && pct >= 80
                return (
                  <div key={c}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700">{c} {over && <span className="text-xs text-red-500 ml-1">Excedido</span>}{near && <span className="text-xs text-amber-500 ml-1">⚠️ Cerca</span>}</span>
                      <span className="text-xs text-gray-400">S/ {spent.toFixed(2)} / S/ {b.amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? '#ef4444' : near ? '#f59e0b' : '#10b981' }}></div>
                    </div>
                  </div>
                )
              })}
              {budgets.length === 0 && <p className="text-gray-400 text-sm text-center py-2">Aún no tienes presupuestos</p>}
            </div>

            <form onSubmit={handleSetBudget} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-sm font-medium text-gray-700">Definir presupuesto</p>
              <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} required min="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Monto en S/" />
              {budgetMsg && <p className="text-emerald-600 text-sm text-center">{budgetMsg}</p>}
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl text-sm transition">
                Guardar presupuesto
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
