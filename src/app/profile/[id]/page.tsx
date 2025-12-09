'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, AlertTriangle, Shield, Phone, MapPin, Calendar } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { perfisMock } from '@/lib/mock-data';
import { NivelReputacao } from '@/lib/types';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const perfil = perfisMock.find((p) => p.id === id);

  if (!perfil) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Perfil não encontrado</p>
          <Link
            href="/home"
            className="text-[#D4AF37] hover:underline"
          >
            Voltar para início
          </Link>
        </div>
      </div>
    );
  }

  const getReputacaoColor = (nivel: NivelReputacao) => {
    switch (nivel) {
      case 'excelente':
        return 'from-green-500 to-green-600';
      case 'confiavel':
        return 'from-blue-500 to-blue-600';
      case 'atencao':
        return 'from-yellow-500 to-yellow-600';
      case 'perigo':
        return 'from-red-500 to-red-600';
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

  const calcularMediaCategoria = (categoria: keyof typeof perfil.avaliacoes[0]) => {
    if (perfil.avaliacoes.length === 0) return 0;
    const soma = perfil.avaliacoes.reduce((acc, av) => {
      const valor = av[categoria];
      return acc + (typeof valor === 'number' ? valor : 0);
    }, 0);
    return (soma / perfil.avaliacoes.length).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link
            href="/home"
            className="flex items-center gap-2 text-[#D4AF37] hover:text-[#C0C0C0] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 border border-[#D4AF37]/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{perfil.nome}</h1>
              {perfil.idade && (
                <p className="text-gray-400 text-sm">{perfil.idade} anos</p>
              )}
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r ${getReputacaoColor(
                perfil.nivelReputacao
              )} text-white`}
            >
              {getReputacaoLabel(perfil.nivelReputacao)}
            </div>
          </div>

          {perfil.telefone && (
            <div className="flex items-center gap-2 text-gray-300 mb-2">
              <Phone className="w-4 h-4" />
              <span className="text-sm">{perfil.telefone}</span>
            </div>
          )}

          {perfil.cidade && (
            <div className="flex items-center gap-2 text-gray-300 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{perfil.cidade}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">
              Última atualização: {new Date(perfil.ultimaAtualizacao).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#C0C0C0]/10 border border-[#D4AF37]/30 rounded-2xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-8 h-8 text-[#D4AF37] fill-[#D4AF37]" />
              <span className="text-5xl font-bold text-white">
                {perfil.notaGeral.toFixed(1)}
              </span>
            </div>
            <p className="text-gray-400">de 5.0</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#D4AF37]">
                {perfil.porcentagemConfiabilidade}%
              </p>
              <p className="text-xs text-gray-400">Confiabilidade</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{perfil.totalAvaliacoes}</p>
              <p className="text-xs text-gray-400">Avaliações</p>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {perfil.alertas.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold text-red-400">
                Alertas de Segurança
              </h2>
            </div>
            <div className="space-y-3">
              {perfil.alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className="bg-black/30 border border-red-500/20 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-red-400 capitalize">
                      {alerta.tipo}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        alerta.gravidade === 'critica'
                          ? 'bg-red-600 text-white'
                          : alerta.gravidade === 'alta'
                          ? 'bg-orange-600 text-white'
                          : 'bg-yellow-600 text-white'
                      }`}
                    >
                      {alerta.gravidade}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{alerta.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorias de Avaliação */}
        {perfil.avaliacoes.length > 0 && (
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">
              Avaliações por Categoria
            </h2>
            <div className="space-y-4">
              {[
                { key: 'comportamento', label: 'Comportamento' },
                { key: 'segurancaEmocional', label: 'Segurança Emocional' },
                { key: 'respeito', label: 'Respeito' },
                { key: 'carater', label: 'Caráter' },
                { key: 'confianca', label: 'Confiança' },
              ].map((categoria) => {
                const mediaRaw = calcularMediaCategoria(categoria.key as keyof typeof perfil.avaliacoes[0]);
                const media = Number(mediaRaw ?? 0);
                const porcentagem = (media / 5) * 100;

                return (
                  <div key={categoria.key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">{categoria.label}</span>
                      <span className="text-sm font-semibold text-white">
                        {media}/5.0
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] h-2 rounded-full transition-all"
                        style={{ width: `${porcentagem}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Avaliações */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">
            Relatos de Usuárias
          </h2>
          {perfil.avaliacoes.length === 0 ? (
            <div className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-6 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma avaliação ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {perfil.avaliacoes.map((avaliacao) => (
                <div
                  key={avaliacao.id}
                  className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                      <span className="text-sm font-semibold text-white">
                        {(
                          (avaliacao.comportamento +
                            avaliacao.segurancaEmocional +
                            avaliacao.respeito +
                            avaliacao.carater +
                            avaliacao.confianca) /
                          5
                        ).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(avaliacao.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {avaliacao.relato && (
                    <p className="text-sm text-gray-300 mb-3">{avaliacao.relato}</p>
                  )}

                  {avaliacao.redFlags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {avaliacao.redFlags.map((flag, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/30"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-3">
                    {avaliacao.anonimo ? 'Avaliação anônima' : 'Avaliação pública'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/avaliar"
          className="block w-full bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold py-4 rounded-xl text-center hover:opacity-90 transition-opacity"
        >
          Avaliar Este Perfil
        </Link>
      </div>

      <Navbar />
    </div>
  );
}
