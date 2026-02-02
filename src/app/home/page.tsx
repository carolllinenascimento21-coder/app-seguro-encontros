'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Eye,
  Lock,
  Shield,
  AlertTriangle,
  Star
} from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { createSupabaseClient } from '@/lib/supabase';

type MaleProfile = {
  id: string;
  display_name: string;
  city: string;
  social_context: string | null;
};

export default function HomePage() {
  const supabase = createSupabaseClient();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [context, setContext] = useState('');
  const [results, setResults] = useState<MaleProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc(
      'search_male_profiles',
      {
        q_name: name || null,
        q_city: city || null,
        q_platform: context || null
      }
    );

    if (!error && data) {
      setResults(data);
    } else {
      setResults([]);
    }

    setLoading(false);
  };

  // Perfis recentes (load inicial)
  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
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

          {/* BUSCA */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3"
            />

            <input
              type="text"
              placeholder="Cidade"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3"
            />

            <select
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3"
            >
              <option value="">Contexto social</option>
              <option value="tinder">Tinder</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="outro">Outro</option>
            </select>

            <button
              onClick={fetchProfiles}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>
      </header>

      {/* RESULTADOS */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#D4AF37]">
          {name || city || context ? 'Resultados da Busca' : 'Perfis Recentes'}
        </h2>

        {loading ? (
          <p className="text-gray-400 text-center py-12">
            Buscando perfis…
          </p>
        ) : results.length === 0 ? (
          <p className="text-gray-400 text-center py-12">
            Nenhum perfil encontrado
          </p>
        ) : (
          results.map((perfil) => (
            <Link
              key={perfil.id}
              href={`/profile/${perfil.id}`}
              className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10"
            >
              <h3 className="text-lg font-semibold text-white">
                {perfil.display_name}
              </h3>

              <p className="text-sm text-gray-400">
                {perfil.city}
              </p>

              {perfil.social_context && (
                <div className="mt-2 text-xs text-[#D4AF37]">
                  Contexto: {perfil.social_context}
                </div>
              )}
            </Link>
          ))
        )}
      </div>

      <Navbar />
    </div>
  );
}
