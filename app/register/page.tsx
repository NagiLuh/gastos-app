'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 snk-bg">
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="font-cinzel text-[20vw] font-black text-snk-green opacity-[0.02] select-none whitespace-nowrap">SNK</span>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚔️</div>
          <h1 className="font-cinzel text-2xl font-bold text-snk-cream tracking-widest">NUEVO RECLUTA</h1>
          <p className="text-snk-muted text-xs tracking-[0.3em] mt-1 font-crimson italic">Únete al Cuerpo de Reconocimiento</p>
          <hr className="snk-divider mt-3" />
        </div>

        <form onSubmit={handleRegister} className="snk-card rounded-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-cinzel text-snk-green tracking-widest mb-2">NOMBRE</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="snk-input w-full rounded-sm px-4 py-3 text-sm" placeholder="Tu nombre" />
          </div>
          <div>
            <label className="block text-xs font-cinzel text-snk-green tracking-widest mb-2">IDENTIFICACIÓN</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="snk-input w-full rounded-sm px-4 py-3 text-sm" placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-cinzel text-snk-green tracking-widest mb-2">CONTRASEÑA</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="snk-input w-full rounded-sm px-4 py-3 text-sm" placeholder="Mínimo 6 caracteres" />
          </div>
          {error && (
            <div className="border border-red-900/50 bg-red-950/30 rounded-sm px-3 py-2">
              <p className="text-snk-danger text-xs text-center font-cinzel tracking-wider">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="snk-btn w-full py-3 rounded-sm text-sm font-bold tracking-widest disabled:opacity-40 mt-2">
            {loading ? 'PROCESANDO...' : '⚔ UNIRSE AL CUERPO'}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-snk-muted text-xs font-crimson">¿Ya eres miembro? </span>
          <Link href="/login" className="text-snk-green text-xs font-cinzel tracking-wider hover:text-snk-cream transition">INGRESAR</Link>
        </div>

        <p className="text-center text-snk-muted text-[10px] font-crimson italic mt-6 opacity-50">
          "Dedicate your heart."
        </p>
      </div>
    </div>
  )
}
