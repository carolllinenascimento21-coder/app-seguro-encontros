'use client';

import { useEffect, useState } from 'react';
import { Star, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

const supabase = createSupabaseClient();

interface Avaliacao {
  id: string;
  male_profile_id: string | null;
  relato: string | null;
  flags_positive: string[];
  flags_negative: string[];
  comportamento: number;
  seguranca_emocional: number;
  respeito: number;
  carater: number;
  confianca: number;
  created_at: string;
  male_profiles: {
    nome: string | null;
    cidade: string | null;
    telefone: string | null;
  } | null;
}

export default function MinhasAvaliacoes() {
  const router = useRouter();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<string | null>(null);

  useEffect(() => {
    carregarAvaliacoes();
  }, []);

  const carregarAvaliacoes = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          male_profile_id,
          relato,
          flags_positive,
          flags_negative,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          created_at,
          male_profiles (
            nome,
            cidade,
            telefone
          )
        `)
        .eq('autor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAvaliacoes(data ?? []);
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/minhas-avaliacoes/editar/${id}`);
  };

  const handleDeleteClick = (id: string) => {
    setAvaliacaoToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!avaliacaoToDelete) return;

    try {
      const { error } = await supabase
        .from('avaliacoes')
        .delete()
        .eq('id', avaliacaoToDelete);

      if (error) throw error;

      setAvaliacoes(prev =>
        prev.filter(a => a.id !== avaliacaoToDelete)
      );

      setShowDeleteModal(false);
      setAvaliacaoToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir avaliação:', err);
      alert('Erro ao excluir avaliação.');
    }
  };

  const mediaNota = (a: Avaliacao) =>
    (
      (a.comportamento +
        a.seguranca_emocional +
        a.respeito +
        a.carater +
        a.confianca) / 5
    ).toFixed(1);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR');

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 pt-8 max-w-md mx-auto">

        <h1 className="text-2xl font-bold text-white mb-1">
          Minhas Avaliações
        </h1>
        <p className="text-gray-400 text-sm">
          Apenas você pode ver estas avaliações.
        </p>

        <div className="mt-4 mb-6">
          <button
            onClick={() => router.push('/avaliar')}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl"
          >
            + Fazer nova avaliação
          </button>
        </div>

        {avaliacoes.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-xl p-6 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400 text-sm">
              Você ainda não fez nenhuma avaliação.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {avaliacoes.map(a => (
              <div
                key={a.id}
                className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5"
              >
                <div className="flex justify-between mb-2">
                  <div>
                    <h3 className="text-white font-bold">
                      {a.male_profiles?.nome || 'Nome não informado'}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {formatDate(a.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-[#D4AF37] fill-current" />
                    <span className="text-[#D4AF37] font-bold">
                      {mediaNota(a)}
                    </span>
                  </div>
                </div>

                {a.relato && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {a.relato}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(a.id)}
                    className="flex-1 bg-blue-500/10 text-blue-400 py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>

                  <button
                    onClick={() => handleDeleteClick(a.id)}
                    className="bg-red-500/10 text-red-400 px-4 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] p-6 rounded-xl w-full max-w-sm">
            <h3 className="text-white font-bold mb-3">
              Excluir avaliação?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Esta ação é permanente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-700 text-white py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
