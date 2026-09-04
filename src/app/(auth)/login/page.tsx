// src/app/(auth)/login/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Controle de Temas
  const [themeName, setThemeName] = useState<'blue' | 'emerald'>('blue')
  
  const router = useRouter()
  const supabase = createClient()

  // Referências para o Easter Egg (5 cliques)
  const clickCountRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Busca o tema que está salvo no dispositivo
    const savedTheme = localStorage.getItem('guardiao-theme') as 'blue' | 'emerald'
    if (savedTheme) {
      setThemeName(savedTheme)
    }
  }, [])

  // Dicionário de Estilos Dinâmicos (Dark Mode para o logo Neon)
  const t = {
    blue: {
      bg: 'bg-black',
      text: 'text-gray-300',
      heading: 'text-white',
      inputBg: 'bg-gray-900 text-white ring-gray-800 placeholder:text-gray-600',
      btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      btnSecondary: 'bg-transparent text-blue-500 ring-blue-600 hover:bg-gray-900',
      ring: 'focus:ring-blue-600'
    },
    emerald: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      heading: 'text-gray-900',
      inputBg: 'bg-white text-gray-900 ring-gray-300 placeholder:text-gray-400',
      btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      btnSecondary: 'bg-white text-emerald-600 ring-emerald-600 hover:bg-gray-50',
      ring: 'focus:ring-emerald-600'
    }
  }[themeName]

  // === LÓGICA DO EASTER EGG (Bypass Rápido) ===
  const handleSecretClick = async () => {
    clickCountRef.current += 1

    if (timerRef.current) clearTimeout(timerRef.current)

    // Reseta o contador se demorar mais de 1 segundo entre os cliques
    timerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 1000)

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0
      if (timerRef.current) clearTimeout(timerRef.current)
      
      // Preenche os campos visualmente apenas no 5º clique
      setEmail('admin@gp.com')
      setPassword('Admin123')
      
      setLoading(true)
      setError('Ativando Acesso Admin...')
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@gp.com',
        password: 'Admin123',
      })

      if (authError) {
        setError('Conta admin@guardiao.com não encontrada no banco.')
        setLoading(false)
      } else {
        router.push('/')
        router.refresh()
      }
    }
  }

  // Função para traduzir os erros do Supabase
  const translateError = (message: string) => {
    if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
    if (message.includes('User already registered')) return 'Este e-mail já está cadastrado.'
    if (message.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.'
    if (message.includes('Email not confirmed')) return 'E-mail não confirmado.'
    return `Erro: ${message}`
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(translateError(error.message))
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(translateError(error.message))
      setLoading(false)
    } else {
      setError('Conta criada com sucesso! Tentando fazer login...')
      await handleLogin(e)
    }
  }

  return (
    <div className={`min-h-screen flex flex-col justify-center px-6 py-12 transition-colors duration-700 ${t.bg}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
        
        {/* LOGOTIPO COM EASTER EGG (Clique 5x Rápido - Cursor Normal) */}
        <div 
          className="w-56 sm:w-64 flex flex-col items-center justify-center mb-6 cursor-default"
          onClick={handleSecretClick}
        >
          <img 
            src="/logo.png" 
            alt="Logotipo Guardião das Plumas" 
            className="w-full h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-200"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            draggable="false"
          />
        </div>

        <h2 className={`text-center text-2xl font-bold leading-9 tracking-tight ${t.heading}`}>
          Guardião das Plumas
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className={`block text-sm font-medium leading-6 ${t.text}`}>
              E-mail
            </label>
            <div className="mt-2">
              <input
                type="email"
                required
                className={`block w-full rounded-xl border-0 py-3 px-4 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-colors ${t.inputBg} ${t.ring}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium leading-6 ${t.text}`}>
              Senha
            </label>
            <div className="mt-2">
              <input
                type="password"
                required
                minLength={6}
                className={`block w-full rounded-xl border-0 py-3 px-4 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-colors ${t.inputBg} ${t.ring}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className={`text-sm text-center font-bold p-3 rounded-xl border ${error.includes('sucesso') || error.includes('Admin') ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-red-900/40 text-red-400 border-red-800'}`}>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex w-full justify-center rounded-xl px-3 py-3.5 text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 ${t.btnPrimary}`}
            >
              {loading ? 'Processando...' : 'Entrar no Sistema'}
            </button>
            
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className={`flex w-full justify-center rounded-xl px-3 py-3.5 text-sm font-bold shadow-sm ring-1 ring-inset transition-all active:scale-[0.98] disabled:opacity-50 ${t.btnSecondary}`}
            >
              Criar nova conta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
