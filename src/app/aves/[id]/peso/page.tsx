// src/app/aves/[id]/peso/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Scale, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function RegistrarPesoPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  
  // Data inicial padrão: hoje (formato YYYY-MM-DD)
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Verifica se já existe um registro de peso para esta ave nesta mesma data
      const { data: existing } = await supabase
        .from('bird_measurements')
        .select('id')
        .eq('bird_id', params.id)
        .eq('measured_at', measuredAt)
        .maybeSingle()

      let saveError

      if (existing) {
        // Se já existe, atualiza o registro do dia
        const { error: updateError } = await supabase
          .from('bird_measurements')
          .update({
            weight_kg: parseFloat(weight),
            notes: notes || null,
          })
          .eq('id', existing.id)
        saveError = updateError
      } else {
        // Se não existe, cria um novo
        const { error: insertError } = await supabase
          .from('bird_measurements')
          .insert({
            user_id: user.id,
            bird_id: params.id,
            weight_kg: parseFloat(weight),
            notes: notes || null,
            measured_at: measuredAt,
          })
        saveError = insertError
      }

      if (saveError) throw saveError

      router.push(`/aves/${params.id}`)
      router.refresh()
      
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar peso.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/aves/${params.id}`} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Registrar Peso</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-4">
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          
          <div className="flex justify-center mb-2">
            <div className="bg-blue-50 p-4 rounded-full text-blue-600">
              <Scale className="w-10 h-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Peso (kg) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="Ex: 3.50"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full text-center text-4xl rounded-xl border-gray-300 border p-4 text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-bold tracking-wider"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Medição *</label>
            <input
              type="date"
              required
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 focus:ring-2 focus:ring-emerald-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (Opcional)</label>
            <textarea
              rows={3}
              placeholder="Ex: Pesagem realizada pela manhã..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
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
            {loading ? 'Salvando...' : <><CheckCircle2 className="w-5 h-5" /> Salvar Peso</>}
          </button>
        </form>
      </main>
    </div>
  )
}