// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Feather } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

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
      // Se a conta for criada, já fazemos o login automaticamente
      await handleLogin(e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
        <div className="bg-emerald-600 p-3 rounded-full mb-4">
          <Feather className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Guardião das Plumas
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              E-mail
            </label>
            <div className="mt-2">
              <input
                type="email"
                required
                className="block w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Senha
            </label>
            <div className="mt-2">
              <input
                type="password"
                required
                minLength={6}
                className="block w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className={`text-sm text-center font-medium p-3 rounded-md ${error.includes('sucesso') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-emerald-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Entrar'}
            </button>
            
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-white px-3 py-3 text-sm font-semibold text-emerald-600 shadow-sm ring-1 ring-inset ring-emerald-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Criar nova conta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}