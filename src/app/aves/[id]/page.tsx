// src/app/aves/[id]/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import {
  ChevronLeft, Scale, Camera, QrCode, Calendar, Activity, X, Loader2,
  ShieldAlert, ArrowRightLeft, FileText, Maximize2, ChevronDown, ChevronUp,
  Home, LayoutGrid, Building2, GitFork, CheckCircle2, Skull, Edit3, Save, XCircle
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
  const [showQR, setShowQR] = useState(false)
  const [showFullPhoto, setShowFullPhoto] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ESTADOS DE EDIÇÃO
  const [isEditing, setIsEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [recintos, setRecintos] = useState<any[]>([])
  const [allBirds, setAllBirds] = useState<any[]>([])
  const [editForm, setEditForm] = useState({
    name: '',
    gender: 'UNKNOWN',
    recinto_id: '',
    origin_breeder: '',
    father_id: '',
    mother_id: ''
  })

  const [showAllWeights, setShowAllWeights] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)

  async function fetchBirdDetails() {
    setLoading(true)
    
    // 1. Busca a ave de forma simples para evitar erros de relacionamento no banco
    const { data: birdData, error } = await supabase
      .from('birds')
      .select('*, species(name), recintos(name)')
      .eq('id', params.id)
      .single()

    if (error || !birdData) {
      setLoading(false)
      return
    }

    // 2. Busca Pai manualmente (Garante que vai aparecer)
    if (birdData.father_id) {
      const { data: fData } = await supabase.from('birds').select('id, code, name').eq('id', birdData.father_id).single()
      birdData.father = fData
    }

    // 3. Busca Mãe manualmente
    if (birdData.mother_id) {
      const { data: mData } = await supabase.from('birds').select('id, code, name').eq('id', birdData.mother_id).single()
      birdData.mother = mData
    }

    setBird(birdData)
    setEditForm({
      name: birdData.name || '',
      gender: birdData.gender || 'UNKNOWN',
      recinto_id: birdData.recinto_id || '',
      origin_breeder: birdData.origin_breeder || '',
      father_id: birdData.father_id || '',
      mother_id: birdData.mother_id || ''
    })

    // 4. Busca Histórico e Eventos
    const { data: weightData } = await supabase.from('bird_measurements').select('*').eq('bird_id', params.id).order('measured_at', { ascending: true })
    if (weightData && weightData.length > 0) {
      setLatestWeight(weightData[weightData.length - 1].weight_kg)
      const formattedData = weightData.map(w => {
        const parsedDate = w.measured_at ? parseISO(w.measured_at) : new Date()
        const validDate = isValid(parsedDate) ? parsedDate : new Date()
        return {
          data: format(validDate, 'dd/MMM', { locale: ptBR }),
          dataCompleta: format(validDate, 'dd/MM/yyyy', { locale: ptBR }),
          peso: Number(w.weight_kg),
          notes: w.notes
        }
      })
      setWeightHistory(formattedData)
    }

    const { data: eventsData } = await supabase.from('bird_events').select('*').eq('bird_id', params.id).order('event_date', { ascending: false })
    if (eventsData) setEventsList(eventsData)

    // 5. Carrega listas para o formulário de Edição
    const { data: recData } = await supabase.from('recintos').select('*').order('name')
    if (recData) setRecintos(recData)

    const { data: bData } = await supabase.from('birds').select('id, name, code, gender').eq('species_id', birdData.species_id).eq('status', 'ACTIVE')
    if (bData) setAllBirds(bData)

    setLoading(false)
  }

  useEffect(() => {
    if (params.id) fetchBirdDetails()
  }, [params.id, supabase])

  const handleSaveEdit = async () => {
    setSavingEdit(true)
    const { error } = await supabase.from('birds').update({
      name: editForm.name || null,
      gender: editForm.gender,
      recinto_id: editForm.recinto_id || null,
      origin_breeder: editForm.origin_breeder || null,
      father_id: editForm.father_id || null,
      mother_id: editForm.mother_id || null
    }).eq('id', bird.id)

    setSavingEdit(false)
    if (!error) {
      setIsEditing(false)
      fetchBirdDetails() // Recarrega os dados atualizados
    } else {
      alert("Erro ao salvar os dados.")
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return
      const fileExt = file.name.split('.').pop()
      const fileName = `${bird.id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('birds').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('birds').getPublicUrl(fileName)
      await supabase.from('birds').update({ main_photo_url: publicUrl }).eq('id', bird.id)
      setBird({ ...bird, main_photo_url: publicUrl })
    } catch (error) {
      alert('Erro ao enviar a foto.')
    } finally {
      setUploading(false)
    }
  }

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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informada'
    const parsed = parseISO(dateString)
    return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : dateString
  }

  const getEventBadge = (type: string) => {
    if (type === 'HEALTH') return <span className="flex items-center gap-1 bg-red-100 text-red-900 px-2.5 py-1 rounded-full text-xs font-bold"><ShieldAlert className="w-3.5 h-3.5" /> Saúde</span>
    if (type === 'TRANSFER') return <span className="flex items-center gap-1 bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full text-xs font-bold"><ArrowRightLeft className="w-3.5 h-3.5" /> Mudança</span>
    if (type === 'DEATH' || type === 'Óbito') return <span className="flex items-center gap-1 bg-black text-white px-2.5 py-1 rounded-full text-xs font-bold"><Skull className="w-3.5 h-3.5" /> Óbito</span>
    return <span className="flex items-center gap-1 bg-gray-200 text-gray-900 px-2.5 py-1 rounded-full text-xs font-bold"><FileText className="w-3.5 h-3.5" /> Geral</span>
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  if (loading) return <div className="min-h-screen bg-gray-50 p-10 text-center text-gray-800 font-bold">Carregando ficha da ave...</div>
  if (!bird) return <div className="min-h-screen bg-gray-50 p-10 text-center text-gray-800 font-bold">Ave não encontrada.</div>

  const reversedWeights = [...weightHistory].reverse()
  const displayedWeights = showAllWeights ? reversedWeights : reversedWeights.slice(0, 3)
  const displayedEvents = showAllEvents ? eventsList : eventsList.slice(0, 3)

  // FILTROS DE GENEALOGIA (Impede que a própria ave seja selecionada e filtra sexo)
  const potentialFathers = allBirds.filter(b => b.id !== bird.id && b.gender !== 'FEMALE')
  const potentialMothers = allBirds.filter(b => b.id !== bird.id && b.gender !== 'MALE')

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center">
        <button onClick={() => router.back()} className="p-2.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <Link href="/" className="p-2.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70">
          <Home className="w-5 h-5" />
        </Link>
      </header>

      {/* ÁREA DA FOTO */}
      <div className="w-full h-64 bg-gray-300 relative flex items-center justify-center group">
        {uploading ? (
          <div className="flex flex-col items-center text-emerald-600">
            <Loader2 className="w-10 h-10 animate-spin mb-2" />
            <span className="text-sm font-bold bg-white/90 px-3 py-1 rounded-full text-gray-900">Enviando foto...</span>
          </div>
        ) : bird.main_photo_url ? (
          <>
            <img src={bird.main_photo_url} alt={bird.name || bird.code} className="w-full h-full object-cover cursor-pointer" onClick={() => setShowFullPhoto(true)} />
            <button onClick={() => setShowFullPhoto(true)} className="absolute top-16 right-4 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full">
              <Maximize2 className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-gray-600 cursor-pointer w-full h-full justify-center" onClick={() => fileInputRef.current?.click()}>
            <Camera className="w-16 h-16 mb-2 text-gray-500" />
            <span className="text-sm font-bold text-gray-700">Toque para adicionar foto</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
        <div className="absolute bottom-4 left-4 text-white flex justify-between items-end right-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">{bird.code}</span>
              {bird.status === 'INACTIVE' && <span className="text-xs bg-red-600 font-bold px-2 py-0.5 rounded-md">Inativo / Óbito</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight drop-shadow-md">{bird.name || 'Sem nome'}</h1>
          </div>
          {bird.main_photo_url && !uploading && (
            <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-white/20 px-3 py-1.5 rounded-lg text-white font-bold">
              Alterar Foto
            </button>
          )}
        </div>
      </div>

      <main className="p-4 -mt-2 relative z-20 space-y-4 max-w-lg mx-auto">
        
        {/* MODO DE EDIÇÃO vs MODO DE VISUALIZAÇÃO */}
        {isEditing ? (
          <div className="bg-white rounded-2xl shadow-md border border-emerald-500 p-5 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" /> Editar Perfil da Ave
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome / Apelido</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600" placeholder="Ex: Thor" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sexo</label>
                <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600">
                  <option value="UNKNOWN">Não idenificado</option>
                  <option value="MALE">Macho</option>
                  <option value="FEMALE">Fêmea</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Recinto</label>
                <select value={editForm.recinto_id} onChange={e => setEditForm({...editForm, recinto_id: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600">
                  <option value="">Não alocado</option>
                  {recintos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Criatório de Origem</label>
              <input type="text" value={editForm.origin_breeder} onChange={e => setEditForm({...editForm, origin_breeder: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600" placeholder="Próprio / Nome" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pai</label>
                <select value={editForm.father_id} onChange={e => setEditForm({...editForm, father_id: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium text-sm focus:ring-2 focus:ring-emerald-600">
                  <option value="">Desconhecido</option>
                  {potentialFathers.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mãe</label>
                <select value={editForm.mother_id} onChange={e => setEditForm({...editForm, mother_id: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium text-sm focus:ring-2 focus:ring-emerald-600">
                  <option value="">Desconhecida</option>
                  {potentialMothers.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-200 transition">
                <XCircle className="w-5 h-5" /> Cancelar
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700 transition">
                {savingEdit ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar</>}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* MODO VISUALIZAÇÃO - CARD PRINCIPAL */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 relative">
              <button onClick={() => setIsEditing(true)} className="absolute top-4 right-16 p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200 transition" title="Editar Dados">
                <Edit3 className="w-5 h-5" />
              </button>
              <button onClick={() => setShowQR(true)} className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-800 rounded-xl hover:bg-gray-100 border border-gray-200 transition" title="Ver QR Code">
                <QrCode className="w-5 h-5" />
              </button>

              <div className="pr-24">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  {bird.species?.name} · {bird.gender === 'MALE' ? 'Macho' : bird.gender === 'FEMALE' ? 'Fêmea' : 'Sexo Indefinido'}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {bird.variety && <span className="text-gray-900 font-bold bg-gray-100 px-2.5 py-1 rounded-md text-xs border border-gray-200">{bird.variety}</span>}
                  {bird.colors && <span className="text-emerald-900 font-bold bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-100">Cores: {bird.colors}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <LayoutGrid className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-500">Recinto / Baia</p>
                    <p className="text-sm font-bold text-gray-900">{bird.recintos?.name || 'Não alocado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Scale className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-500">Peso Atual</p>
                    <p className="text-sm font-bold text-gray-900">{latestWeight ? `${latestWeight} kg` : '--'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Calendar className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-500">Idade</p>
                    <p className="text-sm font-bold text-gray-900">{getAge(bird.birth_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-500">Aquisição</p>
                    <p className="text-sm font-bold text-gray-900">{formatDate(bird.acquisition_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD: Origem & Genealogia */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <GitFork className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Origem & Genealogia</h2>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <Building2 className="w-5 h-5 text-gray-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-500">Criatório de Origem</p>
                  <p className="text-sm font-bold text-gray-900">{bird.origin_breeder || 'Próprio / Não informado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Pai</p>
                  {bird.father ? (
                    <Link href={`/aves/${bird.father.id}`} className="hover:underline block">
                      <p className="text-sm font-bold text-gray-900">{bird.father.code}</p>
                      <p className="text-xs text-gray-600 font-medium">{bird.father.name || 'Sem nome'}</p>
                    </Link>
                  ) : <p className="text-sm font-bold text-gray-400">Desconhecido</p>}
                </div>

                <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-100">
                  <p className="text-xs font-bold text-pink-700 uppercase tracking-wider mb-1">Mãe</p>
                  {bird.mother ? (
                    <Link href={`/aves/${bird.mother.id}`} className="hover:underline block">
                      <p className="text-sm font-bold text-gray-900">{bird.mother.code}</p>
                      <p className="text-xs text-gray-600 font-medium">{bird.mother.name || 'Sem nome'}</p>
                    </Link>
                  ) : <p className="text-sm font-bold text-gray-400">Desconhecida</p>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Botões de Ação (Peso e Evento) */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/aves/${bird.id}/peso`} className="flex flex-col items-center justify-center p-4 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 active:scale-95 transition-all font-bold text-sm gap-1.5">
            <Scale className="w-6 h-6" /><span>Registrar Peso</span>
          </Link>
          <Link href={`/aves/${bird.id}/evento`} className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 text-gray-900 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all font-bold text-sm gap-1.5">
            <Activity className="w-6 h-6 text-indigo-600" /><span>Novo Evento</span>
          </Link>
        </div>

        {/* Histórico de Pesagem */}
        {weightHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Evolução de Peso</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} labelStyle={{ color: '#111827', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }} itemStyle={{ color: '#059669', fontWeight: 'bold' }} formatter={(value) => [`${value} kg`, 'Peso']} />
                  <Line type="monotone" dataKey="peso" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#047857' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Histórico de Pesagens</h4>
                <span className="text-xs font-bold text-gray-500">Total: {weightHistory.length}</span>
              </div>
              <div className="space-y-2">
                {displayedWeights.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-xl flex flex-col gap-1 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-emerald-800">{item.peso} kg</span>
                      <span className="text-xs font-bold text-gray-600">{item.dataCompleta}</span>
                    </div>
                    {item.notes && <p className="text-xs text-gray-900 mt-1 bg-white p-2 rounded-lg border border-gray-200"><span className="font-bold text-gray-700">Obs:</span> {item.notes}</p>}
                  </div>
                ))}
              </div>
              {weightHistory.length > 3 && (
                <button onClick={() => setShowAllWeights(!showAllWeights)} className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-gray-200 mt-2">
                  {showAllWeights ? <>Recolher <ChevronUp className="w-4 h-4" /></> : <>Ver todas as {weightHistory.length} pesagens <ChevronDown className="w-4 h-4" /></>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Histórico de Ocorrências */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Histórico de Ocorrências</h3>
            <span className="text-xs font-bold text-gray-500">Total: {eventsList.length}</span>
          </div>
          
          {eventsList.length === 0 ? (
            <p className="text-sm text-gray-500 py-2 font-medium">Nenhum evento registrado.</p>
          ) : (
            <>
              <div className="space-y-4 divide-y divide-gray-100">
                {displayedEvents.map((evt) => (
                  <div key={evt.id} className="pt-3 first:pt-0 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center gap-2">
                      {getEventBadge(evt.event_type)}
                      <span className="text-xs font-bold text-gray-600">{formatDate(evt.event_date)}</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium mt-1">{evt.description}</p>
                  </div>
                ))}
              </div>
              {eventsList.length > 3 && (
                <button onClick={() => setShowAllEvents(!showAllEvents)} className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-gray-200 mt-2">
                  {showAllEvents ? <>Recolher <ChevronUp className="w-4 h-4" /></> : <>Ver todas as {eventsList.length} ocorrências <ChevronDown className="w-4 h-4" /></>}
                </button>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal Foto em Tela Cheia */}
      {showFullPhoto && bird.main_photo_url && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <button onClick={() => setShowFullPhoto(false)} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition"><X className="w-6 h-6" /></button>
          <img src={bird.main_photo_url} alt={bird.name || bird.code} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Modal QR Code */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl relative">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{bird.name || bird.code}</h3>
            <p className="text-sm text-gray-700 mb-6 font-mono font-bold">{bird.code}</p>
            <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-gray-100 mb-6">
              <QRCodeSVG value={currentUrl} size={200} level="H" includeMargin={false} />
            </div>
            <button onClick={() => window.print()} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Imprimir Etiqueta</button>
          </div>
        </div>
      )}
    </div>
  )
}