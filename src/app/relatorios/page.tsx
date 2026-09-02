// src/app/relatorios/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { ChevronLeft, BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Bird, Skull, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function RelatoriosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // Por padrão, pega o primeiro e o último dia do mês atual
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstDay)
  const [endDate, setEndDate] = useState(lastDay)

  const [report, setReport] = useState({
    revenues: 0,
    expenses: 0,
    balance: 0,
    birdsSold: 0,
    birdsAcquired: 0,
    birdDeaths: 0,
    inventoryCost: 0,
    inventoryPurchases: 0,
    inventoryConsumptions: 0
  })

  async function fetchReport() {
    setLoading(true)
    
    // 1. Receitas: Aves Vendidas no período
    const { data: sales } = await supabase.from('birds')
      .select('sale_value')
      .eq('status', 'SOLD')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    // 2. Despesas Aves: Aves adquiridas/nascidas no período
    const { data: acquisitions } = await supabase.from('birds')
      .select('acquisition_value')
      .gte('acquisition_date', startDate)
      .lte('acquisition_date', endDate)

    // 3. Óbitos: Baseado na tabela de eventos
    const { data: deaths } = await supabase.from('bird_events')
      .select('id')
      .eq('event_type', 'DEATH')
      .gte('event_date', startDate)
      .lte('event_date', endDate)

    // 4. Insumos (Entradas / Custos)
    const { data: invIn } = await supabase.from('inventory_transactions')
      .select('total_cost, quantity')
      .eq('type', 'IN')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)

    // 5. Insumos (Saídas / Consumo)
    const { data: invOut } = await supabase.from('inventory_transactions')
      .select('quantity')
      .eq('type', 'OUT')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)

    // === CÁLCULOS ===
    const totalSales = sales?.reduce((acc, curr) => acc + (Number(curr.sale_value) || 0), 0) || 0
    const countSold = sales?.length || 0

    const totalAcqCost = acquisitions?.reduce((acc, curr) => acc + (Number(curr.acquisition_value) || 0), 0) || 0
    const countAcq = acquisitions?.length || 0

    const countDeaths = deaths?.length || 0

    const totalInvCost = invIn?.reduce((acc, curr) => acc + (Number(curr.total_cost) || 0), 0) || 0
    const countInvIn = invIn?.length || 0
    const countInvOut = invOut?.length || 0

    const totalExpenses = totalAcqCost + totalInvCost
    const finalBalance = totalSales - totalExpenses

    setReport({
      revenues: totalSales,
      expenses: totalExpenses,
      balance: finalBalance,
      birdsSold: countSold,
      birdsAcquired: countAcq,
      birdDeaths: countDeaths,
      inventoryCost: totalInvCost,
      inventoryPurchases: countInvIn,
      inventoryConsumptions: countInvOut
    })

    setLoading(false)
  }

  // Busca inicial e toda vez que mudar as datas
  useEffect(() => {
    if (startDate && endDate) fetchReport()
  }, [startDate, endDate])

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" /> Relatórios
          </h1>
        </div>

        {/* FILTRO DE DATAS */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-500 shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-700 outline-none focus:border-emerald-500" 
            />
            <span className="text-gray-400 font-bold">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-700 outline-none focus:border-emerald-500" 
            />
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4 mt-2">
        
        {loading ? (
          <div className="text-center py-10 font-bold text-gray-500">Calculando período...</div>
        ) : (
          <div className="animate-in fade-in space-y-4">
            
            {/* 1. RESUMO FINANCEIRO (DASHBOARD) */}
            <section className="bg-gray-900 rounded-2xl p-5 shadow-md text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-24 h-24" />
              </div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Balanço Financeiro</h2>
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end border-b border-gray-700 pb-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400"/> Receitas (Vendas)</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(report.revenues)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1 justify-end"><TrendingDown className="w-3 h-3 text-red-400"/> Despesas (Compras)</p>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(report.expenses)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Resultado do Período</p>
                  <p className={`text-3xl font-black ${report.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(report.balance)}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              {/* 2. CARD PLANTEL */}
              <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <h2 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-2">
                    <Bird className="w-4 h-4" /> Plantel
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Novas Aves</span>
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{report.birdsAcquired}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Vendidas</span>
                      <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{report.birdsSold}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium flex items-center gap-1"><Skull className="w-3 h-3 text-red-400"/> Óbitos</span>
                      <span className="text-sm font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{report.birdDeaths}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. CARD INSUMOS */}
              <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <h2 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-2">
                    <Package className="w-4 h-4" /> Estoque
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Compras</span>
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{report.inventoryPurchases}x</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Consumo</span>
                      <span className="text-sm font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">{report.inventoryConsumptions}x</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-50">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Custo c/ Insumos</p>
                      <p className="text-sm font-bold text-red-600">{formatCurrency(report.inventoryCost)}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
            
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}