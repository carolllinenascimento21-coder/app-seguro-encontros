'use client';

import { useState, useEffect } from 'react';
import { Star, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

interface Avaliacao {
  id: string;
  nome: string | null;
  cidade: string | null;
  contato: string | null;
  flags: string[];
  relato: string | null;
  comportamento: number;
  seguranca_emocional: number;
  respeito: number;
  carater: number;
  confianca: number;
  created_at: string;
}

export default function MinhasAvaliacoes() {
  const router = useRouter();

  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadAvaliacoes();
  }, []);

  const loadAvaliacoes = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      /**
       * Busca SOMENTE avaliações da usuária logada
       * via tabela de vínculo (anonimato real)
       */
      const { data, error } = await supabase
        .from('avaliacoes_autoras')
        .select(`
          avaliacao:avaliacoes (
            id,
            nome,
            cidade,
            contato,
            flags,
            relato,
            comportamento,
            seguranca_emocional,
            respeito,
            carater,
            confianca,
            created_at
          )
        `);

      if (error) throw error;

      const lista = (data || [])
        .map((item: any) => item.avaliacao)
        .filter(Boolean);

      setAvaliacoes(lista);
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

      setAvaliacoes((prev) => prev.filter((a) => a.id !== avaliacaoToDelete));
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
        a.confianca) /
      5
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
        <p className="text-gray-400 text-sm mb-6">
          Apenas você pode ver estas avaliações.
        </p>

        {avaliacoes.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-xl p-6 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400 text-sm mb-4">
              Você ainda não fez nenhuma avaliação.
            </p>
            <button
              onClick={() => router.push('/avaliar')}
              className="bg-[#D4AF37] text-black px-6 py-2 rounded-lg font-semibold"
            >
              Fazer primeira avaliação
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {avaliacoes.map((a) => (
              <div
                key={a.id}
                className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-bold">
                      {a.nome || 'Nome não informado'}
                    </h3>

                    {a.cidade && (
                      <p className="text-gray-400 text-xs">
                        📍 {a.cidade}
                      </p>
                    )}

                    {a.contato && (
                      <p className="text-gray-400 text-xs break-all">
                        🔗 {a.contato}
                      </p>
                    )}

                    <p className="text-gray-500 text-xs mt-1">
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

                {a.flags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {a.flags.map((f, i) => (
                      <span
                        key={i}
                        className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
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
