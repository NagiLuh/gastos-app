'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
type Tab = 'resumen' | 'agregar' | 'historial' | 'presupuesto'

const WingsSmall = () => (
  <svg viewBox="0 0 100 50" className="w-10 h-5 inline-block opacity-60" fill="none">
    <path d="M50 25 C43 20,32 17,18 19 C13 20,8 24,10 27 C16 25,24 24,30 27 C22 27,14 29,11 33 C16 34,24 32,30 30 C23 32,17 36,16 40 C22 39,30 36,36 32 C30 37,27 42,30 45 C36 42,41 37,44 32 C42 38,43 44,47 46 C49 42,49 37,48 32 C49 37,50 42,50 25Z" fill="#4a6b3d"/>
    <path d="M50 25 C57 20,68 17,82 19 C87 20,92 24,90 27 C84 25,76 24,70 27 C78 27,86 29,89 33 C84 34,76 32,70 30 C77 32,83 36,84 40 C78 39,70 36,64 32 C70 37,73 42,70 45 C64 42,59 37,56 32 C58 38,57 44,53 46 C51 42,51 37,52 32 C51 37,50 42,50 25Z" fill="#4a6b3d"/>
  </svg>
)

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('resumen')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Alimentación')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [budgetCat, setBudgetCat] = useState('Alimentación')
  const [budgetAmt, setBudgetAmt] = useState('')
  const [budgetMsg, setBudgetMsg] = useState('')
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

  const monthKey = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`
  const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey))
  const totalSpent = monthExpenses.reduce((a, e) => a + e.amount, 0)
  const totalBudget = budgets.reduce((a, b) => a + b.amount, 0)
  const remaining = totalBudget - totalSpent
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()

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
    await supabase.from('budgets').upsert({ user_id: user!.id, category: budgetCat, amount: parseFloat(budgetAmt) }, { onConflict: 'user_id,category' })
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
      <p className="text-snk-green text-xs font-cinzel tracking-widest mt-3 animate-pulse">CARGANDO DATOS...</p>
    </div>
  )

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'resumen', label: 'Resumen', icon: '📊' },
    { key: 'agregar', label: 'Agregar', icon: '⚔' },
    { key: 'historial', label: 'Historial', icon: '📜' },
    { key: 'presupuesto', label: 'Misiones', icon: '🎯' },
  ]

  return (
    <div className="max-w-lg mx-auto min-h-screen snk-bg">

      {/* Header */}
      <div className="snk-header px-4 pt-12 pb-5 relative">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-snk-muted text-[10px] font-cinzel tracking-[0.3em]">CUERPO DE RECONOCIMIENTO</p>
            <div className="flex items-center gap-2 mt-1">
              <WingsSmall />
              <h1 className="font-cinzel text-lg font-bold text-snk-cream tracking-wider">{userName}</h1>
            </div>
          </div>
          <button onClick={handleLogout}
            className="text-snk-muted text-[10px] font-cinzel tracking-widest border border-snk-green/20 px-3 py-1.5 rounded-sm hover:border-snk-green/50 hover:text-snk-green transition">
            SALIR
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/40 border-b border-snk-green/20 sticky top-0 z-10 backdrop-blur-sm">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-[10px] font-cinzel tracking-wider transition ${tab === t.key ? 'snk-tab-active' : 'text-snk-muted hover:text-snk-cream'}`}>
            <span className="block text-base leading-none mb-0.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5">

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="w-8 h-8 border border-snk-green/20 text-snk-green hover:border-snk-green/50 flex items-center justify-center text-lg rounded-sm transition">‹</button>
              <span className="text-xs font-cinzel text-snk-cream tracking-widest">{monthLabel}</span>
              <button onClick={() => changeMonth(1)} className="w-8 h-8 border border-snk-green/20 text-snk-green hover:border-snk-green/50 flex items-center justify-center text-lg rounded-sm transition">›</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="snk-metric rounded-sm p-3">
                <p className="text-[9px] font-cinzel text-snk-muted tracking-wider mb-1">GASTADO</p>
                <p className="text-base font-cinzel font-bold text-snk-danger">S/{totalSpent.toFixed(2)}</p>
              </div>
              <div className="snk-metric rounded-sm p-3">
                <p className="text-[9px] font-cinzel text-snk-muted tracking-wider mb-1">MISIÓN</p>
                <p className="text-base font-cinzel font-bold text-snk-cream">{totalBudget > 0 ? `S/${totalBudget.toFixed(2)}` : '—'}</p>
              </div>
              <div className="snk-metric rounded-sm p-3">
                <p className="text-[9px] font-cinzel text-snk-muted tracking-wider mb-1">RESTANTE</p>
                <p className={`text-base font-cinzel font-bold ${remaining < 0 ? 'text-snk-danger' : 'text-snk-green'}`}>
                  {totalBudget > 0 ? `S/${remaining.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>

            {catData.length > 0 ? (
              <div className="snk-card rounded-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <WingsSmall />
                  <p className="text-xs font-cinzel text-snk-green tracking-widest">INFORME DE RECURSOS</p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {catData.map((entry) => <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#5a5a5a'} stroke="rgba(74,107,61,0.3)" strokeWidth={1} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(74,107,61,0.3)', borderRadius: '2px', fontFamily: 'Cinzel, serif', fontSize: '11px', color: '#d4c9a8' }}
                      formatter={(v: number) => [`S/ ${v.toFixed(2)}`, '']}
                    />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '10px', color: '#6b6455', fontFamily: 'Cinzel, serif' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="snk-card rounded-sm p-8 text-center">
                <p className="text-snk-muted text-xs font-cinzel tracking-widest">SIN OPERACIONES ESTE MES</p>
              </div>
            )}

            <div className="snk-card rounded-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <WingsSmall />
                <p className="text-xs font-cinzel text-snk-green tracking-widest">ÚLTIMAS OPERACIONES</p>
              </div>
              {monthExpenses.slice(0, 5).length === 0 ? (
                <p className="text-snk-muted text-xs font-cinzel tracking-wider text-center py-3">SIN REGISTROS</p>
              ) : (
                <div className="space-y-2">
                  {monthExpenses.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-snk-green/10 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{CAT_ICONS[e.category] || '📦'}</span>
                        <div>
                          <p className="text-sm text-snk-cream font-crimson">{e.description}</p>
                          <p className="text-[10px] text-snk-muted font-cinzel tracking-wider">{e.category} · {e.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-cinzel font-bold text-snk-gold">S/{e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGREGAR */}
        {tab === 'agregar' && (
          <form onSubmit={handleAddExpense} className="snk-card rounded-sm p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <WingsSmall />
              <p className="text-xs font-cinzel text-snk-green tracking-widest">REGISTRAR OPERACIÓN</p>
            </div>
            <hr className="snk-divider" />
            <div>
              <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">DESCRIPCIÓN</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} required
                className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-crimson"
                placeholder="Detalle de la operación..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">MONTO (S/)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0" step="0.01"
                  className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-cinzel" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">FECHA</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="snk-input w-full rounded-sm px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">CATEGORÍA</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-crimson">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-cinzel text-snk-green tracking-widest mb-2">NOTA (OPCIONAL)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-crimson"
                placeholder="Detalles adicionales..." />
            </div>
            {addMsg && (
              <div className="border border-snk-green/30 bg-snk-green/5 rounded-sm px-3 py-2">
                <p className="text-snk-green text-xs text-center font-cinzel tracking-wider">{addMsg}</p>
              </div>
            )}
            <button type="submit" disabled={addLoading}
              className="snk-btn w-full py-3 rounded-sm text-xs tracking-widest disabled:opacity-40">
              {addLoading ? 'REGISTRANDO...' : '⚔ CONFIRMAR OPERACIÓN'}
            </button>
          </form>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
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
                        className="text-snk-muted hover:text-snk-danger text-lg leading-none transition">×</button>
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
            <div className="flex items-center gap-2 mb-1">
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
              <p className="text-[10px] font-cinzel text-snk-green tracking-widest mb-1">ASIGNAR PRESUPUESTO</p>
              <hr className="snk-divider" />
              <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)}
                className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-crimson">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
              <input type="number" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} required min="0"
                className="snk-input w-full rounded-sm px-3 py-2.5 text-sm font-cinzel"
                placeholder="Monto en S/" />
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
