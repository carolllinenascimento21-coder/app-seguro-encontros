'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Star, AlertTriangle, Save, Loader2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { createSupabaseClient } from '@/lib/supabase';

const supabase = createSupabaseClient();

export default function EditarAvaliacao() {
  const router = useRouter();
  const params = useParams();
  const avaliacaoId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avaliadoId, setAvaliadoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cidade: '',
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
    relato: '',
    flags_negative: [] as string[],
    flags_positive: [] as string[],
  });

  const categorias = [
    { key: 'comportamento', label: 'Comportamento' },
    { key: 'seguranca_emocional', label: 'Segurança Emocional' },
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

  useEffect(() => {
    loadAvaliacao();
  }, [avaliacaoId]);

  const loadAvaliacao = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        console.error('Supabase client não inicializado na edição de avaliações.');
        setLoading(false);
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
        console.error('Erro ao carregar sessão:', sessionError);
        router.push('/login');
        return;
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError?.code === 'AuthSessionMissingError' || !user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          avaliado_id,
          relato,
          flags_positive,
          flags_negative,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          avaliado:avaliados (
            nome,
            cidade,
            telefone
          )
        `)
        .eq('id', avaliacaoId)
        .eq('autor_id', user.id) // Garantir que só edita próprias avaliações
        .single();

      if (error) throw error;

      if (!data) {
        alert('Avaliação não encontrada ou você não tem permissão para editá-la.');
        router.push('/minhas-avaliacoes');
        return;
      }

      setAvaliadoId(data.avaliado_id ?? null);
      setFormData({
        nome: data.avaliado?.nome || '',
        telefone: data.avaliado?.telefone || '',
        cidade: data.avaliado?.cidade || '',
        comportamento: data.comportamento ?? 0,
        seguranca_emocional: data.seguranca_emocional ?? 0,
        respeito: data.respeito ?? 0,
        carater: data.carater ?? 0,
        confianca: data.confianca ?? 0,
        relato: data.relato || '',
        flags_negative: data.flags_negative || [],
        flags_positive: data.flags_positive || [],
      });
    } catch (error) {
      console.error('Erro ao carregar avaliação:', error);
      alert('Erro ao carregar avaliação.');
      router.push('/minhas-avaliacoes');
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (categoria: string, valor: number) => {
    setFormData((prev) => ({ ...prev, [categoria]: valor }));
  };

  const toggleRedFlag = (flag: string) => {
    setFormData((prev) => ({
      ...prev,
      flags_negative: prev.flags_negative.includes(flag)
        ? prev.flags_negative.filter((f) => f !== flag)
        : [...prev.flags_negative, flag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      if (!supabase) {
        console.error('Supabase client não inicializado na edição de avaliações.');
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
        console.error('Erro ao carregar sessão:', sessionError);
        router.push('/login');
        return;
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError?.code === 'AuthSessionMissingError' || !user) {
        router.push('/login');
        return;
      }

      // Atualizar avaliação (o trigger do banco salva automaticamente no histórico)
      const { error } = await supabase
        .from('avaliacoes')
        .update({
          relato: formData.relato || null,
          flags_positive: formData.flags_positive,
          flags_negative: formData.flags_negative,
          comportamento: formData.comportamento,
          seguranca_emocional: formData.seguranca_emocional,
          respeito: formData.respeito,
          carater: formData.carater,
          confianca: formData.confianca,
        })
        .eq('id', avaliacaoId)
        .eq('autor_id', user.id);

      if (error) throw error;

      if (avaliadoId) {
        const { error: avaliadoError } = await supabase
          .from('avaliados')
          .update({
            nome: formData.nome,
            cidade: formData.cidade,
            telefone: formData.telefone || null,
          })
          .eq('id', avaliadoId);

        if (avaliadoError) throw avaliadoError;
      }

      alert('Avaliação atualizada com sucesso!');
      router.push('/minhas-avaliacoes');
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
      alert('Erro ao atualizar avaliação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/minhas-avaliacoes')}
            className="flex items-center gap-2 text-[#D4AF37] hover:text-[#C0C0C0] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#D4AF37] mb-2">
            Editar Avaliação
          </h1>
          <p className="text-gray-400 text-sm">
            Atualize as informações da sua avaliação.
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
              {categorias.map((categoria) => {
                const categoriaKey = categoria.key as keyof typeof formData;
                const rawValue = formData[categoriaKey];
                const current = typeof rawValue === "number" ? rawValue : Number(rawValue || 0);

                return (
                  <div key={categoria.key}>
                    <label className="block text-sm text-gray-300 mb-3">
                      {categoria.label}
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((valor) => {
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
                );
              })}
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
                    formData.flags_negative.includes(flag)
                      ? 'bg-red-500 text-white'
                      : 'bg-white/5 text-gray-400 border border-gray-600 hover:border-red-500'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          {/* Comentário */}
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
              placeholder="Conte sua experiência de forma detalhada..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
        </form>
      </div>

      <Navbar />
    </div>
  );
}
