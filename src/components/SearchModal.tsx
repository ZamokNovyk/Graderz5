import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  X, 
  Loader2, 
  UserCheck, 
  Sparkles, 
  AlertCircle, 
  Music, 
  Trophy, 
  Crown, 
  Star, 
  Clock, 
  Trash2, 
  Zap, 
  ArrowRight, 
  Plus,
  Flame
} from 'lucide-react';
import { 
  searchWithAutocompleteAdvanced, 
  SearchSuggestion, 
  SearchResponse,
  getRecentSearches, 
  saveRecentSearch, 
  removeRecentSearch, 
  clearRecentSearches,
  RecentSearchItem 
} from '../lib/search';
import { recordPersonajeSearch } from '../lib/personajesService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPersonaje?: (slug: string) => void;
  onSearchSubmit?: (query: string) => void;
  onOpenAddPersonaje?: () => void;
  initialQuery?: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPersonaje,
  onSearchSubmit,
  onOpenAddPersonaje,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchResponse, setSearchResponse] = useState<SearchResponse>({
    suggestions: [],
    grouped: [],
    source: 'local_fallback',
    executionTimeMs: 0
  });
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Focus input on open and refresh recents
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setRecentSearches(getRecentSearches());
      setSelectedIndex(-1);
      // Timeout ensures the modal is fully mounted and DOM element is available
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search logic
  const executeSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResponse({
        suggestions: [],
        grouped: [],
        source: 'local_fallback',
        executionTimeMs: 0
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchWithAutocompleteAdvanced(searchTerm);
      setSearchResponse(response);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error in modal:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length > 0) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(query);
      }, 180);
    } else {
      setSearchResponse({
        suggestions: [],
        grouped: [],
        source: 'local_fallback',
        executionTimeMs: 0
      });
      setIsLoading(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, isOpen, executeSearch]);

  const handleSelectPersonaje = (slug: string, title?: string, avatarUrl?: string, type?: SearchSuggestion['type']) => {
    if (title && slug) {
      saveRecentSearch({
        term: title,
        slug: slug,
        avatarUrl: avatarUrl,
        type: type || 'personaje'
      });
      setRecentSearches(getRecentSearches());
    }

    if (slug) {
      // Increment search_count in Supabase database in the background
      recordPersonajeSearch(slug);
    }

    if (onSelectPersonaje) {
      onSelectPersonaje(slug);
    }
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    // If an item is highlighted via keyboard navigation
    if (selectedIndex >= 0 && searchResponse.suggestions[selectedIndex]) {
      const selected = searchResponse.suggestions[selectedIndex];
      handleSelectPersonaje(selected.slug, selected.title, selected.avatarUrl, selected.type);
      return;
    }

    // Save as text search history
    saveRecentSearch({ term: cleanQuery, type: 'query' });
    setRecentSearches(getRecentSearches());

    if (onSearchSubmit) {
      onSearchSubmit(cleanQuery);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = searchResponse.suggestions.length;
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    }
  };

  const handleRemoveRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeRecentSearch(id);
    setRecentSearches(getRecentSearches());
  };

  const handleClearAllRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const renderBadge = (type: SearchSuggestion['type'], isFuzzy = false) => {
    if (isFuzzy) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
          {type === 'cantante' ? (
            <Music className="w-3.5 h-3.5" />
          ) : type === 'deportista' ? (
            <Trophy className="w-3.5 h-3.5" />
          ) : type === 'politico' ? (
            <Crown className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {type === 'cantante' ? 'CANTANTE' : type === 'deportista' ? 'DEPORTISTA' : type === 'politico' ? 'POLÍTICO' : 'PERSONAJE'}
        </span>
      );
    }

    switch (type) {
      case 'cantante':
        return (
          <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Music className="w-3 h-3" />
            CANTANTE
          </span>
        );
      case 'deportista':
        return (
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            DEPORTISTA
          </span>
        );
      case 'politico':
        return (
          <span className="px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-3 h-3" />
            POLÍTICO
          </span>
        );
      case 'personaje':
      default:
        return (
          <span className="px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            Q5 VERIFICADO
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="search-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 pt-12 sm:pt-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div 
        id="search-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0e0e13] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] my-auto"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-36 bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-800 p-0.5 shadow-md shadow-red-950/50 flex items-center justify-center text-white">
              <div className="w-full h-full bg-[#131118] rounded-[10px] flex items-center justify-center">
                <Flame className="w-4 h-4 text-red-500 fill-red-500/30" />
              </div>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-display uppercase tracking-wide flex items-center gap-1.5">
                Buscar Personajes
              </h3>
              <p className="text-[11px] text-zinc-400">
                Cantantes, deportistas, actores y figuras públicas
              </p>
            </div>
          </div>

          <button 
            id="close-search-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#141419] border border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-4 sm:p-5 border-b border-white/5 bg-[#09090c]/50">
          <form onSubmit={handleFormSubmit} className="relative">
            <div className="relative flex items-center bg-[#141419] border border-red-500/30 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-inner">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-red-500 animate-spin flex-shrink-0 mr-3" />
              ) : (
                <Search className="w-5 h-5 text-zinc-400 flex-shrink-0 mr-3" />
              )}

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe el nombre del personaje..."
                className="w-full bg-transparent text-white text-sm sm:text-base placeholder:text-zinc-500 focus:outline-none font-medium pr-2"
                autoComplete="off"
                spellCheck="false"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors mr-2 cursor-pointer"
                  title="Limpiar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-red-950/40 cursor-pointer flex-shrink-0"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* Results / History Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* CASE A: No query -> Show Recent Searches */}
          {!query.trim() && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs text-zinc-400 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-500" />
                  <span>Búsquedas recientes</span>
                </div>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllRecents}
                    className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Borrar historial</span>
                  </button>
                )}
              </div>

              {recentSearches.length > 0 ? (
                <div className="space-y-1.5">
                  {recentSearches.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.slug) {
                          handleSelectPersonaje(item.slug, item.term, item.avatarUrl, item.type as any);
                        } else {
                          setQuery(item.term);
                        }
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.term}
                            className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-white/5 flex items-center justify-center flex-shrink-0 text-zinc-400 group-hover:text-red-400">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-zinc-200 group-hover:text-white truncate block">
                            {item.term}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.slug && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                            Ver Perfil
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRecent(e, item.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-zinc-500">
                  <Search className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-zinc-400">¿A quién estás buscando?</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
                    Escribe el nombre de cantantes, actores, futbolistas o personajes públicos para explorar su perfil y calificaciones.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CASE B: Query present -> Show Results & Categories */}
          {query.trim().length > 0 && (
            <div className="space-y-4">
              {/* Telemetry bar */}
              <div className="text-[11px] font-medium text-zinc-400 flex items-center justify-between pb-1 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 text-red-500 animate-spin" />
                      <span>Buscando coincidencias...</span>
                    </>
                  ) : searchResponse.hasFuzzyOnly ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-300 font-semibold">
                        Sugerencia por aproximación
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-red-400 fill-red-400/20" />
                      <span className="text-zinc-300 font-semibold">
                        Coincidencias encontradas
                      </span>
                    </>
                  )}
                </div>

                {!isLoading && (
                  <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                    {searchResponse.suggestions.length} {searchResponse.suggestions.length === 1 ? 'resultado' : 'resultados'}
                  </span>
                )}
              </div>

              {/* Grouped results */}
              {!isLoading && searchResponse.suggestions.length > 0 && (
                <div className="space-y-3">
                  {searchResponse.grouped.map((group) => (
                    <div key={group.category} className="space-y-1.5">
                      <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span>{group.category}</span>
                        <span className="text-zinc-600 font-normal">({group.items.length})</span>
                      </div>

                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const isFuzzy = Boolean(item.isFuzzy);

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectPersonaje(item.slug, item.title, item.avatarUrl, item.type)}
                              className={`flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                isFuzzy 
                                  ? 'bg-[#151010] border-red-500/40 hover:bg-red-950/20 hover:border-red-500' 
                                  : 'bg-white/[0.02] border-white/5 hover:bg-red-500/10 hover:border-red-500/40'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {item.avatarUrl ? (
                                  <img
                                    src={item.avatarUrl}
                                    alt={item.title}
                                    className="w-10 h-10 rounded-full object-cover border border-red-500/40 flex-shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                                    <UserCheck className="w-5 h-5 text-red-400" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide truncate">
                                      {item.title}
                                    </span>
                                    {isFuzzy && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 border border-red-500/40 text-red-300">
                                        <AlertCircle className="w-3 h-3 text-red-400" />
                                        Quizás quisiste decir
                                      </span>
                                    )}
                                  </div>
                                  {item.subtitle && (
                                    <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                                      {item.subtitle}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                <div className="flex items-center gap-1 bg-black/50 border border-white/10 px-2 py-1 rounded-md text-xs text-zinc-200 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-[#ffbf00] text-[#ffbf00]" />
                                  <span>{item.rating.toFixed(1)}</span>
                                </div>

                                <div className="hidden sm:block">
                                  {renderBadge(item.type, isFuzzy)}
                                </div>

                                <ArrowRight className="w-4 h-4 text-red-500/70" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No results state */}
              {!isLoading && searchResponse.suggestions.length === 0 && (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      No se encontraron resultados para &quot;{query}&quot;
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                      Puedes agregar a este personaje verificándolo con Wikipedia.
                    </p>
                  </div>

                  {onOpenAddPersonaje && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAddPersonaje();
                      }}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-950/50 cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar personaje a Graderz5</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {query.trim().length > 0 && (
          <div 
            onClick={handleFormSubmit}
            className="p-3 bg-[#09090c] border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-red-500" />
              <span>Ver todos los resultados para &quot;<strong>{query}</strong>&quot;</span>
            </div>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono">
              ↵ ENTER
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchModal;
