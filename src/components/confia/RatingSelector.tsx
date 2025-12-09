'use client'

import { Heart, AlertTriangle, XCircle } from 'lucide-react'

type RatingType = 'positive' | 'neutral' | 'negative'

interface RatingSelectorProps {
  selectedRating: RatingType | null
  onRatingChange: (rating: RatingType) => void
}

export default function RatingSelector({ selectedRating, onRatingChange }: RatingSelectorProps) {
  // Componente de ícone de avaliação
  const RatingIcon = ({ type, selected, onClick }: { type: RatingType, selected: boolean, onClick: () => void }) => {
    const getIcon = () => {
      switch(type) {
        case 'positive':
          // Coração vermelho
          return (
            <div 
              className={`relative cursor-pointer transition-all duration-300 ${selected ? 'scale-125' : 'scale-100 hover:scale-110'}`} 
              onClick={onClick}
            >
              <Heart className={`w-12 h-12 ${selected ? 'fill-[#E63946] text-[#E63946]' : 'fill-[#E63946]/70 text-[#E63946]'} drop-shadow-lg`} />
              {selected && <div className="absolute inset-0 bg-[#E63946] blur-xl opacity-50 rounded-full"></div>}
            </div>
          )
        case 'neutral':
          // Triângulo de atenção amarelo com símbolo preto
          return (
            <div 
              className={`relative cursor-pointer transition-all duration-300 ${selected ? 'scale-125' : 'scale-100 hover:scale-110'}`} 
              onClick={onClick}
            >
              <AlertTriangle className={`w-12 h-12 ${selected ? 'fill-[#FFD700] text-[#000000]' : 'fill-[#FFD700]/70 text-[#000000]'} drop-shadow-lg`} strokeWidth={2} />
              {selected && <div className="absolute inset-0 bg-[#FFD700] blur-xl opacity-40 rounded-full"></div>}
            </div>
          )
        case 'negative':
          // Círculo vermelho com X amarelo
          return (
            <div 
              className={`relative cursor-pointer transition-all duration-300 ${selected ? 'scale-125' : 'scale-100 hover:scale-110'}`} 
              onClick={onClick}
            >
              <XCircle className={`w-12 h-12 ${selected ? 'fill-[#E63946] text-[#FFD700]' : 'fill-[#E63946]/70 text-[#FFD700]'} drop-shadow-lg`} strokeWidth={2.5} />
              {selected && <div className="absolute inset-0 bg-[#E63946] blur-xl opacity-40 rounded-full"></div>}
            </div>
          )
      }
    }

    return getIcon()
  }

  return (
    <div>
      <p className="text-[#EFD9A7] font-semibold mb-4 text-center text-lg">
        Como foi sua experiência?
      </p>
      <div className="flex justify-center gap-8 mb-6">
        <div className="text-center">
          <RatingIcon 
            type="positive" 
            selected={selectedRating === 'positive'} 
            onClick={() => onRatingChange('positive')}
          />
          <p className="text-xs text-[#EFD9A7] mt-2 font-semibold">Positiva</p>
        </div>
        <div className="text-center">
          <RatingIcon 
            type="neutral" 
            selected={selectedRating === 'neutral'} 
            onClick={() => onRatingChange('neutral')}
          />
          <p className="text-xs text-[#EFD9A7] mt-2 font-semibold">Neutra</p>
        </div>
        <div className="text-center">
          <RatingIcon 
            type="negative" 
            selected={selectedRating === 'negative'} 
            onClick={() => onRatingChange('negative')}
          />
          <p className="text-xs text-[#EFD9A7] mt-2 font-semibold">Negativa</p>
        </div>
      </div>
    </div>
  )
}
