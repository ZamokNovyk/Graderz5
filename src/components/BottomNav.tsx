import React from 'react';
import { LayoutGrid, Wrench, User } from 'lucide-react';
import { NavTab } from '../types';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav 
      id="bottom-floating-navigation"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 select-none"
    >
      <div className="bg-[#121217]/95 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center gap-1.5 ring-1 ring-white/5">
        
        {/* Tab 1: Home */}
        <button
          id="nav-tab-home"
          onClick={() => onSelectTab('home')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'home'
              ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-950/80 ring-1 ring-red-400/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <LayoutGrid className={`w-4 h-4 ${activeTab === 'home' ? 'text-white' : 'text-zinc-400'}`} />
          <span>Home</span>
        </button>

        {/* Tab 3: Mi Perfil */}
        <button
          id="nav-tab-perfil"
          onClick={() => onSelectTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
            activeTab === 'perfil'
              ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-950/80 ring-1 ring-red-400/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <User className={`w-4 h-4 ${activeTab === 'perfil' ? 'text-white' : 'text-zinc-400'}`} />
          <span>Mi Perfil</span>
        </button>

      </div>
    </nav>
  );
};
