'use client'

import { Shield, Star, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewType = 'home' | 'reports' | 'settings'

interface NavigationProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  return (
    <header className="bg-[#1A1A1A] shadow-2xl border-b-2 border-[#D4AF37]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img 
              src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png" 
              alt="Confia+ Logo" 
              className="h-12 w-auto drop-shadow-xl cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => onViewChange('home')}
            />
          </div>
          
          {/* Navigation Buttons */}
          <nav className="flex gap-2">
            <Button
              onClick={() => onViewChange('home')}
              variant={currentView === 'home' ? 'default' : 'ghost'}
              className={`${
                currentView === 'home' 
                  ? 'bg-[#D4AF37] text-[#000000] hover:bg-[#EFD9A7]' 
                  : 'text-[#FFFFFF] hover:bg-[#1A1A1A]'
              } font-semibold transition-all duration-300 rounded-2xl`}
            >
              <Shield className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Início</span>
            </Button>
            <Button
              onClick={() => onViewChange('reports')}
              variant={currentView === 'reports' ? 'default' : 'ghost'}
              className={`${
                currentView === 'reports' 
                  ? 'bg-[#D4AF37] text-[#000000] hover:bg-[#EFD9A7]' 
                  : 'text-[#FFFFFF] hover:bg-[#1A1A1A]'
              } font-semibold transition-all duration-300 rounded-2xl`}
            >
              <Star className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Relatos</span>
            </Button>
            <Button
              onClick={() => onViewChange('settings')}
              variant={currentView === 'settings' ? 'default' : 'ghost'}
              className={`${
                currentView === 'settings' 
                  ? 'bg-[#D4AF37] text-[#000000] hover:bg-[#EFD9A7]' 
                  : 'text-[#FFFFFF] hover:bg-[#1A1A1A]'
              } font-semibold transition-all duration-300 rounded-2xl`}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
