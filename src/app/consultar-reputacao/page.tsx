'use client';

import { useState } from 'react';
import {
  Search,
  MapPin,
  AlertTriangle,
  Star,
  TrendingUp,
  Shield
} from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

interface Resultado {
  slug: string;
  nome: string;
  cidade: string | null;
  rating: number;
  total: number;
  keywords: string[];
  hasAlerts: boolean;
}

export default function ConsultarReputacao() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [results, setResults] = useState<Resultado[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!nome.trim()) {
      alert('Digite um nome para buscar.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);

      let query = supabase
        .from('avaliacoes')
        .select(`
          id,
          nome,
          cidade,
          flags,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca
        `)
        .eq('publica', true)
        .ilike('nome', `%${nome}%`);

      if (cidade) {
        query = query.ilike('cidade', `%${cidade}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setResults(agruparResultados(data || []));

    } catch (err) {
      console.error('Erro na busca pública:', err);
      alert('Erro ao buscar reputação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 max-w-md mx-auto pt-8">
        <h1 className="text-2xl font-bold text-white mb-4">
          Consultar Reputação
        </h1>

        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Nome completo"
          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white mb-3"
        />

        <input
          value={cidade}
          onChange={e => setCidade(e.target.value)}
          placeholder="Cidade (opcional)"
          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white mb-4"
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
        >
          {loading ? 'Buscando...' : 'Consultar'}
        </button>
      </div>

      {hasSearched && (
        <div className="px-4 max-w-md mx-auto mt-6">
          <h2 className="text-white font-bold mb-3">
            Resultados ({results.length})
          </h2>

          <div className="space-y-4">
            {results.map(r => (
              <div
                key={r.slug}
                className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800"
              >
                <h3 className="text-white font-bold">{r.nome}</h3>

                {r.cidade && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                    <MapPin className="w-4 h-4" />
                    {r.cidade}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-yellow-400 font-bold">
                    {r.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-400 text-sm">
                    ({r.total} avaliações)
                  </span>
                </div>

                <button
                  onClick={() => alert('Detalhes completos em breve. Esta é uma consulta pública resumida.');}
                  className="w-full bg-[#D4AF37]/10 text-[#D4AF37] py-2 rounded-lg flex justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Ver detalhes
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}

/* 🔧 Agrupamento */
function agruparResultados(lista: any[]): Resultado[] {
  const mapa = new Map<string, any>();

  lista.forEach(a => {
    const key = `${a.nome}|${a.cidade ?? ''}`;

    if (!mapa.has(key)) {
      mapa.set(key, {
        nome: a.nome,
        cidade: a.cidade,
        soma: 0,
        total: 0,
        keywords: new Set<string>(),
        hasAlerts: false
      });
    }

    const media =
      (a.comportamento +
        a.seguranca_emocional +
        a.respeito +
        a.carater +
        a.confianca) / 5;

    const item = mapa.get(key);
    item.soma += media;
    item.total++;

    (a.flags || []).forEach((f: string) => {
      item.keywords.add(f);
      if (['agressivo', 'abusivo', 'violento', 'manipulador'].includes(f)) {
        item.hasAlerts = true;
      }
    });
  });

  return Array.from(mapa.entries()).map(([slug, v]) => ({
    slug,
    nome: v.nome,
    cidade: v.cidade,
    rating: Number((v.soma / v.total).toFixed(1)),
    total: v.total,
    keywords: Array.from(v.keywords).slice(0, 6),
    hasAlerts: v.hasAlerts
  }));
}
