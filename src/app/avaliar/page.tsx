'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, AlertTriangle, Send } from 'lucide-react';
import Navbar from '@/components/custom/navbar';

export default function AvaliarPage() {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cidade: '',
    comportamento: 0,
    segurancaEmocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
    relato: '',
    redFlags: [] as string[],
    anonimo: true,
  });

  const [submitted, setSubmitted] = useState(false);

  const categorias = [
    { key: 'comportamento', label: 'Comportamento' },
    { key: 'segurancaEmocional', label: 'Segurança Emocional' },
    { key: 'respeito', label: 'Respeito' },
    { key: 'carater', label: 'Caráter' },
    { key: 'confianca', label: 'Confiança' },
  ];

  const redFlagsOptions = [
    'Mentiras constantes',
    'Manipulação emocional',
    'Desrespeito',
    'Agressividade',
    'Falta de respeito',
    'Imaturidade emocional',
    'Traição',
    'Golpe amoroso',
    'Stalking',
    'Comportamento abusivo',
  ];

  const handleRating = (categoria: string, valor: number) => {
    setFormData((prev) => ({ ...prev, [categoria]: valor }));
  };

  const toggleRedFlag = (flag: string) => {
    setFormData((prev) => ({
      ...prev,
      redFlags: prev.redFlags.includes(flag)
        ? prev.redFlags.filter((f) => f !== flag)
        : [...prev.redFlags, flag],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui seria a integração com backend
    setSubmitted(true);
    setTimeout(() => {
      window.location.href = '/home';
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-2xl font-bold text-[#D4AF37] mb-2">
            Avaliação Enviada!
          </h2>
          <p className="text-gray-400">
            Obrigada por contribuir com a segurança de outras mulheres.
          </p>
        </div>
      </div>
    );
  }

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#D4AF37] mb-2">
            Avaliar um Homem
          </h1>
          <p className="text-gray-400 text-sm">
            Sua avaliação ajuda outras mulheres a tomarem decisões seguras.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Informações Básicas
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="Digite o nome completo"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Telefone (opcional)
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telefone: e.target.value }))
                  }
                  className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Cidade (opcional)
                </label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cidade: e.target.value }))
                  }
                  className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="Cidade, Estado"
                />
              </div>
            </div>
          </div>

          {/* Avaliações por Categoria */}
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Avalie por Categoria
            </h2>

            <div className="space-y-6">
              {categorias.map((categoria) => (
                <div key={categoria.key}>
                  <label className="block text-sm text-gray-300 mb-3">
                    {categoria.label}
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((valor) => {
                      const categoriaKey = categoria.key as keyof typeof formData;
                      const rawValue = formData[categoriaKey];
                      const current = typeof rawValue === "number" ? rawValue : Number(rawValue || 0);
                      const isActive = current >= valor;

                      return (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => handleRating(categoria.key, valor)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              isActive
                                ? 'text-[#D4AF37] fill-[#D4AF37]'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Red Flags */}
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-white">
                Sinais de Alerta (Red Flags)
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {redFlagsOptions.map((flag) => (
                <button
                  key={flag}
                  type="button"
                  onClick={() => toggleRedFlag(flag)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${
                    formData.redFlags.includes(flag)
                      ? 'bg-red-500 text-white'
                      : 'bg-white/5 text-gray-400 border border-gray-600 hover:border-red-500'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          {/* Relato */}
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Relato Detalhado (opcional)
            </h2>
            <textarea
              value={formData.relato}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, relato: e.target.value }))
              }
              rows={6}
              className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
              placeholder="Conte sua experiência de forma detalhada. Isso ajudará outras mulheres..."
            />
          </div>

          {/* Anonimato */}
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.anonimo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, anonimo: e.target.checked }))
                }
                className="w-5 h-5 rounded border-[#D4AF37]/30 bg-white/5 text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-0"
              />
              <span className="text-sm text-gray-300">
                Manter minha avaliação anônima
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Enviar Avaliação
          </button>
        </form>
      </div>

      <Navbar />
    </div>
  );
}
