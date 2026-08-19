// src/app/aves/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { Search, Plus, Bird, MapPin, Feather, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function ListaAvesPage() {
  const supabase = createClient()
  const [birds, setBirds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchBirds() {
      // Busca todas as aves ativas e traz os nomes da Espécie, Raça e Recinto
      const { data } = await supabase
        .from('birds')
        .select(`
          id, 
          name, 
          code, 
          gender, 
          main_photo_url, 
          species (name), 
          breeds (name), 
          recintos (name)
        `)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })

      if (data) setBirds(data)
      setLoading(false)
    }

    fetchBirds()
  }, [supabase])

  // Filtra as aves pela barra de pesquisa (busca por nome ou código)
  const filteredBirds = birds.filter(bird => {
    const term = searchTerm.toLowerCase()
    return (
      (bird.name && bird.name.toLowerCase().includes(term)) ||
      (bird.code && bird.code.toLowerCase().includes(term))
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
<header className="bg-white border-b border-gray-200 p-5 sticky top-0 z-10 space-y-4">
        <div className="flex justify-between items-center">
          {/* Agrupamento do Botão Voltar + Título */}
          <div className="flex items-center gap-2">
            <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition" title="Voltar para o Início">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Meu Plantel</h1>
          </div>
          
          {/* Botão de Adicionar Nova Ave */}
          <Link 
            href="/novo" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition shadow-sm"
            title="Adicionar Nova Ave"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none transition"
          />
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="text-center text-gray-800 font-bold py-10 mt-10">Carregando plantel...</div>
        ) : filteredBirds.length === 0 ? (
          <div className="text-center py-10 mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Bird className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-bold">Nenhuma ave encontrada.</p>
            <p className="text-gray-500 text-sm mt-1">Que tal adicionar um novo animal?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBirds.map(bird => (
              <Link key={bird.id} href={`/aves/${bird.id}`} className="block">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:border-emerald-300 transition active:scale-[0.98]">
                  
                  {/* Foto da Ave */}
                  <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                    {bird.main_photo_url ? (
                      <img src={bird.main_photo_url} alt={bird.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Bird className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Informações da Ave */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="text-base font-bold text-gray-900 leading-tight">
                        {bird.name || 'Sem nome'}
                      </h2>
                      <span className="font-mono text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">
                        {bird.code}
                      </span>
                    </div>

                    {/* Espécie e Raça */}
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <Feather className="w-3 h-3" />
                      {bird.species?.name} {bird.breeds?.name ? `· ${bird.breeds.name}` : ''}
                    </p>

                    {/* Recinto e Sexo */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-gray-600">
                      <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        {bird.recintos?.name || 'Não alocado'}
                      </span>
                      <span className="flex items-center gap-1">
                        {bird.gender === 'MALE' ? '♂ Macho' : bird.gender === 'FEMALE' ? '♀ Fêmea' : '❓ Indefinido'}
                      </span>
                    </div>
                  </div>

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