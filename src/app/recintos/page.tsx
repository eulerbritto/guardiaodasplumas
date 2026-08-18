// src/app/recintos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { ChevronLeft, Trash2, Plus, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

export default function RecintosPage() {
  const supabase = createClient()
  const [recintos, setRecintos] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRecintos()
  }, [])

  async function fetchRecintos() {
    const { data } = await supabase.from('recintos').select('*').order('name')
    if (data) setRecintos(data)
  }

  async function addRecinto(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('recintos').insert({ name: nome, user_id: user?.id })
    
    setNome('')
    setLoading(false)
    fetchRecintos()
  }

  async function deleteRecinto(id: string) {
    if (confirm('Tem certeza? Isso pode afetar aves vinculadas a este recinto.')) {
      await supabase.from('recintos').delete().eq('id', id)
      fetchRecintos()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Gerenciar Recintos</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-4 space-y-6">
        {/* Formulário de Cadastro */}
        <form onSubmit={addRecinto} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
          <input 
            value={nome} 
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Baia 01"
            className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>

        {/* Lista de Recintos */}
        <div className="space-y-3">
          {recintos.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Nenhum recinto cadastrado.</p>
          ) : (
            recintos.map(r => (
              <div key={r.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border border-gray-100">
                <span className="flex items-center gap-3 font-bold text-gray-700">
                  <LayoutGrid className="text-emerald-500 w-5 h-5" /> {r.name}
                </span>
                <button 
                  onClick={() => deleteRecinto(r.id)} 
                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}