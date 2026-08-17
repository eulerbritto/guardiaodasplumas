// src/app/aves/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { Search, PlusCircle, ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'

type Bird = {
  id: string
  code: string
  name: string | null
  variety: string | null
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN'
  species: { name: string } | null
}

export default function PlantelPage() {
  const supabase = createClient()
  const [birds, setBirds] = useState<Bird[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchBirds() {
      const { data, error } = await supabase
        .from('birds')
        .select(`
          id, code, name, variety, gender,
          species ( name )
        `)
        .eq('status', 'ACTIVE')
        .order('code', { ascending: false })

      if (data && !error) {
        setBirds(data as unknown as Bird[])
      }
      setLoading(false)
    }

    fetchBirds()
  }, [supabase])

  const filteredBirds = birds.filter(bird => {
    const search = searchTerm.toLowerCase()
    return (
      bird.code.toLowerCase().includes(search) ||
      (bird.name?.toLowerCase() || '').includes(search) ||
      (bird.variety?.toLowerCase() || '').includes(search) ||
      (bird.species?.name.toLowerCase() || '').includes(search)
    )
  })

  const getGenderBadge = (gender: string) => {
    if (gender === 'MALE') return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Macho</span>
    if (gender === 'FEMALE') return <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-xs font-bold">Fêmea</span>
    return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">Não Identificado</span>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Cabeçalho com Botão de Home e Título */}
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 bg-emerald-700/60 rounded-full hover:bg-emerald-700 transition" title="Ir para a página inicial">
              <Home className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-xl font-bold">Meu Plantel</h1>
          </div>
          <Link href="/novo" className="bg-emerald-700 p-2 rounded-full hover:bg-emerald-800 transition" title="Nova Ave">
            <PlusCircle className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por código, nome, espécie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border-transparent rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-transparent bg-white shadow-sm"
          />
        </div>
      </header>

      {/* Lista de Aves */}
      <main className="p-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Carregando aves...</div>
        ) : filteredBirds.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">Nenhuma ave encontrada.</p>
            {birds.length === 0 && (
              <Link href="/novo" className="text-emerald-600 font-medium hover:underline">
                Cadastrar primeira ave
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredBirds.map((bird) => (
              <Link 
                key={bird.id} 
                href={`/aves/${bird.id}`}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-emerald-300 transition-colors active:scale-[0.98]"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {bird.code}
                    </span>
                    {getGenderBadge(bird.gender)}
                  </div>
                  
                  <h2 className="text-lg font-bold text-gray-800 mt-1">
                    {bird.name || 'Sem nome'}
                  </h2>
                  
                  <p className="text-sm text-gray-600">
                    {bird.species?.name} {bird.variety ? `· ${bird.variety}` : ''}
                  </p>
                </div>
                
                <div className="text-gray-400">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}