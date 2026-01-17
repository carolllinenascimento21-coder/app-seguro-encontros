'use client';

import { useState } from 'react';
import { Search, MapPin, Star, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useRouter } from 'next/navigation';

interface Avaliacao {
  id: string;
  nome: string | null;
  cidade: string | null;
  comportamento: number;
  seguranca_emocional: number;
  respeito: number;
  carater: number;
  confianca: number;
  flags_positive: string[];
  flags_negative: string[];
}

export default function ConsultarReputacao() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [results, setResults] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);

  const media = (a: Avaliacao) =>
    (
      (a.comportamento +
        a.seguranca_emocional +
        a.respeito +
        a.carater +
        a.confianca) / 5
    ).toFixed(1);

  const buscar = async () => {
    if (!nome.trim() && !cidade.trim()) {
      alert('Digite um nome ou cidade para buscar.');
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (nome.trim()) params.set('nome', nome.trim());
      if (cidade.trim()) params.set('cidade', cidade.trim());

      const res = await fetch(`/api/busca?${params.toString()}`);

      if (!res.ok) {
        console.error('Erro ao buscar reputação', await res.text());
        alert('Erro ao buscar reputação.');
        return;
      }

      const payload = await res.json();
      setResults(payload.results || []);
    } catch (err) {
      console.error('Erro ao buscar reputação:', err);
      alert('Erro ao buscar reputação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 pt-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">
          Consultar Reputação
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Apenas avaliações públicas são exibidas.
        </p>

        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800 mb-6">
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome (opcional)"
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white mb-3"
          />

          <input
            value={cidade}
            onChange={e => setCidade(e.target.value)}
            placeholder="Cidade (opcional)"
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-white mb-4"
          />

          <button
            onClick={buscar}
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg flex justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </div>

        <div className="space-y-4">
          {results.map(r => (
            <div
              key={r.id}
              className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5 cursor-pointer"
              onClick={() => router.push(`/consultar-reputacao/${r.id}`)}
            >
              <div className="flex justify-between mb-2">
                <div>
                  <h3 className="text-white font-bold">
                    {r.nome || 'Nome não informado'}
                  </h3>
                  {r.cidade && (
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {r.cidade}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[#D4AF37]">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="font-bold">{media(r)}</span>
                </div>
              </div>

              {r.flags_negative?.length > 0 && (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                  <AlertTriangle className="w-4 h-4" />
                  Possui alertas
                </div>
              )}

              {r.flags_negative?.length === 0 && r.flags_positive?.length > 0 && (
                <div className="flex items-center gap-2 text-green-400 text-xs mt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Pontos positivos destacados
                </div>
              )}
            </div>
          ))}

          {!loading && results.length === 0 && (
            <p className="text-gray-500 text-center text-sm">
              Nenhum resultado encontrado.
            </p>
          )}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
