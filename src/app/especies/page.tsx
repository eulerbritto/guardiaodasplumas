// src/app/especies/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { ChevronLeft, Trash2, Plus, Dna, Feather, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Species = { id: string; name: string }
type Breed = { id: string; name: string; species_id: string }

export default function EspeciesERacasPage() {
  const supabase = createClient()
  const [species, setSpecies] = useState<Species[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])
  
  const [newSpecies, setNewSpecies] = useState('')
  const [newBreed, setNewBreed] = useState('')
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [ { data: spData }, { data: brData } ] = await Promise.all([
      supabase.from('species').select('*').order('name'),
      supabase.from('breeds').select('*').order('name')
    ])
    
    if (spData) setSpecies(spData)
    if (brData) setBreeds(brData)
    setInitialLoading(false)
  }

  async function handleAddSpecies(e: React.FormEvent) {
    e.preventDefault()
    if (!newSpecies.trim()) return
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('species').insert({ name: newSpecies.trim(), user_id: user?.id })
    
    setNewSpecies('')
    setLoading(false)
    fetchData()
  }

  async function handleAddBreed(e: React.FormEvent) {
    e.preventDefault()
    if (!newBreed.trim() || !selectedSpeciesId) return
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('breeds').insert({ 
      name: newBreed.trim(), 
      species_id: selectedSpeciesId,
      user_id: user?.id 
    })
    
    setNewBreed('')
    setLoading(false)
    fetchData()
  }

  // ==============================================================
  // LÓGICA DE EXCLUSÃO INTELIGENTE CORRIGIDA
  // ==============================================================
  async function deleteSpecies(id: string) {
    if (confirm('Atenção: Excluir uma espécie apagará também as raças cadastradas dentro dela. Continuar?')) {
      
      // 1. O sistema tenta apagar as raças primeiro (evita o bloqueio do banco)
      const { error: breedError } = await supabase.from('breeds').delete().eq('species_id', id)
      
      if (breedError) {
        alert('Erro: Existem AVES cadastradas usando as raças desta espécie. Exclua ou altere as aves primeiro.')
        return
      }

      // 2. Se as raças foram apagadas com sucesso, ele apaga a espécie
      const { error } = await supabase.from('species').delete().eq('id', id)
      
      if (error) {
        alert('Erro: Provavelmente existem AVES cadastradas diretamente nesta espécie.')
      } else {
        if (selectedSpeciesId === id) setSelectedSpeciesId('')
        fetchData()
      }
    }
  }

  async function deleteBreed(id: string) {
    if (confirm('Excluir esta raça?')) {
      const { error } = await supabase.from('breeds').delete().eq('id', id)
      
      if (error) {
        alert('Não é possível excluir. Existem aves cadastradas usando esta raça. Altere a raça da ave antes de excluir.')
      } else {
        fetchData()
      }
    }
  }
  // ==============================================================

  const filteredBreeds = breeds.filter(b => b.species_id === selectedSpeciesId)

  if (initialLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Espécies e Raças</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-2 space-y-6">
        
        {/* SESSÃO 1: ESPÉCIES */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
            <Dna className="w-5 h-5 text-emerald-600" /> Espécies Base
          </h2>
          
          <form onSubmit={handleAddSpecies} className="flex gap-2 mb-4">
            <input 
              value={newSpecies} 
              onChange={(e) => setNewSpecies(e.target.value)}
              placeholder="Nova Espécie (ex: Faisão)"
              className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
            />
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition disabled:opacity-50">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
            </button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {species.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium text-center py-2">Nenhuma espécie cadastrada.</p>
            ) : (
              species.map(sp => (
                <div key={sp.id} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                  <span className="font-bold text-gray-800">{sp.name}</span>
                  <button onClick={() => deleteSpecies(sp.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition" title="Excluir Espécie">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SESSÃO 2: RAÇAS / VARIEDADES */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
            <Feather className="w-5 h-5 text-cyan-600" /> Raças e Variedades
          </h2>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Filtrar por Espécie:</label>
            <select 
              value={selectedSpeciesId} 
              onChange={(e) => setSelectedSpeciesId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 font-bold focus:ring-2 focus:ring-cyan-600 outline-none"
            >
              <option value="">-- Selecione uma espécie --</option>
              {species.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          {selectedSpeciesId && (
            <div className="animate-in fade-in">
              <form onSubmit={handleAddBreed} className="flex gap-2 mb-4">
                <input 
                  value={newBreed} 
                  onChange={(e) => setNewBreed(e.target.value)}
                  placeholder="Nova Raça (ex: Arlequim)"
                  className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-900 font-medium focus:ring-2 focus:ring-cyan-600 outline-none"
                />
                <button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white p-3 rounded-xl transition disabled:opacity-50">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                </button>
              </form>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredBreeds.length === 0 ? (
                  <p className="text-xs text-gray-500 font-medium text-center py-2">Nenhuma raça cadastrada para esta espécie.</p>
                ) : (
                  filteredBreeds.map(br => (
                    <div key={br.id} className="bg-cyan-50/50 p-3 rounded-xl flex justify-between items-center border border-cyan-100">
                      <span className="font-bold text-cyan-900">{br.name}</span>
                      <button onClick={() => deleteBreed(br.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition" title="Excluir Raça">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

      </main>

      <BottomNav />
    </div>
  )
}