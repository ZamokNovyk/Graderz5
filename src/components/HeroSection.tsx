import React, { useState, useRef, useEffect } from 'react';
import { 
  Crown, 
  Plus
} from 'lucide-react';
import { Personaje } from '../types';
import { getPersonajesList } from '../lib/personajesService';
import AutocompleteSearchBar from './AutocompleteSearchBar';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectPersonaje?: (slug: string) => void;
  onOpenAddPersonaje?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSelectPersonaje,
  onOpenAddPersonaje
}) => {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Cargar personajes reales directamente desde la base de datos Supabase
  const refreshPersonajes = async () => {
    const list = await getPersonajesList();
    setPersonajes(list);
  };

  useEffect(() => {
    refreshPersonajes();
  }, []);

  return (
    <section className="relative w-full min-h-[calc(100vh-160px)] flex flex-col items-center justify-center px-4 sm:px-6 pt-6 pb-28 select-none">
      {/* Background ambient red glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[450px] bg-red-600/10 rounded-full blur-[110px] pointer-events-none -z-10"></div>
      
      {/* Subtle secondary gradient highlights */}
      <div className="absolute top-10 right-1/4 w-72 h-72 bg-red-950/20 rounded-full blur-[90px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-zinc-900/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        
        {/* Crown / Top Badge */}
        <div className="mb-6 sm:mb-8 flex items-center justify-center">
          <div 
            id="hero-crown-badge"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#141214] border-2 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.35)] flex items-center justify-center relative group hover:border-red-400 hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] transition-all duration-300 transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent rounded-2xl"></div>
            <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-red-500 group-hover:text-red-400 transition-colors drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </div>
        </div>

        {/* Main Headline */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white font-display leading-tight sm:leading-none">
            Graderz<span className="text-red-500">5</span>
          </h1>
        </div>

        {/* Search Box Container */}
        <div ref={searchContainerRef} className="w-full max-w-2xl relative">
          <AutocompleteSearchBar
            value={searchQuery}
            onSelectPersonaje={onSelectPersonaje}
            onOpenAddPersonaje={onOpenAddPersonaje}
            onSearch={(query) => {
              onSearchChange(query);
              const exactMatch = personajes.find(
                p => p.nombre.toLowerCase() === query.toLowerCase().trim() || p.slug.toLowerCase() === query.toLowerCase().trim()
              );
              if (exactMatch && onSelectPersonaje) {
                onSelectPersonaje(exactMatch.slug);
              }
            }}
            onSelectSuggestion={(suggestion) => {
              if (onSelectPersonaje) {
                onSelectPersonaje(suggestion.slug);
              }
            }}
          />

          {/* Verification link info if empty or query doesn't match */}
          {onOpenAddPersonaje && (
            <div className="mt-5 text-center">
              <button
                onClick={onOpenAddPersonaje}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-500 font-semibold underline underline-offset-4 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>¿No encuentras al personaje? Verificar y agregar con Wikipedia</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
