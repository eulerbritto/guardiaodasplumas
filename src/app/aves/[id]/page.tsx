// src/app/aves/[id]/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import {
  ChevronLeft, Scale, Camera, QrCode, Calendar, Activity, X, Loader2,
  ShieldAlert, ArrowRightLeft, FileText, Maximize2, ChevronDown, ChevronUp,
  Home, LayoutGrid, Building2, GitFork, CheckCircle2, Skull, Edit3, Save, XCircle, DollarSign,
  User, Phone, Globe, Trash2, Banknote, ShoppingBag
} from 'lucide-react'
import Link from 'next/link'
import { differenceInYears, differenceInMonths, parseISO, format, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function FichaAvePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bird, setBird] = useState<any>(null)
  const [latestWeight, setLatestWeight] = useState<number | null>(null)
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [eventsList, setEventsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Controle de Modais
  const [showQR, setShowQR] = useState(false)
  const [showFullPhoto, setShowFullPhoto] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Estados de Edição
  const [isEditing, setIsEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  
  const [recintos, setRecintos] = useState<any[]>([])
  const [allBirds, setAllBirds] = useState<any[]>([])
  const [allBreeds, setAllBreeds] = useState<any[]>([])
  const [species, setSpecies] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [showAllBreeds, setShowAllBreeds] = useState(false)
  
  const [editForm, setEditForm] = useState({
    name: '', gender: 'UNKNOWN', recinto_id: '', species_id: '', breed_id: '',
    colors: '', birth_date: '', acquisition_date: '', acquisition_value: '',
    contato_id: '', father_id: '', mother_id: ''
  })

  // Estado Formulário de Venda
  const [saleForm, setSaleForm] = useState({
    buyer_id: '', sale_value: '', sale_date: new Date().toISOString().split('T')[0]
  })

  const [showAllWeights, setShowAllWeights] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)

  async function fetchBirdDetails() {
    setLoading(true)
    
    const { data: birdData, error } = await supabase
      .from('birds')
      .select('*, species(name), recintos(name), breeds(name), contacts!contato_id(id, name, contact_name, phone, social_media)')
      .eq('id', params.id)
      .single()

    if (error || !birdData) return setLoading(false)

    if (birdData.father_id) {
      const { data: fData } = await supabase.from('birds').select('id, code, name').eq('id', birdData.father_id).single()
      birdData.father = fData
    }
    if (birdData.mother_id) {
      const { data: mData } = await supabase.from('birds').select('id, code, name').eq('id', birdData.mother_id).single()
      birdData.mother = mData
    }

    setBird(birdData)
    setEditForm({
      name: birdData.name || '', gender: birdData.gender || 'UNKNOWN', recinto_id: birdData.recinto_id || '',
      species_id: birdData.species_id || '', breed_id: birdData.breed_id || '', colors: birdData.colors || '',
      birth_date: birdData.birth_date || '', acquisition_date: birdData.acquisition_date || '',
      acquisition_value: birdData.acquisition_value || '', contato_id: birdData.contato_id || '',
      father_id: birdData.father_id || '', mother_id: birdData.mother_id || ''
    })

    const { data: weightData } = await supabase.from('bird_measurements').select('*').eq('bird_id', params.id).order('measured_at', { ascending: true })
    if (weightData && weightData.length > 0) {
      setLatestWeight(weightData[weightData.length - 1].weight_kg)
      setWeightHistory(weightData.map(w => {
        const d = w.measured_at ? parseISO(w.measured_at) : new Date()
        return { data: format(isValid(d) ? d : new Date(), 'dd/MMM', { locale: ptBR }), dataCompleta: format(isValid(d) ? d : new Date(), 'dd/MM/yyyy', { locale: ptBR }), peso: Number(w.weight_kg), notes: w.notes }
      }))
    }

    const { data: eventsData } = await supabase.from('bird_events').select('*').eq('bird_id', params.id).order('event_date', { ascending: false })
    if (eventsData) setEventsList(eventsData)

    const [ { data: recData }, { data: bData }, { data: brData }, { data: spData }, { data: cData } ] = await Promise.all([
      supabase.from('recintos').select('*').order('name'),
      supabase.from('birds').select('id, name, code, gender, species_id, breed_id'),
      supabase.from('breeds').select('*').order('name'),
      supabase.from('species').select('*').order('name'),
      supabase.from('contacts').select('*').order('name')
    ])

    if (recData) setRecintos(recData)
    if (bData) setAllBirds(bData)
    if (brData) setAllBreeds(brData)
    if (spData) setSpecies(spData)
    if (cData) setContacts(cData)

    setLoading(false)
  }

  useEffect(() => { if (params.id) fetchBirdDetails() }, [params.id, supabase])

  // ==================== AÇÕES (SALVAR, EXCLUIR, VENDER) ====================
  const handleSaveEdit = async () => {
    setSavingEdit(true)
    const { error } = await supabase.from('birds').update({
      name: editForm.name || null, gender: editForm.gender, recinto_id: editForm.recinto_id || null,
      species_id: editForm.species_id || null, breed_id: editForm.breed_id || null, colors: editForm.colors || null,
      birth_date: editForm.birth_date || null, acquisition_date: editForm.acquisition_date || null,
      acquisition_value: editForm.acquisition_value ? parseFloat(editForm.acquisition_value) : null,
      contato_id: editForm.contato_id || null, father_id: editForm.father_id || null, mother_id: editForm.mother_id || null
    }).eq('id', bird.id)

    setSavingEdit(false)
    if (!error) { setIsEditing(false); fetchBirdDetails(); } else alert("Erro ao salvar os dados.")
  }

  const handleDelete = async () => {
    if (window.confirm('⚠️ ATENÇÃO: Deseja realmente excluir esta ave permanentemente? Todo o histórico será apagado.')) {
      await supabase.from('birds').delete().eq('id', bird.id)
      router.push('/aves')
    }
  }

  const handleSellBird = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEdit(true)
    const { error } = await supabase.from('birds').update({
      status: 'SOLD', buyer_id: saleForm.buyer_id || null,
      sale_date: saleForm.sale_date, sale_value: saleForm.sale_value ? parseFloat(saleForm.sale_value) : null
    }).eq('id', bird.id)

    setSavingEdit(false)
    if (!error) { setShowSaleModal(false); fetchBirdDetails(); } else alert("Erro ao registrar a venda.")
  }

  // ==================== OTIMIZAÇÃO DE FOTO (CANVAS) ====================
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080;
          const scaleSize = MAX_WIDTH / img.width;
          
          if (img.width > MAX_WIDTH) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob); else reject(new Error('Falha na compressão'));
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return
      
      const compressedBlob = await compressImage(file)
      const fileName = `${bird.id}-${Math.random()}.jpg`
      
      await supabase.storage.from('birds').upload(fileName, compressedBlob, { upsert: true, contentType: 'image/jpeg' })
      const { data: { publicUrl } } = supabase.storage.from('birds').getPublicUrl(fileName)
      
      await supabase.from('birds').update({ main_photo_url: publicUrl }).eq('id', bird.id)
      setBird({ ...bird, main_photo_url: publicUrl })
    } catch (error) {
      alert('Erro ao enviar a foto.')
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value, ...(name === 'species_id' ? { breed_id: '', father_id: '', mother_id: '' } : {}) }))
    if (name === 'species_id') setShowAllBreeds(false)
  }

  // ==================== FUNÇÕES AUXILIARES ====================
  const getAge = (birthDate: string) => {
    if (!birthDate) return 'Não informada'
    const birth = parseISO(birthDate)
    const today = new Date()
    const years = differenceInYears(today, birth)
    const months = differenceInMonths(today, birth) % 12
    if (years === 0 && months === 0) return 'Menos de 1 mês'
    if (years === 0) return `${months} meses`
    return `${years} ano${years > 1 ? 's' : ''} e ${months} mês(es)`
  }

  const formatDate = (d: string) => d && isValid(parseISO(d)) ? format(parseISO(d), 'dd/MM/yyyy') : 'Não informada'
  const getSocialLink = (t: string) => t.startsWith('http') ? t : t.startsWith('@') ? `https://instagram.com/${t.substring(1)}` : `https://instagram.com/${t}`

  const getEventBadge = (type: string) => {
    if (type === 'HEALTH') return <span className="flex items-center gap-1 bg-red-100 text-red-900 px-2.5 py-1 rounded-full text-xs font-bold"><ShieldAlert className="w-3.5 h-3.5 text-red-700" /> Saúde</span>
    if (type === 'TRANSFER') return <span className="flex items-center gap-1 bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full text-xs font-bold"><ArrowRightLeft className="w-3.5 h-3.5 text-blue-700" /> Mudança</span>
    if (type === 'DEATH' || type === 'Óbito') return <span className="flex items-center gap-1 bg-black text-white px-2.5 py-1 rounded-full text-xs font-bold"><Skull className="w-3.5 h-3.5 text-red-400" /> Óbito</span>
    return <span className="flex items-center gap-1 bg-gray-200 text-gray-900 px-2.5 py-1 rounded-full text-xs font-bold"><FileText className="w-3.5 h-3.5 text-gray-700" /> Geral</span>
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-10 text-center text-gray-800 font-bold">Carregando ficha...</div>
  if (!bird) return <div className="min-h-screen bg-gray-50 p-10 text-center text-gray-800 font-bold">Ave não encontrada.</div>

  const availableBreeds = allBreeds.filter(b => b.species_id === editForm.species_id)
  const usedBreedIds = new Set(allBirds.map(b => b.breed_id).filter(Boolean))
  const usedBreeds = availableBreeds.filter(b => usedBreedIds.has(b.id))
  
  // A VARIÁVEL QUE ESTAVA FALTANDO FOI ADICIONADA AQUI:
  const otherBreedsCount = availableBreeds.length - usedBreeds.length
  
  const displayedBreeds = (showAllBreeds || usedBreeds.length === 0) ? availableBreeds : usedBreeds

  const buyer = bird.buyer_id ? contacts.find(c => c.id === bird.buyer_id) : null
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center">
        <button onClick={() => router.back()} className="p-2.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition"><ChevronLeft className="w-6 h-6" /></button>
        <Link href="/" className="p-2.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition"><Home className="w-5 h-5" /></Link>
      </header>

      {/* ÁREA DA FOTO */}
      <div className="w-full h-64 bg-gray-300 relative flex items-center justify-center group">
        {uploading ? (
          <div className="flex flex-col items-center text-emerald-600"><Loader2 className="w-10 h-10 animate-spin mb-2" /><span className="text-sm font-bold bg-white/90 px-3 py-1 rounded-full text-gray-900">Enviando foto...</span></div>
        ) : bird.main_photo_url ? (
          <><img src={bird.main_photo_url} alt={bird.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setShowFullPhoto(true)} /><button onClick={() => setShowFullPhoto(true)} className="absolute top-16 right-4 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full transition"><Maximize2 className="w-5 h-5" /></button></>
        ) : (
          <div className="flex flex-col items-center text-gray-600 cursor-pointer w-full h-full justify-center" onClick={() => fileInputRef.current?.click()}><Camera className="w-16 h-16 mb-2 text-gray-500" /><span className="text-sm font-bold text-gray-700">Toque para adicionar foto</span></div>
        )}
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
        <div className="absolute bottom-4 left-4 text-white flex justify-between items-end right-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">{bird.code}</span>
              {bird.status === 'SOLD' && <span className="text-xs bg-blue-600 font-bold px-2 py-0.5 rounded-md shadow-sm">VENDIDA</span>}
              {bird.status === 'INACTIVE' && <span className="text-xs bg-red-600 font-bold px-2 py-0.5 rounded-md shadow-sm">Inativo / Óbito</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight drop-shadow-md">{bird.name || 'Sem nome'}</h1>
          </div>
          {bird.main_photo_url && !uploading && <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white font-bold transition">Alterar Foto</button>}
        </div>
      </div>

      <main className="p-4 -mt-2 relative z-20 space-y-4 max-w-lg mx-auto">
        
        {/* ===================== MODO DE EDIÇÃO ===================== */}
        {isEditing ? (
          <div className="bg-white rounded-2xl shadow-md border border-emerald-500 p-5 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2 flex items-center gap-2"><Edit3 className="w-5 h-5 text-emerald-600" /> Editar Perfil da Ave</h3>

            <div><label className="block text-xs font-bold text-gray-700 mb-1">Nome / Apelido</label><input type="text" name="name" value={editForm.name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Espécie</label><select name="species_id" value={editForm.species_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600"><option value="">Selecione...</option>{species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Raça / Variedade</label><select name="breed_id" value={editForm.breed_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600"><option value="">Nenhuma / Mestiço</option>{displayedBreeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>{!showAllBreeds && usedBreeds.length > 0 && otherBreedsCount > 0 && (<button type="button" onClick={() => setShowAllBreeds(true)} className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition">+ Outras {otherBreedsCount} raças...</button>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Cores</label><input type="text" name="colors" value={editForm.colors} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600" /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Sexo</label><select name="gender" value={editForm.gender} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600"><option value="UNKNOWN">Não idenificado</option><option value="MALE">Macho</option><option value="FEMALE">Fêmea</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Nascimento</label><input type="date" name="birth_date" value={editForm.birth_date} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600" /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Recinto / Baia</label><select name="recinto_id" value={editForm.recinto_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600"><option value="">Não alocado</option>{recintos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Aquisição (Data)</label><input type="date" name="acquisition_date" value={editForm.acquisition_date} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600" /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Valor de Aquisição</label><input type="number" step="0.01" name="acquisition_value" value={editForm.acquisition_value} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600" /></div>
            </div>
            <div><label className="block text-xs font-bold text-gray-700 mb-1">Fornecedor / Criatório</label><select name="contato_id" value={editForm.contato_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600"><option value="">Próprio / Não Informado</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Pai</label><select name="father_id" value={editForm.father_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium text-sm outline-none focus:ring-2 focus:ring-emerald-600"><option value="">Desconhecido</option>{allBirds.filter(b => b.species_id === editForm.species_id && b.id !== bird.id && b.gender !== 'FEMALE').map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Mãe</label><select name="mother_id" value={editForm.mother_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium text-sm outline-none focus:ring-2 focus:ring-emerald-600"><option value="">Desconhecida</option>{allBirds.filter(b => b.species_id === editForm.species_id && b.id !== bird.id && b.gender !== 'MALE').map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</select></div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-200 transition"><XCircle className="w-5 h-5" /> Cancelar</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700 transition">{savingEdit ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar</>}</button>
            </div>
            
            <div className="pt-4 mt-2 border-t border-red-100">
              <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 p-3 rounded-xl font-bold hover:bg-red-50 transition"><Trash2 className="w-5 h-5" /> Excluir Ave Permanentemente</button>
            </div>
          </div>
        ) : (
          // ===================== MODO DE VISUALIZAÇÃO =====================
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 relative">
              <button onClick={() => setIsEditing(true)} className="absolute top-4 right-16 p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200 transition"><Edit3 className="w-5 h-5" /></button>
              <button onClick={() => setShowQR(true)} className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-800 rounded-xl hover:bg-gray-100 border border-gray-200 transition"><QrCode className="w-5 h-5" /></button>

              <div className="pr-24">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{bird.species?.name} · {bird.gender === 'MALE' ? 'Macho' : bird.gender === 'FEMALE' ? 'Fêmea' : 'Sexo Indefinido'}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {bird.breeds?.name && <span className="text-gray-900 font-bold bg-gray-100 px-2.5 py-1 rounded-md text-xs border border-gray-200">{bird.breeds.name}</span>}
                  {bird.colors && <span className="text-emerald-900 font-bold bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-100">Cores: {bird.colors}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <LayoutGrid className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div><p className="text-xs font-bold text-gray-500">Recinto / Baia</p><p className="text-sm font-bold text-gray-900">{bird.recintos?.name || 'Não alocado'}</p></div>
                </div>
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Scale className="w-5 h-5 text-blue-600 shrink-0" />
                  <div><p className="text-xs font-bold text-gray-500">Peso Atual</p><p className="text-sm font-bold text-gray-900">{latestWeight ? `${latestWeight} kg` : '--'}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Calendar className="w-5 h-5 text-orange-600 shrink-0" />
                  <div><p className="text-xs font-bold text-gray-500">Idade</p><p className="text-sm font-bold text-gray-900">{getAge(bird.birth_date)}</p></div>
                </div>
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                  <div><p className="text-xs font-bold text-gray-500">Aquisição</p><p className="text-sm font-bold text-gray-900">{formatDate(bird.acquisition_date)}</p></div>
                </div>
              </div>
            </div>

            {/* CARD: Histórico de Venda (Se Vendida) */}
            {bird.status === 'SOLD' && (
              <div className="bg-blue-50 rounded-2xl shadow-sm border border-blue-200 p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-blue-200 pb-3">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Registro de Venda</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs font-bold text-blue-700">Comprador</p><p className="text-sm font-bold text-gray-900">{buyer?.name || 'Não informado'}</p></div>
                  <div><p className="text-xs font-bold text-blue-700">Data da Venda</p><p className="text-sm font-bold text-gray-900">{formatDate(bird.sale_date)}</p></div>
                </div>
                <div><p className="text-xs font-bold text-blue-700">Valor Vendido</p><p className="text-sm font-bold text-gray-900">{bird.sale_value ? `R$ ${bird.sale_value}` : '--'}</p></div>
              </div>
            )}

            {/* CARD: Origem & Genealogia */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <GitFork className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Origem & Genealogia</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { if (bird.contacts) setShowContactModal(true) }} className={`flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-left transition ${bird.contacts ? 'hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer' : 'cursor-default'}`}>
                  <Building2 className={`w-5 h-5 shrink-0 ${bird.contacts ? 'text-emerald-600' : 'text-gray-600'}`} />
                  <div><p className="text-xs font-bold text-gray-500">Fornecedor</p><p className={`text-sm font-bold ${bird.contacts ? 'text-emerald-700 underline decoration-emerald-300 underline-offset-2' : 'text-gray-900'}`}>{bird.contacts?.name || 'Próprio'}</p></div>
                </button>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <DollarSign className="w-5 h-5 text-green-600 shrink-0" />
                  <div><p className="text-xs font-bold text-gray-500">Investimento</p><p className="text-sm font-bold text-gray-900">{bird.acquisition_value ? `R$ ${bird.acquisition_value}` : '--'}</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100"><p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Pai</p>{bird.father ? (<Link href={`/aves/${bird.father.id}`} className="hover:underline block"><p className="text-sm font-bold text-gray-900">{bird.father.code}</p><p className="text-xs text-gray-600 font-medium">{bird.father.name || 'Sem nome'}</p></Link>) : <p className="text-sm font-bold text-gray-400">Desconhecido</p>}</div>
                <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-100"><p className="text-xs font-bold text-pink-700 uppercase tracking-wider mb-1">Mãe</p>{bird.mother ? (<Link href={`/aves/${bird.mother.id}`} className="hover:underline block"><p className="text-sm font-bold text-gray-900">{bird.mother.code}</p><p className="text-xs text-gray-600 font-medium">{bird.mother.name || 'Sem nome'}</p></Link>) : <p className="text-sm font-bold text-gray-400">Desconhecida</p>}</div>
              </div>
            </div>
          </>
        )}

        {/* BOTÕES DE AÇÃO (Esconde se a ave estiver vendida ou inativa) */}
        {!isEditing && bird.status === 'ACTIVE' && (
          <div className="grid grid-cols-3 gap-2">
            <Link href={`/aves/${bird.id}/peso`} className="flex flex-col items-center justify-center p-3 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 active:scale-95 transition-all font-bold text-[11px] gap-1"><Scale className="w-5 h-5" /><span>Pesar</span></Link>
            <Link href={`/aves/${bird.id}/evento`} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 text-gray-900 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all font-bold text-[11px] gap-1"><Activity className="w-5 h-5 text-indigo-600" /><span>Evento</span></Link>
            <button onClick={() => setShowSaleModal(true)} className="flex flex-col items-center justify-center p-3 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all font-bold text-[11px] gap-1"><Banknote className="w-5 h-5" /><span>Vender</span></button>
          </div>
        )}

        {/* ===================== HISTÓRICOS ===================== */}
        {weightHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Evolução de Peso</h3>
            <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={weightHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} labelStyle={{ color: '#111827', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }} itemStyle={{ color: '#059669', fontWeight: 'bold' }} formatter={(value) => [`${value} kg`, 'Peso']} /><Line type="monotone" dataKey="peso" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#047857' }} /></LineChart></ResponsiveContainer></div>
            <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
              <div className="flex justify-between items-center"><h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Histórico de Pesagens</h4><span className="text-xs font-bold text-gray-500">Total: {weightHistory.length}</span></div>
              <div className="space-y-2">{(!showAllWeights ? [...weightHistory].reverse().slice(0, 3) : [...weightHistory].reverse()).map((item, idx) => (<div key={idx} className="bg-gray-50 p-3 rounded-xl flex flex-col gap-1 border border-gray-100"><div className="flex justify-between items-center"><span className="text-sm font-bold text-emerald-800">{item.peso} kg</span><span className="text-xs font-bold text-gray-600">{item.dataCompleta}</span></div>{item.notes && <p className="text-xs text-gray-900 mt-1 bg-white p-2 rounded-lg border border-gray-200"><span className="font-bold text-gray-700">Obs:</span> {item.notes}</p>}</div>))}</div>
              {weightHistory.length > 3 && <button onClick={() => setShowAllWeights(!showAllWeights)} className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-gray-200 mt-2">{showAllWeights ? <>Recolher <ChevronUp className="w-4 h-4" /></> : <>Ver todas as {weightHistory.length} pesagens <ChevronDown className="w-4 h-4" /></>}</button>}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Histórico de Ocorrências</h3><span className="text-xs font-bold text-gray-500">Total: {eventsList.length}</span></div>
          {eventsList.length === 0 ? <p className="text-sm text-gray-500 py-2 font-medium">Nenhum evento registrado.</p> : (<><div className="space-y-4 divide-y divide-gray-100">{(!showAllEvents ? eventsList.slice(0, 3) : eventsList).map((evt) => (<div key={evt.id} className="pt-3 first:pt-0 flex flex-col gap-1.5"><div className="flex justify-between items-center gap-2">{getEventBadge(evt.event_type)}<span className="text-xs font-bold text-gray-600">{formatDate(evt.event_date)}</span></div><p className="text-sm text-gray-900 font-medium mt-1">{evt.description}</p></div>))}</div>{eventsList.length > 3 && <button onClick={() => setShowAllEvents(!showAllEvents)} className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-gray-200 mt-2">{showAllEvents ? <>Recolher <ChevronUp className="w-4 h-4" /></> : <>Ver todas as {eventsList.length} ocorrências <ChevronDown className="w-4 h-4" /></>}</button>}</>)}
        </div>
      </main>

      {/* ===================== MODAIS ===================== */}
      {showFullPhoto && bird.main_photo_url && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md"><button onClick={() => setShowFullPhoto(false)} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition"><X className="w-6 h-6" /></button><img src={bird.main_photo_url} alt={bird.name} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" /></div>
      )}

      {showQR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl relative"><button onClick={() => setShowQR(false)} className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"><X className="w-5 h-5" /></button><h3 className="text-xl font-bold text-gray-900 mb-1">{bird.name || bird.code}</h3><p className="text-sm text-gray-700 mb-6 font-mono font-bold">{bird.code}</p><div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-gray-100 mb-6"><QRCodeSVG value={currentUrl} size={200} level="H" includeMargin={false} /></div><button onClick={() => window.print()} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Imprimir Etiqueta</button></div></div>
      )}

      {/* Modal Contato */}
      {showContactModal && bird.contacts && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative">
            <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-5 border-b pb-4"><div className="bg-emerald-100 p-3 rounded-xl shrink-0"><Building2 className="w-6 h-6 text-emerald-600" /></div><div><h3 className="text-xl font-bold text-gray-900 leading-tight">{bird.contacts.name}</h3><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Criatório de Origem</p></div></div>
            <div className="space-y-4">
              {bird.contacts.contact_name && (<div><p className="text-xs font-bold text-gray-500 mb-1">Responsável / Contato</p><p className="text-sm font-bold text-gray-900 flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> {bird.contacts.contact_name}</p></div>)}
              {bird.contacts.phone && (<div><p className="text-xs font-bold text-gray-500 mb-1">Telefone</p><a href={`tel:${bird.contacts.phone.replace(/\D/g, '')}`} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-2 underline underline-offset-2"><Phone className="w-4 h-4" /> {bird.contacts.phone}</a></div>)}
              {bird.contacts.social_media && (<div><p className="text-xs font-bold text-gray-500 mb-1">Redes Sociais / Site</p><a href={getSocialLink(bird.contacts.social_media)} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-2 underline underline-offset-2"><Globe className="w-4 h-4" /> {bird.contacts.social_media}</a></div>)}
            </div>
            <button onClick={() => setShowContactModal(false)} className="w-full mt-6 py-3 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-xl font-bold transition">Fechar</button>
          </div>
        </div>
      )}

      {/* Modal de VENDA */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative">
            <button onClick={() => setShowSaleModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-5 border-b pb-4"><div className="bg-blue-100 p-3 rounded-xl shrink-0"><Banknote className="w-6 h-6 text-blue-600" /></div><div><h3 className="text-xl font-bold text-gray-900 leading-tight">Registrar Venda</h3><p className="text-xs font-bold text-gray-500">Mudar status para Vendida</p></div></div>
            
            <form onSubmit={handleSellBird} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cliente / Comprador</label>
                <select required value={saleForm.buyer_id} onChange={e => setSaleForm({...saleForm, buyer_id: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none">
                  <option value="" disabled>Selecione o Cliente...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">*Precisa estar cadastrado em "Relacionamentos".</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data da Venda</label>
                  <input type="date" required value={saleForm.sale_date} onChange={e => setSaleForm({...saleForm, sale_date: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Valor Final (R$)</label>
                  <input type="number" step="0.01" required value={saleForm.sale_value} onChange={e => setSaleForm({...saleForm, sale_value: e.target.value})} placeholder="Ex: 2500.00" className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={savingEdit} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">
                  {savingEdit ? 'Registrando...' : 'Confirmar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}