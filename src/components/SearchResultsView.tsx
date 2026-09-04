import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Grid, 
  List, 
  Filter, 
  Sparkles, 
  Star, 
  ArrowRight, 
  User, 
  Globe, 
  Clock, 
  Heart, 
  MessageSquare,
  Search,
  Users
} from 'lucide-react';
import { Personaje } from '../types';
import { getPersonajesList } from '../lib/personajesService';

interface SearchResultsViewProps {
  query: string;
  onBack: () => void;
  onSelectPersonaje: (slug: string) => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  onBack,
  onSelectPersonaje
}) => {
  const [viewMode, setViewMode] = useState<'mosaico' | 'lista'>('mosaico');
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [filteredResults, setFilteredResults] = useState<Personaje[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters State
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'todos' | 'femenino' | 'masculino' | 'no_especificado'>('todos');
  const [selectedNationality, setSelectedNationality] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'rating' | 'recientes' | 'votos'>('rating');

  // Load and filter personajes based on query
  useEffect(() => {
    const fetchAndFilter = async () => {
      setIsLoading(true);
      try {
        const list = await getPersonajesList();
        setPersonajes(list);
      } catch (err) {
        console.error('Error fetching personajes in SearchResultsView:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndFilter();
  }, []);

  // Filter application
  useEffect(() => {
    const cleanQuery = query.toLowerCase().trim();
    let results = personajes;

    // 1. Text Search Filter (name, occupation, extract, nationality, etc.)
    if (cleanQuery) {
      results = results.filter(p => {
        const nombreMatch = p.nombre.toLowerCase().includes(cleanQuery);
        const occupationMatch = p.occupation?.toLowerCase().includes(cleanQuery) || false;
        const nationalityMatch = p.nationality?.toLowerCase().includes(cleanQuery) || false;
        const extractMatch = p.extract?.toLowerCase().includes(cleanQuery) || false;
        
        // Match in occupations list
        const occupationsListMatch = p.occupations?.some(occ => occ.toLowerCase().includes(cleanQuery)) || false;

        return nombreMatch || occupationMatch || nationalityMatch || extractMatch || occupationsListMatch;
      });
    }

    // 2. Gender Filter (case-insensitive & synonym aware)
    if (selectedGender !== 'todos') {
      results = results.filter(p => {
        if (!p.gender) return false;
        const pGender = p.gender.toLowerCase().trim();
        if (selectedGender === 'femenino') {
          return pGender === 'femenino' || pGender === 'femenina' || pGender === 'female' || pGender === 'mujer' || pGender === 'f';
        }
        if (selectedGender === 'masculino') {
          return pGender === 'masculino' || pGender === 'male' || pGender === 'hombre' || pGender === 'm';
        }
        if (selectedGender === 'no_especificado') {
          return !['femenino', 'femenina', 'female', 'mujer', 'f', 'masculino', 'male', 'hombre', 'm'].includes(pGender);
        }
        return pGender === selectedGender.toLowerCase().trim();
      });
    }

    // 3. Nationality Filter (case-insensitive)
    if (selectedNationality !== 'todos') {
      results = results.filter(p => p.nationality && p.nationality.toLowerCase().trim() === selectedNationality.toLowerCase().trim());
    }

    // 4. Sorting
    if (sortBy === 'rating') {
      results = [...results].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'votos') {
      results = [...results].sort((a, b) => b.votes_count - a.votes_count);
    } else if (sortBy === 'recientes') {
      results = [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredResults(results);
  }, [personajes, query, selectedGender, selectedNationality, sortBy]);

  // Extract unique nationalities for the filter dropdown
  const uniqueNationalities = Array.from(
    new Set(
      personajes
        .map(p => p.nationality)
        .filter((n): n is string => Boolean(n && n !== 'No especificada'))
    )
  ).sort();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col space-y-8 animate-fade-in">
      
      {/* 1. Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-[#ffbf00] transition-colors cursor-pointer uppercase tracking-wider bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:border-[#ffbf00]/20"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </button>
      </div>

      {/* 2. Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Resultados para <span className="text-[#ffbf00]">"{query || 'Todos'}"</span>
          </h1>
          <p className="text-sm text-zinc-400">
            {isLoading ? 'Buscando coincidencias...' : `Se encontraron ${filteredResults.length} resultados`}
          </p>
        </div>

        {/* View mode toggle & Filter Actions */}
        <div className="flex items-center gap-3">
          {/* Mosaico / Lista Selector */}
          <div className="bg-[#111116] border border-white/5 rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setViewMode('mosaico')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'mosaico'
                  ? 'bg-amber-500/10 text-[#ffbf00] border border-amber-500/20 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Mosaico</span>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-amber-500/10 text-[#ffbf00] border border-amber-500/20 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Filter Trigger Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showFilterDropdown || selectedGender !== 'todos' || selectedNationality !== 'todos' || sortBy !== 'rating'
                  ? 'bg-[#ffbf00]/10 text-[#ffbf00] border-[#ffbf00]/30 shadow-md shadow-[#ffbf00]/5'
                  : 'bg-[#111116] text-zinc-300 border-white/5 hover:border-white/10 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrar</span>
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterDropdown && (
              <div className="absolute right-0 mt-3 w-72 bg-[#121217] border border-white/10 rounded-2xl p-4 shadow-2xl z-30 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wide">Filtros de búsqueda</h4>
                  <button 
                    onClick={() => {
                      setSelectedGender('todos');
                      setSelectedNationality('todos');
                      setSortBy('rating');
                    }}
                    className="text-[10px] text-zinc-500 hover:text-[#ffbf00] transition-colors uppercase font-bold cursor-pointer"
                  >
                    Restablecer
                  </button>
                </div>

                {/* Gender filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Género</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'masculino', label: 'Masculino' },
                      { id: 'femenino', label: 'Femenino' },
                      { id: 'no_especificado', label: 'Otro' }
                    ].map(g => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGender(g.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-center cursor-pointer ${
                          selectedGender === g.id
                            ? 'bg-amber-500/10 text-[#ffbf00] border-amber-500/30'
                            : 'bg-white/5 text-zinc-400 border-transparent hover:text-white'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nationality filter */}
                {uniqueNationalities.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nacionalidad</label>
                    <select
                      value={selectedNationality}
                      onChange={(e) => setSelectedNationality(e.target.value)}
                      className="w-full bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-[#ffbf00]/50"
                    >
                      <option value="todos">Todas las nacionalidades</option>
                      {uniqueNationalities.map(nat => (
                        <option key={nat} value={nat}>{nat}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sorting */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ordenar por</label>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'rating', label: 'Mayor Calificación' },
                      { id: 'votos', label: 'Más Votados' },
                      { id: 'recientes', label: 'Añadidos Recientemente' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSortBy(s.id as any)}
                        className={`py-2 px-3 rounded-lg text-[11px] text-left transition-all cursor-pointer flex items-center justify-between ${
                          sortBy === s.id
                            ? 'bg-amber-500/10 text-[#ffbf00] font-bold'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{s.label}</span>
                        {sortBy === s.id && <Star className="w-3 h-3 fill-[#ffbf00] text-[#ffbf00]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Todos los resultados list header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
          <Sparkles className="w-4 h-4 text-[#ffbf00]" />
          <span>Todos los resultados</span>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {!isLoading && `${filteredResults.length} de ${filteredResults.length}`}
        </span>
      </div>

      {/* 4. Loader */}
      {isLoading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#ffbf00] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest animate-pulse">Consultando base de datos y wikidata...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        /* Empty results state */
        <div className="bg-[#111116] border border-white/5 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-zinc-800/40 border border-white/5 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-7 h-7 text-zinc-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white uppercase">Sin coincidencias</h3>
            <p className="text-xs text-zinc-400">
              No hemos encontrado ningún personaje creado en Graderz5 que coincida con tu búsqueda. ¡Puedes ser el primero en crearlo con el botón flotante rojo abajo a la derecha!
            </p>
          </div>
        </div>
      ) : viewMode === 'mosaico' ? (
        /* Grid (Mosaico) layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPersonaje(p.slug)}
              className="bg-[#111116] hover:bg-[#15151c] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex items-start gap-4 cursor-pointer transition-all duration-300 hover:translate-y-[-4px] shadow-lg relative group"
            >
              {/* Category Badge */}
              <span className="absolute top-4 right-4 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-red-500/20">
                {p.occupation ? p.occupation.split(',')[0].substring(0, 15) : 'Figura'}
              </span>

              {/* Avatar Frame */}
              <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 shrink-0 bg-zinc-800/50">
                <img
                  src={p.image_url}
                  alt={p.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>

              {/* Information */}
              <div className="flex-1 space-y-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#ffbf00] transition-colors leading-tight truncate uppercase">
                    {p.nombre}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate max-w-[150px]">
                    {p.birth_place || p.nationality || 'Verificado'}
                  </p>
                </div>

                {/* Rating score and stats */}
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#ffbf00] text-[#ffbf00]" />
                    <span className="text-xs font-bold text-white">{p.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    ({p.votes_count} votos)
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/5 mt-2">
                  <span className="inline-flex items-center gap-1 text-zinc-400 font-semibold group-hover:text-white transition-colors">
                    Ver detalles
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List (Lista) layout */
        <div className="flex flex-col space-y-3">
          {filteredResults.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => onSelectPersonaje(p.slug)}
              className="bg-[#111116] hover:bg-[#15151c] border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                {/* Number identifier */}
                <span className="text-xs font-mono font-bold text-zinc-600 w-5 text-right">
                  {idx + 1}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-zinc-800">
                  <img
                    src={p.image_url}
                    alt={p.nombre}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>

                {/* Name & metadata */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ffbf00] transition-colors uppercase">
                    {p.nombre}
                  </h3>
                  <p className="text-[11px] text-zinc-400 hidden sm:block truncate max-w-sm">
                    {p.occupation || 'Persona verificada de Wikipedia y Wikidata'}
                  </p>
                </div>
              </div>

              {/* Right ratings / badge & action */}
              <div className="flex items-center gap-6">
                {/* Nationality badge */}
                {p.nationality && p.nationality !== 'No especificada' && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                    <Globe className="w-3 h-3 text-zinc-500" />
                    {p.nationality}
                  </span>
                )}

                {/* Score */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-[#ffbf00] text-[#ffbf00]" />
                  <span className="text-xs font-bold text-white">{p.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-zinc-500 hidden sm:inline">
                    ({p.votes_count} votos)
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
