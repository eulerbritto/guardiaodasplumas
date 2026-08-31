// src/app/insumos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { ChevronLeft, Plus, Package, ArrowDownRight, ArrowUpRight, AlertTriangle, CheckCircle2, Loader2, ListPlus } from 'lucide-react'
import Link from 'next/link'

type Item = { id: string; name: string; category: string; unit: string; min_stock: number }
type Contact = { id: string; name: string }
type Recinto = { id: string; name: string }

export default function InsumosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'ESTOQUE' | 'ENTRADA' | 'SAIDA' | 'CATALOGO'>('ESTOQUE')

  const [items, setItems] = useState<Item[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [recintos, setRecintos] = useState<Recinto[]>([])
  const [stockBalance, setStockBalance] = useState<Record<string, number>>({})

  // Formulário: Novo Item (Catálogo)
  const [itemForm, setItemForm] = useState({ name: '', category: 'Ração', unit: 'Kg', min_stock: '' })
  
  // Formulário: Transação (Entrada/Saída)
  const [transactionForm, setTransactionForm] = useState({
    item_id: '', quantity: '', transaction_date: new Date().toISOString().split('T')[0],
    total_cost: '', contato_id: '', recinto_id: '', notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [ { data: itemsData }, { data: transData }, { data: contData }, { data: recData } ] = await Promise.all([
      supabase.from('items').select('*').order('name'),
      supabase.from('inventory_transactions').select('item_id, type, quantity'),
      supabase.from('contacts').select('id, name').order('name'),
      supabase.from('recintos').select('id, name').order('name')
    ])

    if (itemsData) setItems(itemsData)
    if (contData) setContacts(contData)
    if (recData) setRecintos(recData)

    // Cálculo automático do estoque (Entradas - Saídas)
    if (itemsData && transData) {
      const balance: Record<string, number> = {}
      itemsData.forEach(item => balance[item.id] = 0)
      
      transData.forEach(t => {
        const qty = Number(t.quantity)
        if (balance[t.item_id] !== undefined) {
          if (t.type === 'IN') balance[t.item_id] += qty
          if (t.type === 'OUT') balance[t.item_id] -= qty
        }
      })
      setStockBalance(balance)
    }
    setLoading(false)
  }

  // === SALVAR NOVO ITEM NO CATÁLOGO ===
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from('items').insert({
      user_id: user?.id,
      name: itemForm.name,
      category: itemForm.category,
      unit: itemForm.unit,
      min_stock: itemForm.min_stock ? parseFloat(itemForm.min_stock) : 0
    })

    setItemForm({ name: '', category: 'Ração', unit: 'Kg', min_stock: '' })
    setSaving(false)
    setActiveTab('ESTOQUE')
    fetchData()
  }

  // === REGISTRAR ENTRADA OU SAÍDA ===
  const handleTransaction = async (e: React.FormEvent, type: 'IN' | 'OUT') => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('inventory_transactions').insert({
      user_id: user?.id,
      item_id: transactionForm.item_id,
      type: type,
      quantity: parseFloat(transactionForm.quantity),
      transaction_date: transactionForm.transaction_date,
      total_cost: type === 'IN' && transactionForm.total_cost ? parseFloat(transactionForm.total_cost) : null,
      contato_id: type === 'IN' ? (transactionForm.contato_id || null) : null,
      recinto_id: type === 'OUT' ? (transactionForm.recinto_id || null) : null,
      notes: transactionForm.notes || null
    })

    setTransactionForm({
      item_id: '', quantity: '', transaction_date: new Date().toISOString().split('T')[0],
      total_cost: '', contato_id: '', recinto_id: '', notes: ''
    })
    setSaving(false)
    setActiveTab('ESTOQUE')
    fetchData()
  }

  // Função para retornar a cor baseada na categoria
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Ração': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medicamento': return 'bg-red-100 text-red-800 border-red-200'
      case 'Vacina': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Suplemento': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700">Carregando Estoque...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Estoque & Insumos</h1>
        </div>

        {/* NAVEGAÇÃO POR ABAS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => setActiveTab('ESTOQUE')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${activeTab === 'ESTOQUE' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            📦 Estoque Atual
          </button>
          <button onClick={() => setActiveTab('ENTRADA')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${activeTab === 'ENTRADA' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            📥 Comprar (Entrada)
          </button>
          <button onClick={() => setActiveTab('SAIDA')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${activeTab === 'SAIDA' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            📤 Consumir (Saída)
          </button>
          <button onClick={() => setActiveTab('CATALOGO')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${activeTab === 'CATALOGO' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            + Novo Item
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-2">
        
        {/* ABA: ESTOQUE ATUAL */}
        {activeTab === 'ESTOQUE' && (
          <div className="space-y-3 animate-in fade-in">
            {items.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-900 font-bold">Catálogo vazio.</p>
                <p className="text-xs text-gray-500 mt-1">Cadastre seus insumos na aba "+ Novo Item".</p>
              </div>
            ) : (
              items.map(item => {
                const balance = stockBalance[item.id] || 0
                const isLow = balance <= item.min_stock
                return (
                  <div key={item.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center transition ${isLow ? 'border-red-300 bg-red-50/20' : 'border-gray-100'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                        {isLow && <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md"><AlertTriangle className="w-3 h-3"/> Baixo</span>}
                      </div>
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Saldo</p>
                      <p className={`text-xl font-black ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {balance} <span className="text-sm font-bold text-gray-500">{item.unit}</span>
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ABA: ENTRADA DE ESTOQUE */}
        {activeTab === 'ENTRADA' && (
          <form onSubmit={(e) => handleTransaction(e, 'IN')} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200 space-y-4 animate-in fade-in">
            <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-100 pb-2">
              <ArrowDownRight className="w-5 h-5" /> Registrar Compra / Entrada
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Insumo / Produto *</label>
              <select required value={transactionForm.item_id} onChange={e => setTransactionForm({...transactionForm, item_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                <option value="">Selecione o produto...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quantidade *</label>
                <input type="number" step="0.01" required placeholder="Ex: 50" value={transactionForm.quantity} onChange={e => setTransactionForm({...transactionForm, quantity: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Valor Total (R$)</label>
                <input type="number" step="0.01" placeholder="Ex: 120.50" value={transactionForm.total_cost} onChange={e => setTransactionForm({...transactionForm, total_cost: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Data da Compra *</label>
                <input type="date" required value={transactionForm.transaction_date} onChange={e => setTransactionForm({...transactionForm, transaction_date: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Fornecedor</label>
                <select value={transactionForm.contato_id} onChange={e => setTransactionForm({...transactionForm, contato_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                  <option value="">Não informado</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50 mt-2">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Confirmar Entrada</>}
            </button>
          </form>
        )}

        {/* ABA: SAÍDA DE ESTOQUE (CONSUMO / LOTE) */}
        {activeTab === 'SAIDA' && (
          <form onSubmit={(e) => handleTransaction(e, 'OUT')} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 space-y-4 animate-in fade-in">
            <h2 className="text-sm font-bold text-orange-800 uppercase tracking-wider flex items-center gap-2 border-b border-orange-100 pb-2">
              <ArrowUpRight className="w-5 h-5" /> Registrar Consumo do Lote
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Insumo / Produto consumido *</label>
              <select required value={transactionForm.item_id} onChange={e => setTransactionForm({...transactionForm, item_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="">Selecione o produto...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} (Saldo: {stockBalance[i.id] || 0} {i.unit})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quantidade Usada *</label>
                <input type="number" step="0.01" required placeholder="Ex: 5" value={transactionForm.quantity} onChange={e => setTransactionForm({...transactionForm, quantity: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Data do Consumo *</label>
                <input type="date" required value={transactionForm.transaction_date} onChange={e => setTransactionForm({...transactionForm, transaction_date: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Destino: Recinto / Baia</label>
              <select value={transactionForm.recinto_id} onChange={e => setTransactionForm({...transactionForm, recinto_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="">Geral / Não especificado</option>
                {recintos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <p className="text-[10px] text-gray-500 mt-1">*O custo será atrelado a este lote.</p>
            </div>

            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50 mt-2">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Confirmar Saída</>}
            </button>
          </form>
        )}

        {/* ABA: NOVO ITEM (CATÁLOGO) */}
        {activeTab === 'CATALOGO' && (
          <form onSubmit={handleAddItem} className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200 space-y-4 animate-in fade-in">
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2 border-b border-blue-100 pb-2">
              <ListPlus className="w-5 h-5" /> Cadastrar Insumo
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Produto *</label>
              <input type="text" required placeholder="Ex: Ração Inicial Guabi" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Categoria *</label>
                <select required value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none">
                  <option value="Ração">Ração</option>
                  <option value="Medicamento">Medicamento</option>
                  <option value="Vacina">Vacina</option>
                  <option value="Suplemento">Suplemento</option>
                  <option value="Estrutural">Estrutural (Maravalha, etc)</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Unidade de Medida *</label>
                <select required value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none">
                  <option value="Kg">Kg</option>
                  <option value="g">Gramas (g)</option>
                  <option value="Litros">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="Doses">Doses</option>
                  <option value="Unidades">Unidades</option>
                  <option value="Fardos">Fardos</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alerta de Estoque Mínimo</label>
              <input type="number" step="0.01" placeholder="Ex: Avisar quando chegar a 10" value={itemForm.min_stock} onChange={e => setItemForm({...itemForm, min_stock: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 outline-none" />
              <p className="text-[10px] text-gray-500 mt-1">*O sistema destacará em vermelho se o estoque ficar abaixo desse número.</p>
            </div>

            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50 mt-2">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Adicionar ao Catálogo</>}
            </button>
          </form>
        )}

      </main>
      <BottomNav />
    </div>
  )
}