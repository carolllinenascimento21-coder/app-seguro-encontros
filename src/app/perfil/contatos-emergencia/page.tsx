'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Trash2, Plus } from 'lucide-react'
import Navbar from '@/components/custom/navbar'

const supabase = createClientComponentClient()

interface Contato {
  id: string
  nome: string
  telefone: string
  ativo: boolean
}

export default function ContatosEmergencia() {
  const [contatos, setContatos] = useState<Contato[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')

  const carregar = async () => {
    const { data } = await supabase
      .from('contatos_emergencia')
      .select('*')
      .order('created_at', { ascending: false })

    setContatos(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  const adicionar = async () => {
    if (!nome || !telefone) return

    await supabase.from('contatos_emergencia').insert({
      nome,
      telefone
    })

    setNome('')
    setTelefone('')
    carregar()
  }

  const remover = async (id: string) => {
    await supabase.from('contatos_emergencia').delete().eq('id', id)
    carregar()
  }

  return (
    <div className="min-h-screen bg-black pb-20 px-4">
      <h1 className="text-2xl font-bold text-white my-6">
        Contatos de Emergência
      </h1>

      <div className="space-y-3 mb-6">
        {contatos.map(c => (
          <div key={c.id} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-white font-bold">{c.nome}</p>
              <p className="text-gray-400 text-sm">{c.telefone}</p>
            </div>
            <button onClick={() => remover(c.id)}>
              <Trash2 className="text-red-400" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 p-4 rounded-xl">
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Nome"
          className="w-full mb-2 p-3 rounded bg-black text-white"
        />
        <input
          value={telefone}
          onChange={e => setTelefone(e.target.value)}
          placeholder="+55..."
          className="w-full mb-4 p-3 rounded bg-black text-white"
        />
        <button
          onClick={adicionar}
          className="w-full bg-[#D4AF37] text-black py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Plus /> Adicionar contato
        </button>
      </div>

      <Navbar />
    </div>
  )
}
