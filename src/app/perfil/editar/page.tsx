'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Save } from 'lucide-react';

export default function EditarPerfilPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: 'Maria Silva',
    age: 28,
    city: 'São Paulo',
    state: 'SP',
    email: 'maria.silva@email.com',
    profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Em produção: chamar API para salvar dados
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    router.push('/perfil');
  };

  const handlePhotoChange = () => {
    // Em produção: abrir câmera ou galeria
    alert('Funcionalidade de câmera será implementada');
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="text-white hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Editar Perfil</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Foto de Perfil */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#D4AF37] shadow-2xl">
              <img
                src={formData.profilePhoto}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={handlePhotoChange}
              className="absolute bottom-0 right-0 bg-[#D4AF37] p-3 rounded-full shadow-lg hover:bg-[#B8941F] transition-colors"
            >
              <Camera className="w-5 h-5 text-black" />
            </button>
          </div>
          <p className="text-gray-400 text-sm text-center">
            Toque no ícone para alterar sua foto
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Nome Completo</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#D4AF37] focus:outline-none transition-colors"
              placeholder="Seu nome completo"
            />
          </div>

          {/* Idade */}
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Idade</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#D4AF37] focus:outline-none transition-colors"
              placeholder="Sua idade"
            />
          </div>

          {/* Cidade */}
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Cidade</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#D4AF37] focus:outline-none transition-colors"
              placeholder="Sua cidade"
            />
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Estado</label>
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#D4AF37] focus:outline-none transition-colors"
            >
              <option value="AC">Acre</option>
              <option value="AL">Alagoas</option>
              <option value="AP">Amapá</option>
              <option value="AM">Amazonas</option>
              <option value="BA">Bahia</option>
              <option value="CE">Ceará</option>
              <option value="DF">Distrito Federal</option>
              <option value="ES">Espírito Santo</option>
              <option value="GO">Goiás</option>
              <option value="MA">Maranhão</option>
              <option value="MT">Mato Grosso</option>
              <option value="MS">Mato Grosso do Sul</option>
              <option value="MG">Minas Gerais</option>
              <option value="PA">Pará</option>
              <option value="PB">Paraíba</option>
              <option value="PR">Paraná</option>
              <option value="PE">Pernambuco</option>
              <option value="PI">Piauí</option>
              <option value="RJ">Rio de Janeiro</option>
              <option value="RN">Rio Grande do Norte</option>
              <option value="RS">Rio Grande do Sul</option>
              <option value="RO">Rondônia</option>
              <option value="RR">Roraima</option>
              <option value="SC">Santa Catarina</option>
              <option value="SP">São Paulo</option>
              <option value="SE">Sergipe</option>
              <option value="TO">Tocantins</option>
            </select>
          </div>

          {/* E-mail */}
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">E-mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#D4AF37] focus:outline-none transition-colors"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        {/* Botão Salvar */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
