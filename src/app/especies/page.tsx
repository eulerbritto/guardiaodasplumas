// src/app/especies/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { ChevronLeft, Trash2, Plus, Dna, Feather } from 'lucide-react'
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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: spData } = await supabase.from('species').select('*').order('name')
    if (spData) setSpecies(spData)

    const { data: brData } = await supabase.from('breeds').select('*').order('name')
    if (brData) setBreeds(brData)
  }

  async function handleAddSpecies(e: React.FormEvent) {
    e.preventDefault()
    if (!newSpecies.trim()) return
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('species').insert({ name: newSpecies, user_id: user?.id })
    
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
      name: newBreed, 
      species_id: selectedSpeciesId,
      user_id: user?.id 
    })
    
    setNewBreed('')
    setLoading(false)
    fetchData()
  }

  async function deleteSpecies(id: string) {
    if (confirm('Atenção: Excluir uma espécie apagará todas as raças vinculadas a ela. Continuar?')) {
      await supabase.from('species').delete().eq('id', id)
      if (selectedSpeciesId === id) setSelectedSpeciesId('')
      fetchData()
    }
  }

  async function deleteBreed(id: string) {
    if (confirm('Excluir esta raça?')) {
      await supabase.from('breeds').delete().eq('id', id)
      fetchData()
    }
  }

  const filteredBreeds = breeds.filter(b => b.species_id === selectedSpeciesId)

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
            <Dna className="w-5 h-5 text-emerald-600" /> Cadastro de Espécies
          </h2>
          
          <form onSubmit={handleAddSpecies} className="flex gap-2 mb-4">
            <input 
              value={newSpecies} 
              onChange={(e) => setNewSpecies(e.target.value)}
              placeholder="Ex: Faisão, Pavão..."
              className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
            />
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition">
              <Plus className="w-6 h-6" />
            </button>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {species.map(sp => (
              <div key={sp.id} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                <span className="font-bold text-gray-800">{sp.name}</span>
                <button onClick={() => deleteSpecies(sp.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>


        {/* SESSÃO 2: RAÇAS / VARIEDADES */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
            <Feather className="w-5 h-5 text-blue-600" /> Cadastro de Raças
          </h2>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Selecione a Espécie Pai:</label>
            <select 
              value={selectedSpeciesId} 
              onChange={(e) => setSelectedSpeciesId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">-- Escolha uma espécie --</option>
              {species.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          {selectedSpeciesId && (
            <>
              <form onSubmit={handleAddBreed} className="flex gap-2 mb-4">
                <input 
                  value={newBreed} 
                  onChange={(e) => setNewBreed(e.target.value)}
                  placeholder="Ex: Pavão-verde, Arlequim..."
                  className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                />
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition">
                  <Plus className="w-6 h-6" />
                </button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {filteredBreeds.length === 0 ? (
                  <p className="text-xs text-gray-500 font-medium text-center py-2">Nenhuma raça cadastrada para esta espécie.</p>
                ) : (
                  filteredBreeds.map(br => (
                    <div key={br.id} className="bg-blue-50/50 p-3 rounded-xl flex justify-between items-center border border-blue-100">
                      <span className="font-bold text-gray-800">{br.name}</span>
                      <button onClick={() => deleteBreed(br.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>

      </main>

      <BottomNav />
    </div>
  )
}