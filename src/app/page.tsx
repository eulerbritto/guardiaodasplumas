// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { Users, PlusCircle, QrCode, LogOut, ChevronRight, Calendar, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [totalBirds, setTotalBirds] = useState(0)
  const [reminders, setReminders] = useState<any[]>([])
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderDate, setNewReminderDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // 1. Total de aves
      const { count } = await supabase
        .from('birds')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
      
      if (count !== null) setTotalBirds(count)

      // 2. Lembretes pendentes
      const { data: remindersData } = await supabase
        .from('reminders')
        .select('*')
        .eq('completed', false)
        .order('due_date', { ascending: true })

      if (remindersData) setReminders(remindersData)

      setLoading(false)
    }
    fetchData()
  }, [supabase])

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReminderText.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('reminders').insert({
      user_id: user.id,
      title: newReminderText,
      due_date: newReminderDate,
      completed: false
    }).select().single()

    if (!error && data) {
      setReminders([...reminders, data].sort((a, b) => a.due_date.localeCompare(b.due_date)))
      setNewReminderText('')
    }
  }

  const handleCompleteReminder = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ completed: true })
      .eq('id', id)

    if (!error) {
      setReminders(reminders.filter(r => r.id !== id))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Cabeçalho */}
      <header className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Bem-vindo ao</p>
            <h1 className="text-2xl font-bold">Guardião das Plumas</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-emerald-700/60 rounded-full hover:bg-emerald-700 transition"
            title="Sair da conta"
          >
            <LogOut className="w-5 h-5 text-emerald-100" />
          </button>
        </div>

        {/* Card de Resumo do Plantel */}
        <Link 
          href="/aves" 
          className="bg-emerald-700/50 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between hover:bg-emerald-700/70 transition"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-3 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">Total no Plantel</p>
              <p className="text-2xl font-bold">{loading ? '...' : totalBirds} aves ativas</p>
            </div>
          </div>
          <div className="bg-white/10 p-2 rounded-full">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </Link>
      </header>

      {/* Ações Rápidas */}
      <main className="p-4 max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1 mb-3">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/novo" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-emerald-300 transition group">
              <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 w-fit group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-base font-bold text-gray-800 block">Nova Ave</span>
                <span className="text-xs text-gray-500">Cadastrar no sistema</span>
              </div>
            </Link>

            <Link href="/scanner" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-emerald-300 transition group">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600 w-fit group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <span className="text-base font-bold text-gray-800 block">Escanear</span>
                <span className="text-xs text-gray-500">Ler QR Code da ave</span>
              </div>
            </Link>
          </div>
        </div>

        {/* SEÇÃO DE LEMBRETES E AGENDA FUTURA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-gray-800">Lembretes & Agenda</h2>
            </div>
            <span className="text-xs font-bold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
              {reminders.length} pendentes
            </span>
          </div>

          {/* Formulário para adicionar novo lembrete com texto em preto (text-gray-900) */}
          <form onSubmit={handleAddReminder} className="flex gap-2 pt-2">
            <input 
              type="text" 
              placeholder="Novo lembrete (ex: Vacinar lote...)" 
              value={newReminderText}
              onChange={(e) => setNewReminderText(e.target.value)}
              className="flex-1 text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
            />
            <input 
              type="date" 
              value={newReminderDate}
              onChange={(e) => setNewReminderDate(e.target.value)}
              className="text-xs text-gray-900 border border-gray-200 rounded-xl px-2 py-2.5 bg-white"
            />
            <button 
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition"
            >
              +
            </button>
          </form>

          {/* Lista de Lembretes */}
          <div className="space-y-2 pt-2">
            {reminders.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum lembrete pendente na agenda.</p>
            ) : (
              reminders.map((rem) => (
                <div key={rem.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleCompleteReminder(rem.id)}
                      className="text-gray-300 hover:text-emerald-600 transition"
                      title="Concluir lembrete"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{rem.title}</p>
                      <p className="text-xs text-orange-600 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        {format(parseISO(rem.due_date), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Atalho para Plantel */}
        <div>
          <Link 
            href="/aves" 
            className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-gray-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-3 rounded-xl text-gray-600">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-800">Ver Lista do Plantel</h3>
                <p className="text-xs text-gray-500">Buscar, filtrar e gerenciar todas as aves</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}