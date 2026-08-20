// src/app/aves/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { Search, Plus, Bird, MapPin, Feather, ChevronLeft, Layers, Filter } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function ListaAvesContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialSpeciesId = searchParams.get('species_id') || 'ALL'

  const [birds, setBirds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [selectedSpecies, setSelectedSpecies] = useState(initialSpeciesId)
  const [groupByRecinto, setGroupByRecinto] = useState(false)
  const [availableSpecies, setAvailableSpecies] = useState<any[]>([])

  useEffect(() => {
    async function fetchBirds() {
      const { data } = await supabase
        .from('birds')
        .select(`
          id, name, code, gender, main_photo_url, 
          species (id, name), breeds (name), recintos (name)
        `)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })

      if (data) {
        setBirds(data)
        
        // Extrai espécies únicas para o Dropdown de filtro
        const uniqueSp = new Map()
        // Adicionando (b: any) para resolver o erro TS2339 da Vercel
        data.forEach((b: any) => {
          const sp = b.species as any
          const spId = sp?.id || 'indef'
          const spName = sp?.name || 'Indefinidos'
          if (!uniqueSp.has(spId)) uniqueSp.set(spId, { id: spId, name: spName })
        })
        setAvailableSpecies(Array.from(uniqueSp.values()))
      }
      setLoading(false)
    }
    fetchBirds()
  }, [supabase])

  // Lógica de Filtragem (Pesquisa + Dropdown de Espécie)
  const filteredBirds = birds.filter((bird: any) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = (bird.name && bird.name.toLowerCase().includes(term)) || 
                          (bird.code && bird.code.toLowerCase().includes(term))
    
    const sp = bird.species as any
    const spId = sp?.id || 'indef'
    const matchesSpecies = selectedSpecies === 'ALL' || spId === selectedSpecies

    return matchesSearch && matchesSpecies
  })

  // Lógica de Agrupamento - Resolvendo o erro TS18046 (typeof birds)
  const groupedBirds = filteredBirds.reduce((acc: Record<string, any[]>, bird: any) => {
    const rec = bird.recintos as any
    const recintoName = rec?.name || 'Não alocado'
    if (!acc[recintoName]) acc[recintoName] = []
    acc[recintoName].push(bird)
    return acc
  }, {})

  // Componente de Cartão isolado para não repetir código
  const BirdCard = ({ bird }: { bird: any }) => {
    const sp = bird.species as any
    const br = bird.breeds as any
    const rec = bird.recintos as any
    
    return (
      <Link key={bird.id} href={`/aves/${bird.id}`} className="block">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:border-emerald-300 transition active:scale-[0.98]">
          <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
            {bird.main_photo_url ? (
              <img src={bird.main_photo_url} alt={bird.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400"><Bird className="w-8 h-8" /></div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-base font-bold text-gray-900 leading-tight">{bird.name || 'Sem nome'}</h2>
              <span className="font-mono text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">{bird.code}</span>
            </div>
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <Feather className="w-3 h-3" />
              {sp?.name || 'Indefinida'} {br?.name ? `· ${br.name}` : ''}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-gray-600">
              <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                <MapPin className="w-3 h-3 text-blue-600" />
                {rec?.name || 'Não alocado'}
              </span>
              <span className="flex items-center gap-1">
                {bird.gender === 'MALE' ? '♂ Macho' : bird.gender === 'FEMALE' ? '♀ Fêmea' : '❓ Indefinido'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 p-5 sticky top-0 z-10 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition" title="Voltar para o Início">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Meu Plantel</h1>
          </div>
          <Link href="/novo" className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition shadow-sm">
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

        {/* FILTROS E AGRUPAMENTO */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Filter className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
            <select 
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 text-sm font-bold focus:ring-2 focus:ring-emerald-600 outline-none appearance-none"
            >
              <option value="ALL">Todas as Espécies</option>
              {availableSpecies.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => setGroupByRecinto(!groupByRecinto)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold border transition ${groupByRecinto ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            <Layers className="w-4 h-4" />
            Recinto
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="text-center text-gray-800 font-bold py-10 mt-10">Carregando plantel...</div>
        ) : filteredBirds.length === 0 ? (
          <div className="text-center py-10 mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Bird className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-bold">Nenhuma ave encontrada.</p>
          </div>
        ) : (
          groupByRecinto ? (
            // RENDERIZAÇÃO AGRUPADA - Tipagem explícita para evitar o erro TS7006 e TS18046
            <div className="space-y-6">
              {Object.entries(groupedBirds).map(([recinto, aves]: [string, any[]]) => (
                <div key={recinto}>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 border-b border-gray-200 pb-2 flex justify-between items-center">
                    <span>{recinto}</span>
                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full normal-case">{aves.length} aves</span>
                  </h3>
                  <div className="space-y-3">
                    {aves.map((bird: any) => <BirdCard key={bird.id} bird={bird} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // RENDERIZAÇÃO LISTA SIMPLES
            <div className="space-y-3">
              {filteredBirds.map((bird: any) => <BirdCard key={bird.id} bird={bird} />)}
            </div>
          )
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default function ListaAvesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-10 text-center text-gray-800 font-bold">Iniciando...</div>}>
      <ListaAvesContent />
    </Suspense>
  )
}