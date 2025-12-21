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
  estado: string | null;
  rating: number;
  total: number;
  keywords: string[];
  hasAlerts: boolean;
}

export default function ConsultarReputacao() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [results, setResults] = useState<Resultado[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!nome.trim()) {
      alert('Digite um nome para buscar.');
      return;
    }

    const forbidden = ['cpf', 'rg', 'endereço', 'telefone', 'documento'];
    if (forbidden.some(t => nome.toLowerCase().includes(t))) {
      alert('Busca contém termos não permitidos.');
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
          estado,
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

      if (estado) {
        query = query.eq('estado', estado.toUpperCase());
      }

      const { data, error } = await query;

      if (error) throw error;

      const agrupado = agruparResultados(data || []);
      setResults(agrupado);

    } catch (err) {
      console.error('Erro na busca pública:', err);
      alert('Erro ao buscar reputação.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getKeywordColor = (keyword: string) => {
    const negative = ['agressivo', 'manipulador', 'desrespeitoso', 'abusivo', 'violento'];
    const positive = ['respeitoso', 'confiável', 'gentil', 'educado', 'atencioso'];

    if (negative.includes(keyword.toLowerCase())) {
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
    if (positive.includes(keyword.toLowerCase())) {
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-bold text-white">
              Consultar Reputação
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Busque informações públicas sobre comportamentos relatados.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 max-w-md mx-auto mt-6">
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#D4AF37]/20">
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">
              Nome *
            </label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
              placeholder="Nome completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <input
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              placeholder="Cidade"
              className="bg-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            <input
              value={estado}
              onChange={e => setEstado(e.target.value)}
              placeholder="UF"
              maxLength={2}
              className="bg-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm uppercase"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
          >
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </div>

        {/* Aviso */}
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <p className="text-blue-200/70 text-xs">
            Apenas informações públicas e não sensíveis são exibidas.
          </p>
        </div>
      </div>

      {/* Resultados */}
      {hasSearched && (
        <div className="px-4 max-w-md mx-auto mt-8">
          <h2 className="text-lg font-bold text-white mb-4">
            Resultados ({results.length})
          </h2>

          <div className="space-y-4">
            {results.map(r => (
              <div
                key={r.slug}
                className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800"
              >
                <div className="flex justify-between mb-2">
                  <div>
                    <h3 className="text-white font-bold">{r.nome}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MapPin className="w-4 h-4" />
                      {r.cidade}{r.estado ? `, ${r.estado}` : ''}
                    </div>
                  </div>
                  {r.hasAlerts && (
                    <AlertTriangle className="text-red-400 w-5 h-5" />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Star className={`${getRatingColor(r.rating)} w-5 h-5 fill-current`} />
                  <span className={`font-bold ${getRatingColor(r.rating)}`}>
                    {r.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-400 text-sm">
                    ({r.total} avaliações)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {r.keywords.map((k, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded-full text-xs border ${getKeywordColor(k)}`}
                    >
                      {k}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => router.push(`/consultar-reputacao/${encodeURIComponent(r.slug)}`)}
                  className="w-full bg-[#D4AF37]/10 text-[#D4AF37] py-2 rounded-lg flex items-center justify-center gap-2"
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

/**
 * 🔧 AGREGA AVALIAÇÕES PÚBLICAS POR PESSOA
 */
function agruparResultados(lista: any[]): Resultado[] {
  const mapa = new Map<string, any>();

  lista.forEach(a => {
    const key = `${a.nome}|${a.cidade}|${a.estado}`;

    if (!mapa.has(key)) {
      mapa.set(key, {
        nome: a.nome,
        cidade: a.cidade,
        estado: a.estado,
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
    estado: v.estado,
    rating: Number((v.soma / v.total).toFixed(1)),
    total: v.total,
    keywords: Array.from(v.keywords).slice(0, 6),
    hasAlerts: v.hasAlerts
  }));
}
