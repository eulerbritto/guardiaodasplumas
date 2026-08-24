// src/app/aves/[id]/evento/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Activity, CheckCircle2, Settings2, Plus, Trash2, CalendarPlus } from 'lucide-react'
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

  // Verifica se a data selecionada é futura para liberar os lembretes
  const isFutureDate = formData.event_date >= new Date().toISOString().split('T')[0]

  const addRule = () => {
    if (!ruleValue) return
    setReminderRules([
      ...reminderRules, 
      { id: Math.random().toString(), value: ruleValue, unit: ruleUnit, time: ruleTime }
    ])
  }

  const removeRule = (id: string) => {
    setReminderRules(reminderRules.filter(r => r.id !== id))
  }

  // === FUNÇÕES DE CÁLCULO E AGENDA NATIVA ===
  const calculateReminderDateTime = (eventDateStr: string, value: string, unit: string, timeStr: string) => {
    const d = new Date(eventDateStr + 'T00:00:00') // Garante fuso horário local
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
    let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Guardião das Plumas//PT\r\n`
    icsContent += `BEGIN:VEVENT\r\n`
    icsContent += `UID:${Date.now()}@guardiaodasplumas.com\r\n`
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    icsContent += `DTSTAMP:${dtStamp}\r\n`
    const dtStart = formData.event_date.replace(/-/g, '')
    icsContent += `DTSTART;VALUE=DATE:${dtStart}\r\n`
    icsContent += `SUMMARY:${formData.event_type === 'HEALTH' ? 'Saúde/Vacina' : 'Evento'} - ${birdIdentifier}\r\n`
    icsContent += `DESCRIPTION:${formData.description}\\n\\nGerado pelo app Guardião das Plumas.\r\n`

    // Cria um alarme nativo para cada regra inserida
    reminderRules.forEach(rule => {
      const reminderDate = calculateReminderDateTime(formData.event_date, rule.value, rule.unit, rule.time)
      const alarmStr = reminderDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      icsContent += `BEGIN:VALARM\r\n`
      icsContent += `ACTION:DISPLAY\r\n`
      icsContent += `DESCRIPTION:Lembrete de Ave: ${birdIdentifier}\r\n`
      icsContent += `TRIGGER;VALUE=DATE-TIME:${alarmStr}\r\n`
      icsContent += `END:VALARM\r\n`
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

  // === SUBMIT ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // 1. Salvar o evento principal
      const { error: insertError } = await supabase.from('bird_events').insert({
        user_id: user.id,
        bird_id: params.id,
        event_type: formData.event_type,
        description: formData.description,
        event_date: formData.event_date,
      })

      if (insertError) throw insertError

      // 2. Lógica de Óbito
      if (formData.event_type === 'DEATH') {
        await supabase.from('birds').update({ status: 'INACTIVE' }).eq('id', params.id)
      }

      // 3. Resgata identificador da Ave para os lembretes
      const { data: birdData } = await supabase.from('birds').select('code, name').eq('id', params.id).single()
      const birdIdentifier = birdData ? `${birdData.code}${birdData.name ? ` (${birdData.name})` : ''}` : 'Ave'

      // 4. Se configurou as Regras Avançadas (ICS + Múltiplos Lembretes Internos)
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
        
        // Dispara o download do arquivo de agenda e aguarda um pouco antes de trocar de tela
        downloadICS(birdIdentifier)
        setTimeout(() => {
          router.push(`/aves/${params.id}`)
          router.refresh()
        }, 1000)

      } 
      // 5. Se não usou regras avançadas, mantém o lembrete simples padrão antigo (Apenas para Saúde Futura)
      else if (formData.event_type === 'HEALTH' && isFutureDate) {
        await supabase.from('reminders').insert({
          user_id: user.id,
          title: `Saúde [${birdIdentifier}]: ${formData.description}`,
          due_date: formData.event_date,
          completed: false,
        })
        router.push(`/aves/${params.id}`)
        router.refresh()
      } 
      // Caso padrão (Sem lembretes)
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
                <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CalendarPlus className="w-4 h-4" /> Adicionar Alarme na Agenda
                  </p>
                  
                  {/* Formulário de Adição de Regra */}
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

                  {/* Lista de Regras Adicionadas */}
                  {reminderRules.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                      {reminderRules.map(rule => {
                        const unitsMap: any = { minutes: 'Minutos', hours: 'Horas', days: 'Dias', weeks: 'Semanas', months: 'Meses' };
                        return (
                          <div key={rule.id} className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded-lg">
                            <span className="text-xs font-bold text-gray-700">
                              Avisar {rule.value} {unitsMap[rule.unit]} antes, às {rule.time}
                            </span>
                            <button type="button" onClick={() => removeRule(rule.id)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                      <p className="text-[10px] text-gray-500 font-medium italic mt-2 leading-tight">
                        *Ao salvar o evento, o celular solicitará permissão para adicionar estes horários à sua Agenda (Google Calendar / Apple).
                      </p>
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
            {loading ? 'Salvando e Gerando Agenda...' : <><CheckCircle2 className="w-5 h-5" /> Salvar Evento</>}
          </button>
        </form>
      </main>
    </div>
  )
}