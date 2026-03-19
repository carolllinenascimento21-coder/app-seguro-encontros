import Link from 'next/link';
import { Search, Eye, Lock, Shield, AlertTriangle, Star } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

type Perfil = {
  id: string;
  display_name: string;
  city: string;
  average_rating: number;
  total_reviews: number;
  alert_count: number;
  classification: 'perigo' | 'atencao' | 'confiavel' | 'excelente';
};

const getReputacaoColor = (nivel: Perfil['classification']) => {
  switch (nivel) {
    case 'excelente':
      return 'text-green-500 bg-green-500/10 border-green-500/30';
    case 'confiavel':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    case 'atencao':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'perigo':
      return 'text-red-500 bg-red-500/10 border-red-500/30';
    default:
      return '';
  }
};

const getReputacaoLabel = (nivel: Perfil['classification']) => {
  switch (nivel) {
    case 'excelente':
      return 'Excelente';
    case 'confiavel':
      return 'Confiável';
    case 'atencao':
      return 'Atenção';
    case 'perigo':
      return 'Perigo';
    default:
      return '';
  }
};

export default async function HomePage() {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('male_profile_reputation_summary')
    .select(`
      male_profile_id,
      average_rating,
      total_reviews,
      alert_count,
      classification,
      male_profiles (
        id,
        display_name,
        city
      )
    `)
    .gt('total_reviews', 0) // 🔥 evita perfis vazios/fakes
    .order('average_rating', { ascending: false })
    .limit(20);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Erro ao carregar perfis
      </div>
    );
  }

  const perfis: Perfil[] =
    data?.map((item: any) => ({
      id: item.male_profiles.id,
      display_name: item.male_profiles.display_name,
      city: item.male_profiles.city,
      average_rating: item.average_rating ?? 0,
      total_reviews: item.total_reviews ?? 0,
      alert_count: item.alert_count ?? 0,
      classification: item.classification ?? 'confiavel',
    })) ?? [];

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

          {/* Search (visual apenas — pode evoluir depois) */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar em breve..."
              disabled
              className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl pl-12 pr-4 py-3 text-gray-500"
            />
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
            <p className="text-2xl font-bold">{perfis.length}</p>
            <p className="text-xs text-gray-400">Perfis</p>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <Star className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {perfis.reduce((acc, p) => acc + p.total_reviews, 0)}
            </p>
            <p className="text-xs text-gray-400">Avaliações</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {perfis.reduce((acc, p) => acc + p.alert_count, 0)}
            </p>
            <p className="text-xs text-gray-400">Alertas</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mb-6">
          <Link
            href="/avaliar"
            className="block w-full bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold py-4 rounded-xl text-center"
          >
            + Avaliar um Homem
          </Link>
        </div>

        {/* Perfis */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">
            Perfis com avaliações
          </h2>

          {perfis.map((perfil) => (
            <Link
              key={perfil.id}
              href={`/consultar-reputacao/${perfil.id}`}
              className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition"
            >
              <div className="flex justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{perfil.display_name}</h3>
                  <p className="text-sm text-gray-400">{perfil.city}</p>
                </div>

                <div
                  className={`px-3 py-1 text-xs rounded-full border ${getReputacaoColor(
                    perfil.classification
                  )}`}
                >
                  {getReputacaoLabel(perfil.classification)}
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                  {perfil.average_rating.toFixed(1)}
                </div>
                <div>{perfil.total_reviews} avaliações</div>
                <div>{perfil.alert_count} alertas</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
