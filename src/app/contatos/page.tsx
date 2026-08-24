// src/app/contatos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { ChevronLeft, Trash2, Plus, Users, Phone, User, Globe, Tag } from 'lucide-react'
import Link from 'next/link'

type Contact = { id: string; name: string; contact_name: string; phone: string; social_media: string; type: string }

export default function ContatosPage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({ name: '', contact_name: '', phone: '', social_media: '', type: 'Ambos' })

  useEffect(() => {
    fetchContacts()
  }, [])

  async function fetchContacts() {
    const { data } = await supabase.from('contacts').select('*').order('name')
    if (data) setContacts(data)
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) return
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('contacts').insert({ ...formData, user_id: user?.id })
    
    setFormData({ name: '', contact_name: '', phone: '', social_media: '', type: 'Ambos' })
    setLoading(false)
    fetchContacts()
  }

  async function deleteContact(id: string) {
    if (confirm('Excluir este contato?')) {
      await supabase.from('contacts').delete().eq('id', id)
      fetchContacts()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"><ChevronLeft className="w-6 h-6" /></Link>
          <h1 className="text-xl font-bold text-gray-900">Relacionamentos</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
            <Users className="w-5 h-5 text-emerald-600" /> Novo Contato
          </h2>
          
          <form onSubmit={handleAddContact} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome (Pessoa ou Criatório) *</label>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Ex: Criadouro Silva / João" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Relação</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none">
                  <option value="Ambos">Ambos</option>
                  <option value="Fornecedor">Fornecedor</option>
                  <option value="Cliente">Cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pessoa Responsável</label>
                <input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Ex: João" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Ex: 31999999999" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Rede Social / Site</label>
                <input value={formData.social_media} onChange={e => setFormData({...formData, social_media: e.target.value})} className="w-full border rounded-lg p-3 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Ex: @criadouro" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold flex justify-center gap-2 transition">
              <Plus className="w-5 h-5" /> Adicionar Contato
            </button>
          </form>
        </section>

        <div className="space-y-3">
          {contacts.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{c.name}</h3>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">{c.type}</span>
                </div>
                {c.contact_name && <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><User className="w-3 h-3"/> {c.contact_name}</p>}
                {c.phone && <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/> {c.phone}</p>}
                {c.social_media && <p className="text-xs text-blue-600 flex items-center gap-1 mt-1"><Globe className="w-3 h-3"/> {c.social_media}</p>}
              </div>
              <button onClick={() => deleteContact(c.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}