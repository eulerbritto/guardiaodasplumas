// src/app/novo/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { CheckCircle2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

type Species = { id: string; name: string }
type Breed = { id: string; name: string; species_id: string }
type Recinto = { id: string; name: string }
type Bird = { id: string; name: string | null; code: string; species_id: string; gender: string }

export default function NovaAvePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [species, setSpecies] = useState<Species[]>([])
  const [allBreeds, setAllBreeds] = useState<Breed[]>([]) // Novo estado para as raças
  const [recintos, setRecintos] = useState<Recinto[]>([])
  const [allBirds, setAllBirds] = useState<Bird[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    species_id: '',
    breed_id: '', // NOVO CAMPO: Raça vinculada à espécie
    recinto_id: '',
    origin_breeder: '',
    father_id: '',
    mother_id: '',
    name: '',
    colors: '',
    gender: 'UNKNOWN',
    birth_date: '',
    acquisition_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    async function loadInitialData() {
      // 1. Carregar Espécies
      const { data: speciesData } = await supabase.from('species').select('*').order('name')
      if (speciesData) {
        setSpecies(speciesData)
        const pavao = speciesData.find(s => s.name.toLowerCase() === 'pavão')
        if (pavao) setFormData(prev => ({ ...prev, species_id: pavao.id }))
      }

      // 2. Carregar Raças/Variedades (Todas)
      const { data: breedsData } = await supabase.from('breeds').select('*').order('name')
      if (breedsData) setAllBreeds(breedsData)

      // 3. Carregar Recintos
      const { data: recintosData } = await supabase.from('recintos').select('*').order('name')
      if (recintosData) setRecintos(recintosData)

      // 4. Carregar lista de aves (com gender)
      const { data: birdsData } = await supabase.from('birds').select('id, name, code, species_id, gender').eq('status', 'ACTIVE')
      if (birdsData) setAllBirds(birdsData)
    }
    loadInitialData()
  }, [supabase])

  // Lógica Reativa: Filtrar Raças e Pais dependendo da Espécie escolhida
  const availableBreeds = allBreeds.filter(b => b.species_id === formData.species_id)
  const potentialParents = allBirds.filter(b => b.species_id === formData.species_id)
  
  const potentialFathers = potentialParents.filter(b => b.gender !== 'FEMALE')
  const potentialMothers = potentialParents.filter(b => b.gender !== 'MALE')

  const getSpeciesPrefix = (speciesName: string) => {
    const name = speciesName.toLowerCase()
    if (name.includes('pavão')) return 'PV'
    if (name.includes('galinha')) return 'GL'
    if (name.includes('faisão')) return 'FS'
    if (name.includes('peru')) return 'PR'
    if (name.includes('pato')) return 'PT'
    if (name.includes('ganso')) return 'GS'
    return name.substring(0, 2).toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const selectedSpecies = species.find(s => s.id === formData.species_id)
      if (!selectedSpecies) throw new Error('Espécie inválida')
      
      const prefix = getSpeciesPrefix(selectedSpecies.name)

      const { count } = await supabase
        .from('birds')
        .select('*', { count: 'exact', head: true })
        .eq('species_id', formData.species_id)
      
      const nextNumber = (count || 0) + 1
      const generatedCode = `${prefix}-${String(nextNumber).padStart(6, '0')}`

      // Salva no banco vinculando o breed_id (Raça)
      const { error: insertError } = await supabase.from('birds').insert({
        user_id: user.id,
        code: generatedCode,
        species_id: formData.species_id,
        breed_id: formData.breed_id || null, // Enviando a Raça
        recinto_id: formData.recinto_id || null,
        origin_breeder: formData.origin_breeder || null,
        father_id: formData.father_id || null,
        mother_id: formData.mother_id || null,
        name: formData.name || null,
        colors: formData.colors || null,
        gender: formData.gender,
        birth_date: formData.birth_date || null,
        acquisition_date: formData.acquisition_date || null,
        status: 'ACTIVE',
      })

      if (insertError) throw insertError

      router.push('/aves')
      router.refresh()
      
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar a ave.')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      // Se a pessoa trocar a Espécie, limpamos a Raça para evitar inconsistência
      ...(name === 'species_id' ? { breed_id: '' } : {})
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Registrar Nova Ave</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            {/* Espécie */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Espécie *</label>
              <select name="species_id" required value={formData.species_id} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                <option value="" disabled>Selecione uma espécie</option>
                {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Recinto */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Recinto / Baia</label>
              <select name="recinto_id" value={formData.recinto_id} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                <option value="">Selecione um recinto (Opcional)</option>
                {recintos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {/* ORIGEM E GENEALOGIA */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Origem e Genealogia</h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Criatório de Origem</label>
              <input 
                type="text" 
                name="origin_breeder" 
                placeholder="Ex: Próprio ou Nome do Criatório" 
                value={formData.origin_breeder} 
                onChange={handleChange} 
                className="w-full rounded-lg border-gray-300 border p-3 text-gray-900 font-medium placeholder-gray-400 focus:ring-2 focus:ring-emerald-600 outline-none" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Pai</label>
                <select name="father_id" value={formData.father_id} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                  <option value="">Nenhum/Desconhecido</option>
                  {potentialFathers.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name || 'Sem nome'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Mãe</label>
                <select name="mother_id" value={formData.mother_id} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                  <option value="">Nenhum/Desconhecido</option>
                  {potentialMothers.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name || 'Sem nome'}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* DETALHES DA AVE */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Dados da Ave</h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Nome ou Apelido</label>
              <input type="text" name="name" placeholder="Ex: Thor" value={formData.name} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 text-gray-900 font-medium placeholder-gray-400 focus:ring-2 focus:ring-emerald-600 outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* O NOVO CAMPO DE RAÇA EM FORMATO SELECT */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Raça / Variedade</label>
                <select name="breed_id" value={formData.breed_id} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                  <option value="">Nenhuma</option>
                  {availableBreeds.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Cores</label>
                <input type="text" name="colors" placeholder="Ex: Verde" value={formData.colors} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 text-gray-900 font-medium placeholder-gray-400 focus:ring-2 focus:ring-emerald-600 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Sexo</label>
              <select name="gender" required value={formData.gender} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                <option value="UNKNOWN">Não identificado</option>
                <option value="MALE">Macho</option>
                <option value="FEMALE">Fêmea</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Nascimento</label>
                <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Aquisição</label>
                <input type="date" name="acquisition_date" required value={formData.acquisition_date} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" />
              </div>
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100">{error}</div>}

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50">
            {loading ? 'Salvando...' : <><CheckCircle2 className="w-5 h-5" /> Salvar Nova Ave</>}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  )
}