'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Eye, Lock, Shield, AlertTriangle, Star } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { perfisMock } from '@/lib/mock-data';
import { NivelReputacao } from '@/lib/types';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(perfisMock);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setSearchResults(perfisMock);
    } else {
      const filtered = perfisMock.filter(
        (perfil) =>
          perfil.nome.toLowerCase().includes(term.toLowerCase()) ||
          perfil.telefone?.includes(term)
      );
      setSearchResults(filtered);
    }
  };

  const getReputacaoColor = (nivel: NivelReputacao) => {
    switch (nivel) {
      case 'excelente':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'confiavel':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'atencao':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'perigo':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
    }
  };

  const getReputacaoLabel = (nivel: NivelReputacao) => {
    switch (nivel) {
      case 'excelente':
        return 'Excelente';
      case 'confiavel':
        return 'Confiável';
      case 'atencao':
        return 'Atenção';
      case 'perigo':
        return 'Perigo';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <Eye className="w-8 h-8 text-[#D4AF37]" />
              <Lock className="w-4 h-4 text-[#C0C0C0] absolute -bottom-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] bg-clip-text text-transparent">
              Confia+
            </h1>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{perfisMock.length}</p>
            <p className="text-xs text-gray-400">Perfis</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-xl p-4 text-center">
            <Star className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {perfisMock.reduce((acc, p) => acc + p.totalAvaliacoes, 0)}
            </p>
            <p className="text-xs text-gray-400">Avaliações</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {perfisMock.reduce((acc, p) => acc + p.alertas.length, 0)}
            </p>
            <p className="text-xs text-gray-400">Alertas</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <Link
            href="/avaliar"
            className="block w-full bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold py-4 rounded-xl text-center hover:opacity-90 transition-opacity"
          >
            + Avaliar um Homem
          </Link>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">
            {searchTerm ? 'Resultados da Busca' : 'Perfis Recentes'}
          </h2>

          {searchResults.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum perfil encontrado</p>
            </div>
          ) : (
            searchResults.map((perfil) => (
              <Link
                key={perfil.id}
                href={`/profile/${perfil.id}`}
                className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {perfil.nome}
                    </h3>
                    <p className="text-sm text-gray-400">{perfil.cidade}</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getReputacaoColor(
                      perfil.nivelReputacao
                    )}`}
                  >
                    {getReputacaoLabel(perfil.nivelReputacao)}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                    <span className="text-sm font-semibold text-white">
                      {perfil.notaGeral.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {perfil.totalAvaliacoes} avaliações
                  </div>
                  <div className="text-sm text-gray-400">
                    {perfil.porcentagemConfiabilidade}% confiável
                  </div>
                </div>

                {perfil.alertas.length > 0 && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-400">
                      {perfil.alertas.length} alerta(s) ativo(s)
                    </span>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
