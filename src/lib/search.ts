import { supabase } from './supabase';
import { Personaje } from '../types';
import { getPersonajesList } from './personajesService';

export interface SearchSuggestion {
  id: string;
  type: 'cantante' | 'deportista' | 'politico' | 'personaje';
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  isFuzzy?: boolean;
  fuzzySimilarity?: number;
  originalQuery?: string;
  slug: string;
  rating: number;
  votesCount?: number;
  deathDate?: string;
}

export interface RecentSearchItem {
  id: string;
  term: string;
  slug?: string;
  avatarUrl?: string;
  type?: 'cantante' | 'deportista' | 'politico' | 'personaje' | 'query';
  timestamp: number;
}

export interface SearchResponse {
  suggestions: SearchSuggestion[];
  grouped: {
    category: string;
    items: SearchSuggestion[];
  }[];
  source: 'rpc' | 'supabase_table' | 'local_fallback' | 'fuzzy_engine';
  executionTimeMs: number;
  hasFuzzyOnly?: boolean;
  bestFuzzySuggestion?: SearchSuggestion;
}

const RECENT_SEARCHES_KEY = 'graderz5_recent_searches';
const MAX_RECENT_ITEMS = 8;

/**
 * Recovers recent searches from localStorage
 */
export function getRecentSearches(): RecentSearchItem[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading recent searches:', e);
    return [];
  }
}

/**
 * Adds an item to the recent search history
 */
export function saveRecentSearch(item: Omit<RecentSearchItem, 'id' | 'timestamp'>): RecentSearchItem[] {
  try {
    const current = getRecentSearches();
    const cleanTerm = item.term.trim();
    if (!cleanTerm) return current;

    // Filter out previous entries with identical term or slug
    const filtered = current.filter(
      r => r.term.toLowerCase() !== cleanTerm.toLowerCase() && (!item.slug || r.slug !== item.slug)
    );

    const newItem: RecentSearchItem = {
      ...item,
      id: `recent-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now()
    };

    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error saving recent search:', e);
    return [];
  }
}

/**
 * Removes a single item from the recent search history
 */
export function removeRecentSearch(id: string): RecentSearchItem[] {
  try {
    const current = getRecentSearches();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error removing recent search:', e);
    return [];
  }
}

/**
 * Clears the entire recent search history
 */
export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (e) {
    console.warn('Error clearing recent searches:', e);
  }
}

/**
 * Normalizes text removing accents, punctuation and excess whitespace.
 */
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, ' ')   // keep only alphanumeric and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Spanish / Cross-language phonetic folding:
 * - 'y' and 'i' -> 'i' (e.g. 'terri' vs 'terry')
 * - 'v' -> 'b' (e.g. 'vega' vs 'bega')
 * - 'z', 'c' (soft) -> 's'
 * - silent 'h' removed
 * - duplicate consecutive consonants collapsed
 */
export function phoneticFolding(str: string): string {
  return normalizeText(str)
    .replace(/y/g, 'i')
    .replace(/v/g, 'b')
    .replace(/z/g, 's')
    .replace(/ce/g, 'se')
    .replace(/ci/g, 'si')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1'); // collapse doubles: 'll' -> 'l', 'ss' -> 's'
}

/**
 * Fast Damerau-Levenshtein distance calculation (handles insertion, deletion, substitution and transposition).
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Calculates similarity coefficient (0 to 1) between two terms.
 */
export function calculateTermSimilarity(query: string, target: string): number {
  const qNorm = normalizeText(query);
  const tNorm = normalizeText(target);

  if (qNorm === tNorm) return 1.0;
  if (!qNorm || !tNorm) return 0.0;

  // Exact prefix match
  if (tNorm.startsWith(qNorm)) return 0.95;
  if (tNorm.includes(qNorm)) return 0.90;

  // Check phonetic folding
  const qPhon = phoneticFolding(query);
  const tPhon = phoneticFolding(target);
  if (qPhon === tPhon) return 0.93;
  if (tPhon.startsWith(qPhon) || tPhon.includes(qPhon)) return 0.88;

  // Damerau-Levenshtein on normalized terms
  const maxLen = Math.max(qNorm.length, tNorm.length);
  const dist = damerauLevenshteinDistance(qNorm, tNorm);
  const rawSimilarity = 1 - dist / maxLen;

  // Damerau-Levenshtein on phonetic terms
  const phonMaxLen = Math.max(qPhon.length, tPhon.length);
  const phonDist = damerauLevenshteinDistance(qPhon, tPhon);
  const phonSimilarity = 1 - phonDist / phonMaxLen;

  return Math.max(rawSimilarity, phonSimilarity);
}

/**
 * Common Spanish stopwords that carry little search specificity.
 */
const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'en', 'a', 'y', 'e', 'o', 'u', 'por', 'para',
  'con', 'sin', 'sobre', 'tras', 'que', 'es', 'son', 'se', 'su', 'sus',
  'como', 'le', 'les', 'me', 'nos', 'mi', 'mis', 'tu', 'tus'
]);

/**
 * Concept & synonym expansions to bridge colloquial phrases with encyclopedic biographies.
 * (e.g. "hija de" <-> "primogénita", "esposa de" <-> "consorte", "jugador" <-> "delantero", etc.)
 */
const CONCEPT_EXPANSIONS: Record<string, string[]> = {
  hija: ['hija', 'primogenita', 'descendiente', 'infanta', 'hijo', 'hijos', 'padre', 'madre'],
  hijo: ['hijo', 'primogenito', 'descendiente', 'principe', 'infante', 'hija', 'padre', 'madre'],
  hijas: ['hijas', 'hijos', 'descendientes', 'primogenita', 'infanta'],
  hijos: ['hijos', 'hijas', 'descendientes', 'primogenito', 'infante'],
  padre: ['padre', 'papa', 'felipe', 'rey', 'progenitor'],
  madre: ['madre', 'mama', 'letizia', 'reina', 'progenitora'],
  esposa: ['esposa', 'consorte', 'conyuge', 'mujer', 'pareja', 'matrimonio'],
  esposo: ['esposo', 'consorte', 'conyuge', 'marido', 'pareja', 'matrimonio'],
  rey: ['rey', 'reina', 'monarca', 'trono', 'corona', 'realeza', 'real', 'borbon', 'felipe'],
  reina: ['reina', 'rey', 'monarca', 'trono', 'corona', 'realeza', 'real', 'letizia'],
  princesa: ['princesa', 'principe', 'asturias', 'heredera', 'corona', 'leonor'],
  principe: ['principe', 'princesa', 'heredero', 'corona'],
  futbolista: ['futbolista', 'jugador', 'futbol', 'delantero', 'balon', 'club', 'equipo', 'gol', 'soccer'],
  jugador: ['jugador', 'futbolista', 'atleta', 'delantero', 'club', 'equipo', 'deportista'],
  cantante: ['cantante', 'musico', 'artista', 'vocalista', 'cancion', 'album', 'pop', 'rapero', 'rapera', 'musica'],
  rapero: ['rapero', 'cantante', 'hip hop', 'trap', 'musica', 'artista'],
  rapera: ['rapera', 'cantante', 'hip hop', 'trap', 'musica', 'artista', 'blackpink'],
  presidente: ['presidente', 'mandatario', 'gobierno', 'politico', 'pais', 'primer ministro', 'lider']
};

/**
 * Advanced match evaluation between user query and Personaje (exact, fuzzy & semantic token matching).
 */
export function evaluatePersonajeMatch(
  query: string,
  personaje: Personaje
): { score: number; isFuzzy: boolean; reason?: string } {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return { score: 0, isFuzzy: false };

  const normName = normalizeText(personaje.nombre);
  const normSlug = normalizeText(personaje.slug.replace(/\./g, ' '));
  const normExtract = personaje.extract ? normalizeText(personaje.extract) : '';
  const combinedBioText = `${normName} ${normSlug} ${normExtract}`;

  // 1. EXACT or SUBSTRING MATCH: Is the query a direct substring of name or slug?
  if (normName === cleanQuery || normSlug === cleanQuery) {
    return { score: 1.0, isFuzzy: false };
  }
  if (normName.startsWith(cleanQuery) || normSlug.startsWith(cleanQuery)) {
    return { score: 0.98, isFuzzy: false };
  }
  if (normName.includes(cleanQuery) || normSlug.includes(cleanQuery)) {
    return { score: 0.92, isFuzzy: false };
  }

  // 2. WORD-LEVEL EXACT or FUZZY MATCH ON NAME
  // Example: Query "lenor" compared to words in "Leonor de Borbón" -> ["leonor", "de", "borbon"]
  const nameWords = normName.split(' ').filter(w => w.length > 1);
  let bestWordScore = 0;

  for (const word of nameWords) {
    if (word === cleanQuery) {
      return { score: 0.95, isFuzzy: false };
    }
    if (word.startsWith(cleanQuery) && cleanQuery.length >= 3) {
      return { score: 0.90, isFuzzy: false };
    }

    // Fuzzy comparison against word
    const sim = calculateTermSimilarity(cleanQuery, word);
    if (sim > bestWordScore) {
      bestWordScore = sim;
    }
  }

  // Example: Query "lenor" vs "leonor" (sim = 0.833)
  // Example: Query "terri" vs "terry" (sim = 0.93)
  if (bestWordScore >= 0.65) {
    return {
      score: bestWordScore * 0.95,
      isFuzzy: true,
      reason: 'Similaridad por palabra'
    };
  }

  // 3. FULL NAME LEVEL FUZZY MATCH
  const fullNameSim = calculateTermSimilarity(cleanQuery, normName);
  if (fullNameSim >= 0.60) {
    return {
      score: fullNameSim * 0.90,
      isFuzzy: true,
      reason: 'Similaridad de nombre completo'
    };
  }

  // 4. SUBSTRING IN EXTRACT (Direct Biographical phrase match)
  if (cleanQuery.length >= 4 && normExtract.includes(cleanQuery)) {
    return {
      score: 0.85,
      isFuzzy: true,
      reason: 'Mención biográfica directa'
    };
  }

  // 5. MULTI-TOKEN SEMANTIC & CONTEXTUAL MATCHING (E.g. "hija del rey felipe", "jugador del inter miami", "cantante de k-pop")
  const queryTokens = cleanQuery
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 1 && !SPANISH_STOPWORDS.has(t));

  if (queryTokens.length >= 2) {
    let matchedTokensCount = 0;
    let totalTokenWeight = 0;

    for (const token of queryTokens) {
      let tokenFound = false;

      // Check direct token presence in bio/name
      if (combinedBioText.includes(token)) {
        tokenFound = true;
      } else {
        // Check semantic concept expansions (e.g. 'hija' -> 'primogenita', 'cantante' -> 'vocalista')
        const syns = CONCEPT_EXPANSIONS[token] || [];
        for (const syn of syns) {
          if (combinedBioText.includes(syn)) {
            tokenFound = true;
            break;
          }
        }
      }

      // Check fuzzy token match in bio words if still not found
      if (!tokenFound && token.length >= 4) {
        const bioWords = combinedBioText.split(' ').filter(w => w.length >= 4);
        for (const bw of bioWords) {
          if (calculateTermSimilarity(token, bw) >= 0.82) {
            tokenFound = true;
            break;
          }
        }
      }

      if (tokenFound) {
        matchedTokensCount++;
        totalTokenWeight += 1;
      }
    }

    const tokenCoverageRatio = matchedTokensCount / queryTokens.length;

    // If 100% of meaningful tokens match or at least 70% in longer queries
    if (tokenCoverageRatio >= 0.75 && matchedTokensCount >= 2) {
      const semanticScore = 0.78 + (tokenCoverageRatio * 0.14); // 0.88 - 0.92
      return {
        score: semanticScore,
        isFuzzy: true,
        reason: 'Coincidencia conceptual en biografía'
      };
    }
  }

  return { score: 0, isFuzzy: false };
}

/**
 * Detects the visual category of a public figure based on biographical text keywords.
 */
export function detectType(nombre: string, extract: string, occupation?: string): 'cantante' | 'deportista' | 'politico' | 'personaje' {
  const text = `${nombre} ${extract} ${occupation || ''}`.toLowerCase();
  if (
    text.includes('cantante') || 
    text.includes('rapero') || 
    text.includes('rapera') || 
    text.includes('rapper') || 
    text.includes('música') || 
    text.includes('musica') || 
    text.includes('singer') || 
    text.includes('blackpink') ||
    text.includes('popstar') ||
    text.includes('banda') ||
    text.includes('cantautor') ||
    text.includes('compositor')
  ) {
    return 'cantante';
  }
  
  if (
    text.includes('futbolista') || 
    text.includes('jugador') || 
    text.includes('deportista') || 
    text.includes('soccer') || 
    text.includes('atleta') || 
    text.includes('campeón') || 
    text.includes('baloncesto') || 
    text.includes('tenista') ||
    text.includes('fórmula') ||
    text.includes('boxeador') ||
    text.includes('nadador') ||
    text.includes('piloto')
  ) {
    return 'deportista';
  }
  
  if (
    text.includes('político') || 
    text.includes('politico') || 
    text.includes('política') || 
    text.includes('politica') || 
    text.includes('presidente') || 
    text.includes('president') || 
    text.includes('primer ministro') || 
    text.includes('senador') ||
    text.includes('alcalde') ||
    text.includes('gobernador') ||
    text.includes('princesa') ||
    text.includes('príncipe') ||
    text.includes('principe') ||
    text.includes('monarca') ||
    text.includes('reina') ||
    text.includes('rey') ||
    text.includes('infanta') ||
    text.includes('realeza') ||
    text.includes('casa real') ||
    text.includes('borbón') ||
    text.includes('borbon') ||
    text.includes('heredera') ||
    text.includes('heredero') ||
    text.includes('canciller') ||
    text.includes('diplomátic') ||
    text.includes('ministro') ||
    text.includes('ministra') ||
    text.includes('diputado') ||
    text.includes('congresista') ||
    text.includes('líder') ||
    text.includes('lider')
  ) {
    return 'politico';
  }
  
  return 'personaje';
}

/**
 * Performs autocomplete and search matching with:
 * 1. Supabase RPC call ('search_personajes')
 * 2. Supabase SQL Table ILIKE query
 * 3. Smart Fuzzy Matching Engine: identifies typos (e.g. "lenor" -> "Leonor de Borbón", "terri" -> "Terry Vega")
 * 4. Categorization and "Quizás quisiste decir" flags
 */
export async function searchWithAutocompleteAdvanced(
  query: string, 
  threshold = 0.25
): Promise<SearchResponse> {
  const startTime = performance.now();
  const cleanTerm = query.trim();
  
  if (!cleanTerm) {
    return {
      suggestions: [],
      grouped: [],
      source: 'local_fallback',
      executionTimeMs: 0
    };
  }

  let dbResults: Personaje[] = [];
  let source: 'rpc' | 'supabase_table' | 'local_fallback' | 'fuzzy_engine' = 'local_fallback';

  // Always load all characters available in Graderz5 database / cache for smart fuzzy comparison
  const allPersonajes = await getPersonajesList();

  // 1. ATTEMPT 1: Optimized Supabase RPC call (Postgres stored procedure with pg_trgm)
  if (supabase) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('search_personajes', {
        search_query: cleanTerm.toLowerCase(),
        similarity_threshold: threshold,
        max_results: 10
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        dbResults = rpcData.map((item: any) => ({
          id: item.id,
          slug: item.slug,
          nombre: item.nombre,
          creator_uid: item.creator_uid,
          image_url: item.image_url,
          birth_date: item.birth_date,
          extract: item.extract,
          rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : 0,
          votes_count: item.votes_count !== undefined && item.votes_count !== null ? Number(item.votes_count) : 0,
          created_at: item.created_at
        }));
        source = 'rpc';
      }
    } catch {
      // Supabase stored procedure not configured yet; continue seamlessly
    }

    // 2. ATTEMPT 2: Direct Supabase Postgres table query
    if (dbResults.length === 0) {
      try {
        const { data, error } = await supabase
          .from('personajes')
          .select('*')
          .or(`nombre.ilike.%${cleanTerm}%,extract.ilike.%${cleanTerm}%,slug.ilike.%${cleanTerm}%`)
          .limit(10);

        if (!error && Array.isArray(data) && data.length > 0) {
          dbResults = data.map((item: any) => ({
            id: item.id,
            slug: item.slug,
            nombre: item.nombre,
            creator_uid: item.creator_uid,
            image_url: item.image_url,
            birth_date: item.birth_date,
            extract: item.extract,
            rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : 0,
            votes_count: item.votes_count !== undefined && item.votes_count !== null ? Number(item.votes_count) : 0,
            created_at: item.created_at
          }));
          source = 'supabase_table';
        }
      } catch (err) {
        console.warn('Direct query to Supabase failed, falling back to local dataset:', err);
      }
    }
  }

  // 3. EVALUATE EXACT & FUZZY MATCHES ACROSS ALL KNOWN CHARACTERS
  // This powers the "Quizás quisiste decir" intelligence!
  // If the user made a typo (e.g. "lenor" for "Leonor de Borbón" or "terri" for "Terry Vega"),
  // this engine identifies it in < 2ms!
  const scoredMap = new Map<string, { personaje: Personaje; score: number; isFuzzy: boolean }>();

  // Add dbResults first
  for (const p of dbResults) {
    const evalRes = evaluatePersonajeMatch(cleanTerm, p);
    scoredMap.set(p.slug, {
      personaje: p,
      score: Math.max(evalRes.score, 0.90),
      isFuzzy: evalRes.isFuzzy
    });
  }

  // Evaluate against all characters from dataset
  for (const p of allPersonajes) {
    const evalRes = evaluatePersonajeMatch(cleanTerm, p);
    if (evalRes.score >= 0.60) {
      const existing = scoredMap.get(p.slug);
      if (!existing || evalRes.score > existing.score) {
        scoredMap.set(p.slug, {
          personaje: p,
          score: evalRes.score,
          isFuzzy: evalRes.isFuzzy
        });
      }
    }
  }

  // Sort by score descending, then exact before fuzzy, then votes count
  const ranked = Array.from(scoredMap.values()).sort((a, b) => {
    // Exact matches take priority over fuzzy matches
    if (!a.isFuzzy && b.isFuzzy) return -1;
    if (a.isFuzzy && !b.isFuzzy) return 1;
    // Then higher similarity score
    if (Math.abs(b.score - a.score) > 0.05) {
      return b.score - a.score;
    }
    // Then popularity
    return (b.personaje.votes_count || 1) - (a.personaje.votes_count || 1);
  });

  if (dbResults.length === 0 && ranked.length > 0) {
    source = 'fuzzy_engine';
  }

  // 4. Transform into SearchSuggestion with fuzzy match flags
  const suggestions: SearchSuggestion[] = ranked.map(({ personaje: p, isFuzzy, score }) => {
    return {
      id: p.id || `p-${p.slug}`,
      slug: p.slug,
      type: detectType(p.nombre, p.extract || ''),
      title: p.nombre,
      subtitle: p.extract ? p.extract.substring(0, 85) + '...' : 'Figura pública verificada Q5',
      avatarUrl: p.image_url,
      rating: p.rating,
      votesCount: p.votes_count,
      deathDate: p.death_date,
      isFuzzy,
      fuzzySimilarity: Math.round(score * 100),
      originalQuery: cleanTerm
    };
  });

  // Check if ALL suggestions are fuzzy matches (e.g. user typed a typo like "lenor" or "terri")
  const hasFuzzyOnly = suggestions.length > 0 && suggestions.every(s => s.isFuzzy);
  const bestFuzzySuggestion = suggestions.find(s => s.isFuzzy);

  // 5. Group dynamically by category
  const categoryLabels: Record<SearchSuggestion['type'], string> = {
    cantante: 'Música & Cantantes',
    deportista: 'Deportistas & Atletas',
    politico: 'Líderes & Políticos',
    personaje: 'Personajes Verificados Q5'
  };

  const groupsMap = new Map<string, SearchSuggestion[]>();
  for (const item of suggestions) {
    const groupName = categoryLabels[item.type] || 'Otros';
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName)!.push(item);
  }

  const grouped = Array.from(groupsMap.entries()).map(([category, items]) => ({
    category,
    items
  }));

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    suggestions: suggestions.slice(0, 8),
    grouped,
    source,
    executionTimeMs,
    hasFuzzyOnly,
    bestFuzzySuggestion
  };
}

/**
 * Backward compatibility wrapper
 */
export async function searchWithAutocomplete(query: string, threshold = 0.25): Promise<SearchSuggestion[]> {
  const res = await searchWithAutocompleteAdvanced(query, threshold);
  return res.suggestions;
}
