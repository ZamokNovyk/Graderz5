import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  X, 
  Loader2, 
  UserCheck, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Music,
  Trophy,
  Crown,
  Star,
  Clock,
  Trash2,
  Zap,
  ArrowRight,
  Plus
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

interface AutocompleteSearchBarProps {
  value?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  onSearch: (query: string) => void;
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  onSelectPersonaje?: (slug: string) => void;
  onOpenAddPersonaje?: () => void;
  onClose?: () => void;
}

export default function AutocompleteSearchBar({
  value = '',
  placeholder = 'Buscar personajes verificados, cantantes, deportistas...',
  autoFocus = false,
  className = '',
  inputClassName = '',
  onSearch,
  onSelectSuggestion,
  onSelectPersonaje,
  onOpenAddPersonaje,
  onClose
}: AutocompleteSearchBarProps) {
  const [query, setQuery] = useState(value);
  const [searchResponse, setSearchResponse] = useState<SearchResponse>({
    suggestions: [],
    grouped: [],
    source: 'local_fallback',
    executionTimeMs: 0
  });
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync prop value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Supabase RPC & Fast DB querying with Debounce (200ms)
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    const cleanTerm = searchTerm.trim();
    if (!cleanTerm) {
      setSearchResponse({
        suggestions: [],
        grouped: [],
        source: 'local_fallback',
        executionTimeMs: 0
      });
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchWithAutocompleteAdvanced(cleanTerm, 0.25);
      setSearchResponse({
        ...response,
        suggestions: (response.suggestions || []).slice(0, 10)
      });
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.warn('Error en la búsqueda con Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle key change with debounce of 200ms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setSearchResponse({
        suggestions: [],
        grouped: [],
        source: 'local_fallback',
        executionTimeMs: 0
      });
      setIsLoading(false);
      setHasSearched(false);
      setIsOpen(true); // Keep open to show recent searches
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 200);
  };

  // Keyboard navigation (Up, Down, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentList = query.trim() ? searchResponse.suggestions : [];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (currentList.length > 0) {
        setSelectedIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentList.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && currentList[selectedIndex]) {
        handleSmartNavigation(currentList[selectedIndex]);
      } else if (searchResponse.suggestions.length > 0) {
        // Automatically choose top match or fuzzy suggestion if user presses Enter
        handleSmartNavigation(searchResponse.suggestions[0]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      if (onClose) onClose();
    }
  };

  // INTELLIGENT NAVIGATION: Identifies what result was chosen and directs seamlessly
  const handleSmartNavigation = (suggestion: SearchSuggestion) => {
    // 1. Save to recent searches history
    const updatedRecents = saveRecentSearch({
      term: suggestion.title,
      slug: suggestion.slug,
      avatarUrl: suggestion.avatarUrl,
      type: suggestion.type
    });
    setRecentSearches(updatedRecents);

    // 2. Close suggestions popover
    setIsOpen(false);
    setSelectedIndex(-1);

    // 3. Dispatch navigation action
    if (onSelectPersonaje) {
      onSelectPersonaje(suggestion.slug);
    } else if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    } else {
      // Default direct URL route push
      window.history.pushState(null, '', `/personajes/${suggestion.slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Selecting an item from recent search history
  const handleSelectRecent = (item: RecentSearchItem) => {
    if (item.slug) {
      // Direct navigation to person
      if (onSelectPersonaje) {
        onSelectPersonaje(item.slug);
      } else {
        window.history.pushState(null, '', `/personajes/${item.slug}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      setIsOpen(false);
    } else {
      // Search term
      setQuery(item.term);
      fetchSuggestions(item.term);
      onSearch(item.term);
    }
  };

  const handleRemoveRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(id);
    setRecentSearches(updated);
  };

  const handleClearAllRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTerm = query.trim();
    if (!cleanTerm) return;

    // Save generic search term to history
    const updatedRecents = saveRecentSearch({
      term: cleanTerm,
      type: 'query'
    });
    setRecentSearches(updatedRecents);

    setIsOpen(false);
    setSelectedIndex(-1);
    onSearch(cleanTerm);
  };

  const handleClearInput = () => {
    setQuery('');
    setSearchResponse({
      suggestions: [],
      grouped: [],
      source: 'local_fallback',
      executionTimeMs: 0
    });
    setSelectedIndex(-1);
    setHasSearched(false);
    inputRef.current?.focus();
    // Re-open to show recent searches
    setIsOpen(true);
  };

  // Dynamic category badge renderer
  const renderBadge = (type: SearchSuggestion['type'], isFuzzy = false) => {
    if (isFuzzy) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
          {type === 'cantante' ? (
            <Music className="w-3.5 h-3.5" />
          ) : type === 'deportista' ? (
            <Trophy className="w-3.5 h-3.5" />
          ) : type === 'politico' ? (
            <Crown className="w-3.5 h-3.5" />
          ) : (
            <UserCheck className="w-3.5 h-3.5" />
          )}
          {type === 'cantante' ? 'CANTANTE' : type === 'deportista' ? 'DEPORTISTA' : type === 'politico' ? 'POLÍTICO' : 'Q5 VERIFICADO'}
        </span>
      );
    }

    switch (type) {
      case 'cantante':
        return (
          <span className="px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Music className="w-3 h-3" />
            Cantante
          </span>
        );
      case 'deportista':
        return (
          <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Deportista
          </span>
        );
      case 'politico':
        return (
          <span className="px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Político
          </span>
        );
      case 'personaje':
      default:
        return (
          <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            Q5 VERIFICADO
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className={`relative flex items-center w-full bg-[#111116]/95 border border-white/10 hover:border-red-500/50 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 rounded-full px-4 py-2.5 sm:py-3.5 transition-all group ${inputClassName}`}>
          
          {/* Query loader or search icon */}
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-red-500 animate-spin flex-shrink-0 mr-2.5" />
          ) : (
            <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-red-500 transition-colors flex-shrink-0 mr-2.5" />
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full bg-transparent text-white text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none font-medium pr-1 selection:bg-red-600"
          />

          {/* Clear input button */}
          {query && (
            <button
              type="button"
              onClick={handleClearInput}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors mr-1 cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-500 text-white p-1.5 sm:p-2 rounded-full transition-all active:scale-95 flex-shrink-0 cursor-pointer shadow-md shadow-red-950/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            title="Buscar"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </button>
        </div>
      </form>

      {/* AUTOCOMPLETE POPUP (Recent Searches OR Real-Time Grouped Results / Quizás quisiste decir) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#0c0c11] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          
          {/* CASE A: USER HAS NOT TYPED -> DISPLAY RECENT SEARCH HISTORY */}
          {!query.trim() && (
            <div className="p-3">
              <div className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-400 font-semibold border-b border-white/5 pb-2">
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
                    <span>Borrar todo</span>
                  </button>
                )}
              </div>

              {recentSearches.length > 0 ? (
                <div className="mt-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {recentSearches.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectRecent(item)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.term}
                            className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800/80 border border-white/5 flex items-center justify-center flex-shrink-0 text-zinc-400 group-hover:text-red-400">
                            <Clock className="w-3.5 h-3.5" />
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
                          <span className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-full border border-white/5">
                            Perfil
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRecent(e, item.id)}
                          className="p-1 text-zinc-600 hover:text-zinc-300 rounded hover:bg-white/10 transition-colors"
                          title="Eliminar de recientes"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500 select-none">
                  <p>No tienes búsquedas recientes todavía.</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Escribe para buscar cantantes, deportistas o personajes en tiempo real.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CASE B: USER HAS TYPED -> SUPABASE RPC & INSTANT GROUPED RESULTS + FUZZY TYPO SUGGESTIONS */}
          {query.trim().length > 0 && (
            <>
              {/* Telemetry status bar */}
              <div className="px-4 py-2 text-[11px] font-medium text-zinc-400 border-b border-white/5 flex items-center justify-between bg-[#121219]/60">
                <div className="flex items-center gap-1.5">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 text-red-500 animate-spin" />
                      <span>Buscando coincidencias en tiempo real...</span>
                    </>
                  ) : searchResponse.hasFuzzyOnly ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300 font-semibold">
                        Sugerencia inteligente por aproximación
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                      <span className="text-zinc-300 font-semibold">
                        {searchResponse.source === 'rpc' ? 'Supabase RPC Stored Procedure' : 'Supabase Instant Database'}
                      </span>
                    </>
                  )}
                </div>

                {!isLoading && (
                  <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                    ⚡ {searchResponse.executionTimeMs} ms • {searchResponse.suggestions.length} {searchResponse.suggestions.length === 1 ? 'resultado' : 'resultados'}
                  </span>
                )}
              </div>

              {/* Dynamic Grouped Results by Category OR Prominent Fuzzy Match Cards */}
              {!isLoading && searchResponse.suggestions.length > 0 && (
                <div className="max-h-[380px] overflow-y-auto p-2.5 space-y-3 custom-scrollbar">
                  {searchResponse.grouped.map((group) => (
                    <div key={group.category} className="space-y-1.5">
                      {/* Section header */}
                      <div className="px-2.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${searchResponse.hasFuzzyOnly ? 'bg-amber-400' : 'bg-red-500'}`}></span>
                        <span>{group.category}</span>
                        <span className="text-zinc-600 font-normal">({group.items.length})</span>
                      </div>

                      {/* Items in this category */}
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const globalIdx = searchResponse.suggestions.findIndex(s => s.id === item.id);
                          const isSelected = globalIdx === selectedIndex;
                          const isFuzzy = Boolean(item.isFuzzy);

                          // EXACT DESIGN FROM IMAGE 3 FOR "Quizás quisiste decir"
                          if (isFuzzy) {
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleSmartNavigation(item)}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                className={`flex items-center justify-between gap-3.5 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                                  isSelected 
                                    ? 'bg-[#221b08] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50' 
                                    : 'bg-[#151307] border-amber-500/60 hover:bg-[#1c1808] hover:border-amber-400'
                                }`}
                              >
                                {/* Left: Avatar & Title + Quizás quisiste decir */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {item.avatarUrl ? (
                                    <img
                                      src={item.avatarUrl}
                                      alt={item.title}
                                      className="w-10 h-10 rounded-full object-cover border border-amber-500/50 flex-shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-amber-950/50 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                                      <UserCheck className="w-5 h-5 text-amber-400" />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wide truncate">
                                        {item.title}
                                      </span>

                                      {/* "Quizás quisiste decir" badge as in Image 3 */}
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                        Quizás quisiste decir
                                      </span>
                                    </div>

                                    {item.subtitle && (
                                      <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                                        {item.subtitle}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Category badge & Rating */}
                                <div className="flex items-center gap-2.5 flex-shrink-0">
                                  <div className="flex items-center gap-1 bg-black/50 border border-amber-500/30 px-2 py-1 rounded-md text-xs text-amber-400 font-bold">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span>{item.rating.toFixed(1)}</span>
                                  </div>

                                  <div className="hidden sm:block">
                                    {renderBadge(item.type, true)}
                                  </div>

                                  <ArrowRight className={`w-4 h-4 text-amber-500/70 transition-transform ${isSelected ? 'translate-x-1 text-amber-300' : ''}`} />
                                </div>
                              </div>
                            );
                          }

                          // STANDARD EXACT MATCH ROW
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSmartNavigation(item)}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-red-500/10 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]' 
                                  : 'hover:bg-white/5 border border-transparent'
                              }`}
                            >
                              {/* Left: Avatar & Bio */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="relative flex-shrink-0">
                                    {item.avatarUrl ? (
                                      <img
                                        src={item.avatarUrl}
                                        alt={item.title}
                                        className={`w-9 h-9 rounded-full object-cover border ${item.deathDate ? 'border-zinc-700 grayscale-[25%]' : 'border-white/10'}`}
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-xs">
                                        {item.type === 'cantante' ? (
                                          <Music className="w-4 h-4 text-red-400" />
                                        ) : item.type === 'deportista' ? (
                                          <Trophy className="w-4 h-4 text-blue-400" />
                                        ) : item.type === 'politico' ? (
                                          <Crown className="w-4 h-4 text-purple-400" />
                                        ) : (
                                          <Sparkles className="w-4 h-4 text-amber-400" />
                                        )}
                                      </div>
                                    )}

                                    {item.deathDate && (
                                      <div 
                                        title={`Fallecido (${item.deathDate})`}
                                        className="absolute -top-1 -right-1 bg-red-600 text-[9px] px-1 rounded-full border border-red-400 shadow-[0_0_8px_rgba(220,38,38,0.5)] leading-none text-white"
                                      >
                                        🎗️
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs sm:text-sm font-bold truncate ${
                                        isSelected ? 'text-red-400' : 'text-white'
                                      }`}>
                                        {item.title}
                                      </span>

                                      {item.deathDate && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-zinc-400 bg-black/80 border border-zinc-700/80 px-1.5 py-0.2 rounded">
                                          <span>🎗️</span>
                                          <span className="hidden sm:inline">Q.E.P.D.</span>
                                        </span>
                                      )}
                                    </div>

                                    {item.subtitle && (
                                      <p className="text-[11px] text-zinc-400 truncate font-light">
                                        {item.subtitle}
                                      </p>
                                    )}
                                  </div>
                                </div>

                              {/* Right: Badge & Rating */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1 bg-black/40 border border-white/5 px-2 py-0.5 rounded text-[11px] text-amber-400 font-bold">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>{item.rating.toFixed(1)}</span>
                                </div>
                                <div className="hidden sm:block">
                                  {renderBadge(item.type, false)}
                                </div>
                                <ArrowRight className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${isSelected ? 'text-red-400 translate-x-0.5' : ''}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state when NO matches nor fuzzy suggestions are found */}
              {!isLoading && hasSearched && searchResponse.suggestions.length === 0 && (
                <div className="px-5 py-6 text-center select-none space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#161622] border border-white/5 flex items-center justify-center text-zinc-500">
                    <HelpCircle className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-zinc-200">
                      No se encontraron resultados para &quot;<span className="text-red-500">{query}</span>&quot;
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      ¿La persona existe en Wikipedia? Puedes verificarla y registrarla al instante.
                    </p>
                  </div>

                  {onOpenAddPersonaje && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAddPersonaje();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-3.5 py-1.5 rounded-full shadow-md shadow-red-950/50 cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Verificar y agregar con Wikipedia</span>
                    </button>
                  )}
                </div>
              )}

              {/* Dropdown footer bar */}
              <div 
                onClick={() => handleSubmit()}
                className="px-4 py-2.5 bg-[#0e0e13] border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ver todos los resultados para &quot;<strong>{query}</strong>&quot;</span>
                </div>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono">
                  ↵ Enter
                </span>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
