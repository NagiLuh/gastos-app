'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const WingsIcon = () => (
  <svg viewBox="0 0 200 120" className="w-24 h-14 mx-auto mb-2" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.85">
      {/* Left wing */}
      <path d="M100 60 C85 45, 60 35, 30 40 C20 42, 10 50, 15 58 C25 55, 40 52, 55 58 C40 58, 25 62, 18 70 C25 72, 40 68, 55 65 C40 68, 28 75, 25 83 C35 82, 50 76, 62 70 C50 76, 42 85, 45 92 C55 88, 65 80, 72 72 C65 82, 62 92, 68 98 C76 92, 82 82, 85 72 C83 82, 85 93, 92 97 C96 90, 96 80, 95 70 C97 78, 100 87, 100 60Z" fill="#4a6b3d" stroke="#6a8b5d" strokeWidth="0.5"/>
      {/* Right wing */}
      <path d="M100 60 C115 45, 140 35, 170 40 C180 42, 190 50, 185 58 C175 55, 160 52, 145 58 C160 58, 175 62, 182 70 C175 72, 160 68, 145 65 C160 68, 172 75, 175 83 C165 82, 150 76, 138 70 C150 76, 158 85, 155 92 C145 88, 135 80, 128 72 C135 82, 138 92, 132 98 C124 92, 118 82, 115 72 C117 82, 115 93, 108 97 C104 90, 104 80, 105 70 C103 78, 100 87, 100 60Z" fill="#4a6b3d" stroke="#6a8b5d" strokeWidth="0.5"/>
      {/* Center body */}
      <ellipse cx="100" cy="72" rx="8" ry="18" fill="#2d4a24" stroke="#4a6b3d" strokeWidth="1"/>
      <line x1="100" y1="54" x2="100" y2="90" stroke="#6a8b5d" strokeWidth="1.5"/>
    </g>
  </svg>
)

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Correo o contraseña incorrectos'); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 snk-bg">
      {/* Background decorative text */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="font-cinzel text-[20vw] font-black text-snk-green opacity-[0.02] select-none whitespace-nowrap">SNK</span>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <WingsIcon />
          <h1 className="font-cinzel text-2xl font-bold text-snk-cream tracking-widest mt-2">SURVEY CORPS</h1>
          <p className="text-snk-muted text-xs tracking-[0.3em] mt-1 font-crimson italic">Registro de Operaciones</p>
          <hr className="snk-divider mt-3" />
        </div>

        <form onSubmit={handleLogin} className="snk-card rounded-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-cinzel text-snk-green tracking-widest mb-2">IDENTIFICACIÓN</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="snk-input w-full rounded-sm px-4 py-3 text-sm"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-cinzel text-snk-green tracking-widest mb-2">CONTRASEÑA</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="snk-input w-full rounded-sm px-4 py-3 text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="border border-red-900/50 bg-red-950/30 rounded-sm px-3 py-2">
              <p className="text-snk-danger text-xs text-center font-cinzel tracking-wider">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading} className="snk-btn w-full py-3 rounded-sm text-sm font-bold tracking-widest disabled:opacity-40 mt-2">
            {loading ? 'VERIFICANDO...' : '⚔ INGRESAR'}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-snk-muted text-xs font-crimson">¿Nuevo recluta? </span>
          <Link href="/register" className="text-snk-green text-xs font-cinzel tracking-wider hover:text-snk-cream transition">REGISTRARSE</Link>
        </div>

        <p className="text-center text-snk-muted text-[10px] font-crimson italic mt-6 opacity-50">
          "Si you win, you live. If you lose, you die."
        </p>
      </div>
    </div>
  )
}
