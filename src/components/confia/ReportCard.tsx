'use client'

import { Heart, AlertTriangle, XCircle, Flag, CheckCircle, Clock } from 'lucide-react'

type RatingType = 'positive' | 'neutral' | 'negative'

interface ReportCardProps {
  id: string
  content: string
  rating: RatingType
  flags: string[]
  timestamp: string
  status: 'pending' | 'approved' | 'flagged'
}

export default function ReportCard({ content, rating, flags, timestamp, status }: ReportCardProps) {
  // Componente de ícone de avaliação
  const RatingIcon = ({ type }: { type: RatingType }) => {
    switch(type) {
      case 'positive':
        // Coração vermelho
        return (
          <div className="relative">
            <Heart className="w-10 h-10 fill-[#E63946] text-[#E63946] drop-shadow-lg" />
            <div className="absolute inset-0 bg-[#E63946] blur-lg opacity-30 rounded-full"></div>
          </div>
        )
      case 'neutral':
        // Triângulo de atenção amarelo com símbolo preto
        return (
          <div className="relative">
            <AlertTriangle className="w-10 h-10 fill-[#FFD700] text-[#000000] drop-shadow-lg" strokeWidth={2} />
            <div className="absolute inset-0 bg-[#FFD700] blur-lg opacity-20 rounded-full"></div>
          </div>
        )
      case 'negative':
        // Círculo vermelho com X amarelo
        return (
          <div className="relative">
            <XCircle className="w-10 h-10 fill-[#E63946] text-[#FFD700] drop-shadow-lg" strokeWidth={2.5} />
            <div className="absolute inset-0 bg-[#E63946] blur-lg opacity-30 rounded-full"></div>
          </div>
        )
    }
  }

  const getRatingLabel = () => {
    switch(rating) {
      case 'positive':
        return '✨ Experiência Positiva'
      case 'neutral':
        return '⚖️ Experiência Neutra'
      case 'negative':
        return '⚠️ Experiência Negativa'
    }
  }

  const getStatusBadge = () => {
    switch(status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 bg-[#D4AF37] text-[#000000] px-3 py-1 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </span>
        )
      case 'flagged':
        return (
          <span className="flex items-center gap-1 bg-[#B31A1A] text-[#FFFFFF] px-3 py-1 rounded-full text-xs font-semibold">
            <Flag className="w-3 h-3" />
            Em Análise
          </span>
        )
      case 'pending':
        return (
          <span className="flex items-center gap-1 bg-[#EFD9A7] text-[#000000] px-3 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        )
    }
  }

  return (
    <div className="bg-[#1A1A1A] rounded-3xl shadow-xl p-6 border-l-8 border-[#D4AF37] hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Ícone de avaliação */}
          <div className="scale-90">
            <RatingIcon type={rating} />
          </div>
          <div>
            <span className="text-sm font-bold text-[#D4AF37] block">
              {getRatingLabel()}
            </span>
            <span className="text-xs text-[#EFD9A7]">{timestamp}</span>
          </div>
        </div>
        
        {/* Status Badge */}
        {getStatusBadge()}
      </div>

      {/* Content */}
      <p className="text-[#FFFFFF] mb-4 leading-relaxed">
        {content}
      </p>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-[#D4AF37]/30">
          {flags.map((flag, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 text-xs bg-[#D4AF37]/20 text-[#EFD9A7] px-3 py-1 rounded-full font-semibold border border-[#D4AF37]"
            >
              <Flag className="w-3 h-3" />
              {flag.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
