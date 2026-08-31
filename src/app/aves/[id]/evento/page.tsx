// src/app/aves/[id]/evento/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Activity, CheckCircle2, Settings2, Plus, Trash2, CalendarPlus, Pill } from 'lucide-react'
import Link from 'next/link'

type ReminderRule = {
  id: string;
  value: string;
  unit: string;
  time: string;
}

export default function NovoEventoPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    event_type: 'HEALTH',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
  })

  // === ESTADOS PARA OPÇÕES AVANÇADAS DE LEMBRETE ===
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([])
  const [ruleValue, setRuleValue] = useState('1')
  const [ruleUnit, setRuleUnit] = useState('days')
  const [ruleTime, setRuleTime] = useState('08:00')

  // === ESTADOS PARA INTEGRAÇÃO COM ESTOQUE ===
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [useInventory, setUseInventory] = useState(false)
  const [inventoryForm, setInventoryForm] = useState({ item_id: '', quantity: '' })

  const isFutureDate = formData.event_date >= new Date().toISOString().split('T')[0]

  // BUSCA O ESTOQUE DE MEDICAMENTOS, VACINAS E SUPLEMENTOS
  useEffect(() => {
    async function fetchInventory() {
      const { data: itemsData } = await supabase.from('items').select('*')
      const { data: transData } = await supabase.from('inventory_transactions').select('item_id, type, quantity')

      if (itemsData && transData) {
        const balanceMap: Record<string, number> = {}
        itemsData.forEach(i => balanceMap[i.id] = 0)
        
        transData.forEach(t => {
          if(t.type === 'IN') balanceMap[t.item_id] += Number(t.quantity)
          if(t.type === 'OUT') balanceMap[t.item_id] -= Number(t.quantity)
        })

        // Filtra apenas categorias relevantes para a tela de saúde
        const relevantItems = itemsData
          .filter(i => ['Medicamento', 'Vacina', 'Suplemento'].includes(i.category))
          .map(i => ({ ...i, balance: balanceMap[i.id] || 0 }))

        setInventoryItems(relevantItems)
      }
    }
    fetchInventory()
  }, [supabase])


  // === FUNÇÕES DE CÁLCULO E AGENDA NATIVA (MANTIDAS INTACTAS) ===
  const addRule = () => {
    if (!ruleValue) return
    setReminderRules([...reminderRules, { id: Math.random().toString(), value: ruleValue, unit: ruleUnit, time: ruleTime }])
  }

  const removeRule = (id: string) => { setReminderRules(reminderRules.filter(r => r.id !== id)) }

  const calculateReminderDateTime = (eventDateStr: string, value: string, unit: string, timeStr: string) => {
    const d = new Date(eventDateStr + 'T00:00:00')
    const val = parseInt(value) || 0
    if (unit === 'minutes') d.setMinutes(d.getMinutes() - val)
    else if (unit === 'hours') d.setHours(d.getHours() - val)
    else if (unit === 'days') d.setDate(d.getDate() - val)
    else if (unit === 'weeks') d.setDate(d.getDate() - (val * 7))
    else if (unit === 'months') d.setMonth(d.getMonth() - val)
    const [hh, mm] = timeStr.split(':')
    d.setHours(parseInt(hh) || 0, parseInt(mm) || 0, 0, 0)
    return d
  }

  const downloadICS = (birdIdentifier: string) => {
    let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Guardião das Plumas//PT\r\nBEGIN:VEVENT\r\nUID:${Date.now()}@guardiaodasplumas.com\r\n`
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    icsContent += `DTSTAMP:${dtStamp}\r\n`
    const dtStart = formData.event_date.replace(/-/g, '')
    icsContent += `DTSTART;VALUE=DATE:${dtStart}\r\nSUMMARY:${formData.event_type === 'HEALTH' ? 'Saúde/Vacina' : 'Evento'} - ${birdIdentifier}\r\nDESCRIPTION:${formData.description}\\n\\nGerado pelo app Guardião das Plumas.\r\n`

    reminderRules.forEach(rule => {
      const alarmStr = calculateReminderDateTime(formData.event_date, rule.value, rule.unit, rule.time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      icsContent += `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Lembrete de Ave: ${birdIdentifier}\r\nTRIGGER;VALUE=DATE-TIME:${alarmStr}\r\nEND:VALARM\r\n`
    })
    icsContent += `END:VEVENT\r\nEND:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `evento_ave_${birdIdentifier.replace(/[^a-z0-9]/gi, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // === SUBMIT INTEGRADO ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      let transactionId = null;

      // 1. Lógica do Estoque (Se ativado)
      if (formData.event_type === 'HEALTH' && useInventory && inventoryForm.item_id && inventoryForm.quantity) {
        const { data: transData, error: transError } = await supabase.from('inventory_transactions').insert({
          user_id: user.id,
          item_id: inventoryForm.item_id,
          type: 'OUT',
          quantity: parseFloat(inventoryForm.quantity),
          transaction_date: formData.event_date,
          bird_id: params.id, // VINCULA A SAÍDA DIRETAMENTE À AVE!
          notes: `Uso individual registrado na ficha médica. Relato: ${formData.description}`
        }).select().single();

        if (transError) throw transError;
        transactionId = transData.id; // Guarda o ID da baixa no estoque
      }

      // 2. Salvar o evento principal da ave
      const { error: insertError } = await supabase.from('bird_events').insert({
        user_id: user.id,
        bird_id: params.id,
        event_type: formData.event_type,
        description: formData.description,
        event_date: formData.event_date,
        transaction_id: transactionId // Amarra o evento de saúde à baixa no estoque
      })

      if (insertError) throw insertError

      // 3. Lógica de Óbito
      if (formData.event_type === 'DEATH') {
        await supabase.from('birds').update({ status: 'INACTIVE' }).eq('id', params.id)
      }

      const { data: birdData } = await supabase.from('birds').select('code, name').eq('id', params.id).single()
      const birdIdentifier = birdData ? `${birdData.code}${birdData.name ? ` (${birdData.name})` : ''}` : 'Ave'

      // 4. Lógica de Lembretes ICS e Internos
      if (reminderRules.length > 0 && isFutureDate) {
        for (const rule of reminderRules) {
          const d = calculateReminderDateTime(formData.event_date, rule.value, rule.unit, rule.time)
          await supabase.from('reminders').insert({
            user_id: user.id,
            title: `[${birdIdentifier}]: ${formData.description}`,
            due_date: d.toISOString().split('T')[0],
            completed: false,
          })
        }
        downloadICS(birdIdentifier)
        setTimeout(() => { router.push(`/aves/${params.id}`); router.refresh() }, 1000)
      } 
      else if (formData.event_type === 'HEALTH' && isFutureDate) {
        await supabase.from('reminders').insert({ user_id: user.id, title: `Saúde [${birdIdentifier}]: ${formData.description}`, due_date: formData.event_date, completed: false })
        router.push(`/aves/${params.id}`)
        router.refresh()
      } 
      else {
        router.push(`/aves/${params.id}`)
        router.refresh()
      }
      
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar evento.')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    // Reseta o estoque se mudar de tipo de evento
    if (e.target.name === 'event_type' && e.target.value !== 'HEALTH') {
      setUseInventory(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/aves/${params.id}`} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Novo Evento / Ocorrência</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-4">
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          
          <div className="flex justify-center mb-2">
            <div className="bg-indigo-50 p-4 rounded-full text-indigo-600">
              <Activity className="w-10 h-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Tipo de Evento *</label>
            <select
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="HEALTH">Saúde / Tratamento / Vacina</option>
              <option value="TRANSFER">Mudança de Recinto / Lote</option>
              <option value="GENERAL">Anotação Geral / Manejo</option>
              <option value="DEATH">Óbito / Falecimento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Data do Evento *</label>
            <input
              type="date"
              name="event_date"
              required
              value={formData.event_date}
              onChange={handleChange}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Descrição / Ocorrência *</label>
            <textarea
              name="description"
              rows={3}
              required
              placeholder="Descreva o que aconteceu..."
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-xl border-gray-300 border p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          {/* ======================= INTEGRAÇÃO COM ESTOQUE ======================= */}
          {formData.event_type === 'HEALTH' && (
            <div className="pt-4 border-t border-gray-100 bg-orange-50/50 p-4 rounded-xl border border-orange-100 -mx-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useInventory} 
                  onChange={(e) => setUseInventory(e.target.checked)} 
                  className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-orange-900 flex items-center gap-1.5"><Pill className="w-4 h-4"/> Dar baixa no estoque?</span>
              </label>

              {useInventory && (
                <div className="mt-4 grid grid-cols-1 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-orange-800 mb-1 uppercase tracking-wider">Item utilizado</label>
                    <select required={useInventory} value={inventoryForm.item_id} onChange={e => setInventoryForm({...inventoryForm, item_id: e.target.value})} className="w-full border-orange-200 rounded-lg p-3 text-sm text-gray-900 font-medium outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                      <option value="">Selecione o medicamento/vacina...</option>
                      {inventoryItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name} (Saldo: {i.balance} {i.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-orange-800 mb-1 uppercase tracking-wider">Quantidade</label>
                    <input type="number" step="0.01" required={useInventory} placeholder="Ex: 2" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: e.target.value})} className="w-full border-orange-200 rounded-lg p-3 text-sm text-gray-900 font-medium outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= OPÇÕES AVANÇADAS DE LEMBRETE ======================= */}
          {isFutureDate && (
            <div className="pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 hover:text-emerald-700 transition"
              >
                <Settings2 className="w-4 h-4" /> Opções Avançadas de Lembrete
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CalendarPlus className="w-4 h-4" /> Adicionar Alarme na Agenda
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-[0.5]">
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Antes do evento</label>
                        <input type="number" min="0" value={ruleValue} onChange={(e) => setRuleValue(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm text-gray-900 font-medium outline-none focus:border-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Unidade</label>
                        <select value={ruleUnit} onChange={(e) => setRuleUnit(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm text-gray-900 font-medium outline-none focus:border-emerald-500">
                          <option value="minutes">Minuto(s)</option>
                          <option value="hours">Hora(s)</option>
                          <option value="days">Dia(s)</option>
                          <option value="weeks">Semana(s)</option>
                          <option value="months">Mês(es)</option>
                        </select>
                      </div>
                      <div className="flex-[0.8]">
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Horário</label>
                        <input type="time" value={ruleTime} onChange={(e) => setRuleTime(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm text-gray-900 font-medium outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                    <button type="button" onClick={addRule} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition">
                      <Plus className="w-4 h-4" /> Incluir Alarme
                    </button>
                  </div>

                  {reminderRules.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                      {reminderRules.map(rule => {
                        const unitsMap: any = { minutes: 'Minutos', hours: 'Horas', days: 'Dias', weeks: 'Semanas', months: 'Meses' };
                        return (
                          <div key={rule.id} className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded-lg">
                            <span className="text-xs font-bold text-gray-700">Avisar {rule.value} {unitsMap[rule.unit]} antes, às {rule.time}</span>
                            <button type="button" onClick={() => removeRule(rule.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )
                      })}
                      <p className="text-[10px] text-gray-500 font-medium italic mt-2 leading-tight">*Ao salvar, o celular solicitará permissão para adicionar os alarmes à sua Agenda.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Salvando...' : <><CheckCircle2 className="w-5 h-5" /> Salvar Evento</>}
          </button>
        </form>
      </main>
    </div>
  )
}