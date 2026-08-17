// src/app/aves/[id]/evento/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Activity, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function NovoEventoPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    event_type: 'HEALTH',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // 1. Salvar o evento na tabela bird_events
      const { error: insertError } = await supabase.from('bird_events').insert({
        user_id: user.id,
        bird_id: params.id,
        event_type: formData.event_type,
        description: formData.description,
        event_date: formData.event_date,
      })

      if (insertError) throw insertError

      // 2. Se for Saúde e a data for FUTURA (maior que hoje), cria um lembrete automático
      const today = new Date().toISOString().split('T')[0]
      if (formData.event_type === 'HEALTH' && formData.event_date > today) {
        // Busca o código e nome da ave para deixar o lembrete identificado
        const { data: birdData } = await supabase
          .from('birds')
          .select('code, name')
          .eq('id', params.id)
          .single()

        const birdIdentifier = birdData 
          ? `${birdData.code}${birdData.name ? ` (${birdData.name})` : ''}` 
          : 'Ave'

        await supabase.from('reminders').insert({
          user_id: user.id,
          title: `Saúde [${birdIdentifier}]: ${formData.description}`,
          due_date: formData.event_date,
          completed: false,
        })
      }

      router.push(`/aves/${params.id}`)
      router.refresh()
      
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar evento.')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/aves/${params.id}`} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Novo Evento / Ocorrência</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-4">
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          
          <div className="flex justify-center mb-2">
            <div className="bg-indigo-50 p-4 rounded-full text-indigo-600">
              <Activity className="w-10 h-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento *</label>
            <select
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="HEALTH">Saúde / Tratamento / Vacina</option>
              <option value="TRANSFER">Mudança de Recinto / Lote</option>
              <option value="GENERAL">Anotação Geral / Manejo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Evento *</label>
            <input
              type="date"
              name="event_date"
              required
              value={formData.event_date}
              onChange={handleChange}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Ocorrência *</label>
            <textarea
              name="description"
              rows={4}
              required
              placeholder="Descreva o que aconteceu (ex: Aplicar reforço de vacina...)"
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : <><CheckCircle2 className="w-5 h-5" /> Salvar Evento</>}
          </button>
        </form>
      </main>
    </div>
  )
}