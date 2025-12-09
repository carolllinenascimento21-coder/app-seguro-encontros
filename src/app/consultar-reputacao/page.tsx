'use client';

import { useState } from 'react';
import { Search, MapPin, AlertTriangle, Star, TrendingUp, Shield } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useRouter } from 'next/navigation';

// Dados simulados para demonstração
const mockResults = [
  {
    id: '1',
    name: 'João S.',
    city: 'São Paulo',
    state: 'SP',
    rating: 4.2,
    totalReviews: 8,
    keywords: ['respeitoso', 'confiável', 'gentil'],
    hasAlerts: false
  },
  {
    id: '2',
    name: 'Carlos M.',
    city: 'Rio de Janeiro',
    state: 'RJ',
    rating: 2.1,
    totalReviews: 15,
    keywords: ['agressivo', 'manipulador', 'desrespeitoso'],
    hasAlerts: true
  },
  {
    id: '3',
    name: 'Pedro L.',
    city: 'Belo Horizonte',
    state: 'MG',
    rating: 3.8,
    totalReviews: 5,
    keywords: ['educado', 'atencioso', 'respeitoso'],
    hasAlerts: false
  }
];

export default function ConsultarReputacao() {
  const router = useRouter();
  const [searchName, setSearchName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [results, setResults] = useState<typeof mockResults>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchName.trim()) {
      alert('Por favor, digite um nome para buscar.');
      return;
    }

    // Filtrar termos ilegais/sensíveis
    const forbiddenTerms = ['cpf', 'rg', 'endereço', 'telefone', 'documento'];
    const searchLower = searchName.toLowerCase();
    
    if (forbiddenTerms.some(term => searchLower.includes(term))) {
      alert('Busca contém termos não permitidos. Por favor, busque apenas por nome.');
      return;
    }

    // Simular busca
    let filtered = mockResults;
    
    if (city) {
      filtered = filtered.filter(r => r.city.toLowerCase().includes(city.toLowerCase()));
    }
    
    if (state) {
      filtered = filtered.filter(r => r.state.toLowerCase() === state.toLowerCase());
    }

    setResults(filtered);
    setHasSearched(true);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getKeywordColor = (keyword: string) => {
    const negative = ['agressivo', 'manipulador', 'desrespeitoso', 'violento', 'abusivo'];
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
            <h1 className="text-2xl font-bold text-white">Consultar Reputação</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Busque informações sobre comportamentos relatados por outras usuárias.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="px-4 max-w-md mx-auto mt-6">
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#D4AF37]/20">
          {/* Nome */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do homem *
            </label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Digite o nome completo"
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          {/* Filtros opcionais */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Cidade (opcional)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Estado (opcional)
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Ex: SP"
                maxLength={2}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm uppercase"
              />
            </div>
          </div>

          {/* Botão Consultar */}
          <button
            onClick={handleSearch}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-[#D4AF37]/50 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            Consultar
          </button>
        </div>

        {/* Aviso de segurança */}
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1">
              Informações protegidas
            </p>
            <p className="text-blue-200/70 text-xs">
              Apenas informações não sensíveis são exibidas. Dados pessoais como CPF, endereço e telefone são protegidos.
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="px-4 max-w-md mx-auto mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Resultados ({results.length})
            </h2>
            {results.length === 0 && (
              <p className="text-gray-400 text-sm">Nenhum resultado encontrado</p>
            )}
          </div>

          {/* Result Cards */}
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800 hover:border-[#D4AF37]/50 transition-all"
              >
                {/* Header com alerta */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{result.name}</h3>
                    <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{result.city}, {result.state}</span>
                    </div>
                  </div>
                  {result.hasAlerts && (
                    <div className="bg-red-500/20 p-2 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className={`w-5 h-5 ${getRatingColor(result.rating)} fill-current`} />
                    <span className={`font-bold text-lg ${getRatingColor(result.rating)}`}>
                      {result.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {result.totalReviews} avaliações
                  </span>
                </div>

                {/* Keywords */}
                <div className="mb-4">
                  <p className="text-gray-400 text-xs mb-2">Palavras-chave mais frequentes:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getKeywordColor(keyword)}`}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Botão Ver Detalhes */}
                <button
                  onClick={() => router.push(`/consultar-reputacao/${result.id}`)}
                  className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Ver mais detalhes
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
