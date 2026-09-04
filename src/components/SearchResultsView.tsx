import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Grid, 
  List, 
  Filter, 
  Sparkles, 
  Star, 
  ArrowRight, 
  Globe, 
  X,
  Flame,
  Music,
  Trophy,
  Film,
  Crown,
  Zap,
  RotateCcw,
  HeartHandshake
} from 'lucide-react';
import { Personaje } from '../types';
import { getPersonajesList } from '../lib/personajesService';
import { detectType } from '../lib/search';

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
  
  // Advanced Filters State
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'todos' | 'femenino' | 'masculino' | 'no_especificado'>('todos');
  const [selectedNationality, setSelectedNationality] = useState<string>('todos');
  const [selectedAttitude, setSelectedAttitude] = useState<'todos' | 'simp' | 'fan' | 'hater' | 'conozco'>('todos');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'musica' | 'deportes' | 'cine' | 'politica' | 'creadores'>('todos');
  const [minRating, setMinRating] = useState<number>(0);
  const [minVotes, setMinVotes] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'vivos' | 'fallecidos'>('todos');
  const [sortBy, setSortBy] = useState<'rating' | 'recientes' | 'votos' | 'simps'>('rating');

  // Load personajes list
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

  // Filter application pipeline
  useEffect(() => {
    const cleanQuery = query.toLowerCase().trim();
    let results = personajes;

    // 1. Text Search Filter
    if (cleanQuery) {
      results = results.filter(p => {
        const nombreMatch = p.nombre.toLowerCase().includes(cleanQuery);
        const occupationMatch = p.occupation?.toLowerCase().includes(cleanQuery) || false;
        const nationalityMatch = p.nationality?.toLowerCase().includes(cleanQuery) || false;
        const extractMatch = p.extract?.toLowerCase().includes(cleanQuery) || false;
        const occupationsListMatch = p.occupations?.some(occ => occ.toLowerCase().includes(cleanQuery)) || false;

        return nombreMatch || occupationMatch || nationalityMatch || extractMatch || occupationsListMatch;
      });
    }

    // 2. Gender Filter
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

    // 3. Nationality Filter
    if (selectedNationality !== 'todos') {
      results = results.filter(p => p.nationality && p.nationality.toLowerCase().trim() === selectedNationality.toLowerCase().trim());
    }

    // 4. Category / Occupation Chip Filter
    if (selectedCategory !== 'todos') {
      results = results.filter(p => {
        const fullText = `${p.nombre} ${p.extract || ''} ${p.occupation || ''} ${(p.occupations || []).join(' ')}`.toLowerCase();
        const detected = detectType(p.nombre, p.extract || '', p.occupation || '');

        if (selectedCategory === 'musica') {
          return detected === 'cantante' || fullText.includes('cantan') || fullText.includes('músic') || fullText.includes('sing') || fullText.includes('composit') || fullText.includes('raper') || fullText.includes('popstar');
        }
        if (selectedCategory === 'deportes') {
          return detected === 'deportista' || fullText.includes('futbol') || fullText.includes('deport') || fullText.includes('balonc') || fullText.includes('atlet') || fullText.includes('jugador') || fullText.includes('tenis');
        }
        if (selectedCategory === 'cine') {
          return fullText.includes('actor') || fullText.includes('actriz') || fullText.includes('direct') || fullText.includes('cine') || fullText.includes('película') || fullText.includes('teatro') || fullText.includes('comediante');
        }
        if (selectedCategory === 'politica') {
          return detected === 'politico' || fullText.includes('polític') || fullText.includes('politica') || fullText.includes('presid') || fullText.includes('monarc') || fullText.includes('rey') || fullText.includes('reina') || fullText.includes('princesa') || fullText.includes('príncipe') || fullText.includes('infanta') || fullText.includes('realeza') || fullText.includes('borbón') || fullText.includes('casa real') || fullText.includes('hereder') || fullText.includes('líder') || fullText.includes('gobierno') || fullText.includes('ministr') || fullText.includes('diplomát') || fullText.includes('canciller') || fullText.includes('senad') || fullText.includes('alcalde') || fullText.includes('gobernador');
        }
        if (selectedCategory === 'creadores') {
          return fullText.includes('youtube') || fullText.includes('stream') || fullText.includes('influenc') || fullText.includes('model') || fullText.includes('tiktok') || fullText.includes('instagram') || fullText.includes('vlog');
        }
        return true;
      });
    }

    // 5. Dominant Attitude Filter
    if (selectedAttitude !== 'todos') {
      results = results.filter(p => {
        const simp = p.count_simp || 0;
        const fan = p.count_fan || 0;
        const hater = p.count_hater || 0;
        const conozco = p.count_conozco || 0;

        if (selectedAttitude === 'simp') return simp >= fan && simp >= hater && simp >= conozco && simp > 0;
        if (selectedAttitude === 'fan') return fan >= simp && fan >= hater && fan >= conozco && fan > 0;
        if (selectedAttitude === 'hater') return hater >= simp && hater >= fan && hater >= conozco && hater > 0;
        if (selectedAttitude === 'conozco') return conozco >= simp && conozco >= fan && conozco >= hater && conozco > 0;
        return true;
      });
    }

    // 6. Rating & Votes Threshold Filter
    if (minRating > 0) {
      results = results.filter(p => p.rating >= minRating);
    }
    if (minVotes > 0) {
      results = results.filter(p => p.votes_count >= minVotes);
    }

    // 7. Vital Status Filter
    if (selectedStatus !== 'todos') {
      results = results.filter(p => {
        if (selectedStatus === 'fallecidos') return Boolean(p.death_date);
        if (selectedStatus === 'vivos') return !p.death_date;
        return true;
      });
    }

    // 8. Sorting
    if (sortBy === 'rating') {
      results = [...results].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'votos') {
      results = [...results].sort((a, b) => b.votes_count - a.votes_count);
    } else if (sortBy === 'recientes') {
      results = [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'simps') {
      results = [...results].sort((a, b) => (b.count_simp || 0) - (a.count_simp || 0));
    }

    setFilteredResults(results);
  }, [
    personajes, 
    query, 
    selectedGender, 
    selectedNationality, 
    selectedCategory, 
    selectedAttitude, 
    minRating, 
    minVotes, 
    selectedStatus, 
    sortBy
  ]);

  // Extract unique nationalities
  const uniqueNationalities = Array.from(
    new Set(
      personajes
        .map(p => p.nationality)
        .filter((n): n is string => Boolean(n && n !== 'No especificada'))
    )
  ).sort();

  // Helper to reset all filters
  const resetAllFilters = () => {
    setSelectedGender('todos');
    setSelectedNationality('todos');
    setSelectedAttitude('todos');
    setSelectedCategory('todos');
    setMinRating(0);
    setMinVotes(0);
    setSelectedStatus('todos');
    setSortBy('rating');
  };

  const hasActiveFilters = 
    selectedGender !== 'todos' || 
    selectedNationality !== 'todos' || 
    selectedAttitude !== 'todos' || 
    selectedCategory !== 'todos' || 
    minRating > 0 || 
    minVotes > 0 || 
    selectedStatus !== 'todos' || 
    sortBy !== 'rating';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-44 flex flex-col space-y-6 animate-fade-in">
      
      {/* 1. Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors cursor-pointer uppercase tracking-wider bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:border-red-500/30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </button>
      </div>

      {/* 2. Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Resultados para <span className="text-red-500">"{query || 'Todos'}"</span>
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
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-inner'
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
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Filter Trigger Button */}
          <div>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showFilterDropdown || hasActiveFilters
                  ? 'bg-red-500/15 text-red-400 border-red-500/30 shadow-md shadow-red-500/10'
                  : 'bg-[#111116] text-zinc-300 border-white/5 hover:border-white/10 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrar</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>

            {/* Centered Modal Overlay for Filters (Mobile & Desktop) */}
            {showFilterDropdown && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-[#121217] border border-white/10 rounded-3xl p-6 shadow-2xl w-full max-w-lg space-y-5 max-h-[85vh] overflow-y-auto relative animate-scale-up">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h4 className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                      <Filter className="w-4 h-4 text-red-500" />
                      Filtros Avanzados
                    </h4>
                    <div className="flex items-center gap-2">
                      {hasActiveFilters && (
                        <button 
                          onClick={resetAllFilters}
                          className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors uppercase font-bold cursor-pointer flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restablecer
                        </button>
                      )}
                      <button
                        onClick={() => setShowFilterDropdown(false)}
                        className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        title="Cerrar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 1. Actitud Dominante */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3 h-3 text-red-500" />
                      Actitud Dominante de la Comunidad
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'todos', label: 'Todas' },
                        { id: 'simp', label: '🔥 Más SIMP' },
                        { id: 'fan', label: '⭐ Más FAN' },
                        { id: 'hater', label: '👿 Más HATER' },
                        { id: 'conozco', label: '👀 Más CONOZCO' }
                      ].map(a => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAttitude(a.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                            selectedAttitude === a.id
                              ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                              : 'bg-white/5 text-zinc-400 border-transparent hover:text-white'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Gender filter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Género</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'masculino', label: 'Masculino' },
                        { id: 'femenino', label: 'Femenino' },
                        { id: 'no_especificado', label: 'Otro / N/E' }
                      ].map(g => (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGender(g.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                            selectedGender === g.id
                              ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                              : 'bg-white/5 text-zinc-400 border-transparent hover:text-white'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Umbral de Estrellas y Votos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Calificación</label>
                      <select
                        value={minRating}
                        onChange={(e) => setMinRating(Number(e.target.value))}
                        className="w-full bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      >
                        <option value={0}>Cualquiera</option>
                        <option value={4}>★ 4.0 o más</option>
                        <option value={4.5}>★ 4.5 o más</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Mín. Votos</label>
                      <select
                        value={minVotes}
                        onChange={(e) => setMinVotes(Number(e.target.value))}
                        className="w-full bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      >
                        <option value={0}>Todos los perfiles</option>
                        <option value={1}>Al menos 1 voto</option>
                        <option value={5}>5 o más votos</option>
                      </select>
                    </div>
                  </div>

                  {/* 4. Estado Vital */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estado Vital</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'vivos', label: 'Vivos' },
                        { id: 'fallecidos', label: 'Fallecidos' }
                      ].map(st => (
                        <button
                          key={st.id}
                          onClick={() => setSelectedStatus(st.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                            selectedStatus === st.id
                              ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                              : 'bg-white/5 text-zinc-400 border-transparent hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Nationality filter */}
                  {uniqueNationalities.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nacionalidad</label>
                      <select
                        value={selectedNationality}
                        onChange={(e) => setSelectedNationality(e.target.value)}
                        className="w-full bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      >
                        <option value="todos">Todas las nacionalidades</option>
                        {uniqueNationalities.map(nat => (
                          <option key={nat} value={nat}>{nat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 6. Sorting */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ordenar resultados por</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'rating', label: 'Mayor Calificación' },
                        { id: 'votos', label: 'Más Votados' },
                        { id: 'simps', label: 'Más SIMPs' },
                        { id: 'recientes', label: 'Más Recientes' }
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSortBy(s.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between border ${
                            sortBy === s.id
                              ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                              : 'bg-white/5 text-zinc-400 border-transparent hover:text-white'
                          }`}
                        >
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Close action button */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowFilterDropdown(false)}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer"
                    >
                      Aplicar Filtros
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Fast Category Chips Navigation */}
      <div className="flex flex-wrap items-center gap-2 py-1 max-w-full overflow-x-auto scrollbar-thin">
        {[
          { id: 'todos', label: 'Todos', icon: Sparkles },
          { id: 'musica', label: 'Música & Cantantes', icon: Music },
          { id: 'deportes', label: 'Deportistas', icon: Trophy },
          { id: 'cine', label: 'Cine & Actores', icon: Film },
          { id: 'creadores', label: 'Creadores & Streamers', icon: Zap },
          { id: 'politica', label: 'Política & Historia', icon: Crown }
        ].map(cat => {
          const IconComp = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                  : 'bg-[#111116] text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Filter Chips Row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 bg-[#111116] border border-white/5 rounded-2xl p-3">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Filtros activos:</span>

          {selectedGender !== 'todos' && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              Género: {selectedGender}
              <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedGender('todos')} />
            </span>
          )}

          {selectedAttitude !== 'todos' && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              Actitud: {selectedAttitude.toUpperCase()}
              <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedAttitude('todos')} />
            </span>
          )}

          {selectedCategory !== 'todos' && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              Categoría: {selectedCategory}
              <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedCategory('todos')} />
            </span>
          )}

          {minRating > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              ★ {minRating}+
              <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setMinRating(0)} />
            </span>
          )}

          {minVotes > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              {minVotes}+ Votos
              <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setMinVotes(0)} />
            </span>
          )}

          {selectedStatus !== 'todos' && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              Estado: {selectedStatus}
              <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedStatus('todos')} />
            </span>
          )}

          {selectedNationality !== 'todos' && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              País: {selectedNationality}
              <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedNationality('todos')} />
            </span>
          )}

          <button
            onClick={resetAllFilters}
            className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors font-bold uppercase underline ml-auto cursor-pointer"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* 5. Results List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
          <Sparkles className="w-4 h-4 text-red-500" />
          <span>Todos los resultados</span>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {!isLoading && `${filteredResults.length} de ${filteredResults.length}`}
        </span>
      </div>

      {/* 6. Loader or Content */}
      {isLoading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest animate-pulse">Consultando base de datos y wikidata...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        /* Empty results state */
        <div className="bg-[#111116] border border-white/5 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-zinc-800/40 border border-white/5 rounded-full flex items-center justify-center mx-auto">
            <Filter className="w-7 h-7 text-zinc-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white uppercase">Sin coincidencias para estos filtros</h3>
            <p className="text-xs text-zinc-400">
              No hemos encontrado ningún personaje que cumpla exactamente con los criterios de búsqueda o filtros seleccionados. Intenta quitar algunos filtros.
            </p>
          </div>
          <button
            onClick={resetAllFilters}
            className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            Restablecer todos los filtros
          </button>
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
                  <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors leading-tight truncate uppercase">
                    {p.nombre}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate max-w-[150px]">
                    {p.birth_place || p.nationality || 'Verificado'}
                  </p>
                </div>

                {/* Rating score and stats */}
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    <span className="text-xs font-bold text-white">{p.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    ({p.votes_count} votos)
                  </span>

                  {/* Dominant SIMP counter */}
                  {(p.count_simp || 0) > 0 && (
                    <span className="ml-auto text-[10px] text-red-400 font-bold flex items-center gap-0.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                      🔥 {p.count_simp}
                    </span>
                  )}
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
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-400 transition-colors uppercase">
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
                  <Star className="w-3.5 h-3.5 fill-red-500 text-red-500" />
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
