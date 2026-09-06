import { supabase } from './supabase';
import { ActitudType, PersonajeActitud } from '../types';
import { getCountryCoordinates, latLngToVector3 } from '../data/countryCoordinates';
import { getPersonajeWorldRecords, syncPersonajeWorldFromActitudes } from './personajesWorldService';

export interface CountryAudienceStats {
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  totalInteractions: number;
  fanCount: number;
  simpCount: number;
  haterCount: number;
  conozcoCount: number;
  reviewsCount: number;
  avgRating?: number;
  percentageOfTotal: number;
  isHomeCountry?: boolean;
}

export interface GlobeLightPoint {
  id: string;
  country: string;
  lat: number;
  lng: number;
  type: 'fan' | 'simp' | 'hater' | 'conozco' | 'home';
  color: string;
  intensity: number;
  size: number;
  userName?: string;
}

const COLOR_MAP: Record<string, string> = {
  fan: '#facc15',     // Gold / Amber
  simp: '#f97316',    // Fiery Orange
  hater: '#c084fc',   // Electric Purple
  conozco: '#38bdf8', // Cyan
  home: '#10b981'     // Emerald Green for Origin
};

export interface AudienceResult {
  stats: CountryAudienceStats[];
  lights: GlobeLightPoint[];
  totalVotes: number;
  dominantCountry: string | null;
}

// In-memory cache to prevent repetitive network fetches and ensure 0ms switching
const memoryAudienceCache = new Map<string, { timestamp: number; result: AudienceResult }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Invalidates the audience cache for a character (e.g. when user votes)
 */
export function invalidateAudienceCache(slug?: string) {
  if (slug) {
    memoryAudienceCache.delete(slug.toLowerCase().trim());
  } else {
    memoryAudienceCache.clear();
  }
}

/**
 * Generates natural pseudo-random dispersion around a country's center
 */
function generateJitter(center: number, maxSpread = 1.8, seed = 1): number {
  const pseudoRand = (Math.sin(seed * 9999) * 10000) % 1;
  return center + (pseudoRand - 0.5) * maxSpread;
}

/**
 * Fetches audience distribution by country for a given personaje
 */
export async function getPersonajeAudience(
  personajeSlug: string,
  personajeNationality?: string,
  forceRefresh = false
): Promise<AudienceResult> {
  const cleanSlug = personajeSlug.toLowerCase().trim();

  // Return from in-memory cache if fresh
  if (!forceRefresh) {
    const cached = memoryAudienceCache.get(cleanSlug);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.result;
    }
  }

  // 1. Obtener los 4 documentos de personajes_world (Fan, SIMP, Hater, Conozco)
  let worldDocs = await getPersonajeWorldRecords(cleanSlug);
  let totalWorldVotes = worldDocs.fan.total + worldDocs.simp.total + worldDocs.hater.total + worldDocs.conozco.total;

  // Si no hay votos registrados en personajes_world, intentar sincronizar desde personajes_actitud
  if (totalWorldVotes === 0 && supabase) {
    const synced = await syncPersonajeWorldFromActitudes(cleanSlug);
    if (synced) {
      worldDocs = synced;
      totalWorldVotes = worldDocs.fan.total + worldDocs.simp.total + worldDocs.hater.total + worldDocs.conozco.total;
    }
  }

  // Group by country
  const countryMap: Record<string, {
    total: number;
    fan: number;
    simp: number;
    hater: number;
    conozco: number;
  }> = {};

  let totalValidVotes = 0;

  // Poblar desde los documentos globales de personajes_world
  const allCountries = new Set<string>([
    ...Object.keys(worldDocs.fan.paises || {}),
    ...Object.keys(worldDocs.simp.paises || {}),
    ...Object.keys(worldDocs.hater.paises || {}),
    ...Object.keys(worldDocs.conozco.paises || {})
  ]);

  for (const rawCountry of allCountries) {
    const coords = getCountryCoordinates(rawCountry);
    const canonicalName = coords ? coords.name : rawCountry;

    if (!countryMap[canonicalName]) {
      countryMap[canonicalName] = {
        total: 0,
        fan: 0,
        simp: 0,
        hater: 0,
        conozco: 0
      };
    }

    const fanCount = worldDocs.fan.paises[rawCountry] || 0;
    const simpCount = worldDocs.simp.paises[rawCountry] || 0;
    const haterCount = worldDocs.hater.paises[rawCountry] || 0;
    const conozcoCount = worldDocs.conozco.paises[rawCountry] || 0;

    countryMap[canonicalName].fan += fanCount;
    countryMap[canonicalName].simp += simpCount;
    countryMap[canonicalName].hater += haterCount;
    countryMap[canonicalName].conozco += conozcoCount;

    const countryTotal = fanCount + simpCount + haterCount + conozcoCount;
    countryMap[canonicalName].total += countryTotal;
    totalValidVotes += countryTotal;
  }

  // 2. Si personajes_world aún no tenía datos (caso inicial o fallback), revisar actitudes locales
  if (totalValidVotes === 0) {
    try {
      const raw = localStorage.getItem('graderz5_personajes_actitud');
      if (raw) {
        const localList: PersonajeActitud[] = JSON.parse(raw);
        const matched = localList.filter(a => a.personaje_slug.toLowerCase() === cleanSlug);
        for (const item of matched) {
          const rawCountry = item.user_nationality;
          if (!rawCountry || rawCountry === 'No especificada' || rawCountry === 'todos') continue;

          const coords = getCountryCoordinates(rawCountry);
          const canonicalName = coords ? coords.name : rawCountry;

          if (!countryMap[canonicalName]) {
            countryMap[canonicalName] = { total: 0, fan: 0, simp: 0, hater: 0, conozco: 0 };
          }
          countryMap[canonicalName].total++;
          totalValidVotes++;

          const act = item.actitud?.toLowerCase();
          if (act === 'fan') countryMap[canonicalName].fan++;
          else if (act === 'simp') countryMap[canonicalName].simp++;
          else if (act === 'hater') countryMap[canonicalName].hater++;
          else if (act === 'conozco') countryMap[canonicalName].conozco++;
        }
      }
    } catch {
      // Ignorar fallback local
    }
  }

  // Build stats array
  const stats: CountryAudienceStats[] = [];
  const lights: GlobeLightPoint[] = [];

  // Always mark home country if available
  if (personajeNationality && personajeNationality !== 'No especificada') {
    const homeParts = personajeNationality.split(/[/,;]/).map(c => c.trim()).filter(Boolean);
    for (const homeCountry of homeParts) {
      const homeCoords = getCountryCoordinates(homeCountry);
      if (homeCoords && !countryMap[homeCoords.name]) {
        stats.push({
          country: homeCoords.name,
          countryCode: homeCoords.code,
          lat: homeCoords.lat,
          lng: homeCoords.lng,
          totalInteractions: 0,
          fanCount: 0,
          simpCount: 0,
          haterCount: 0,
          conozcoCount: 0,
          reviewsCount: 0,
          percentageOfTotal: 0,
          isHomeCountry: true
        });

        // Add an origin beacon
        lights.push({
          id: `origin-${homeCoords.code}`,
          country: homeCoords.name,
          lat: homeCoords.lat,
          lng: homeCoords.lng,
          type: 'home',
          color: COLOR_MAP.home,
          intensity: 1.5,
          size: 0.12,
          userName: `País de origen de ${personajeSlug}`
        });
      }
    }
  }

  let seedIndex = 1;
  for (const [countryName, data] of Object.entries(countryMap)) {
    const coords = getCountryCoordinates(countryName);
    const lat = coords ? coords.lat : 0;
    const lng = coords ? coords.lng : 0;
    const jitterMax = coords?.jitterRadius || 1.8;
    const code = coords ? coords.code : '';

    stats.push({
      country: countryName,
      countryCode: code,
      lat,
      lng,
      totalInteractions: data.total,
      fanCount: data.fan,
      simpCount: data.simp,
      haterCount: data.hater,
      conozcoCount: data.conozco,
      reviewsCount: 0,
      percentageOfTotal: totalValidVotes > 0 ? Math.round((data.total / totalValidVotes) * 100) : 0,
      isHomeCountry: Boolean(personajeNationality && personajeNationality.toLowerCase().includes(countryName.toLowerCase()))
    });

    // Generate Guardian-style points with natural dispersion across the country based on counts
    const actitudTypes: ('fan' | 'simp' | 'hater' | 'conozco')[] = ['fan', 'simp', 'hater', 'conozco'];
    for (const actType of actitudTypes) {
      const count = data[actType];
      if (count <= 0) continue;
      // Emit points proportionally (up to 12 points per category per country for crisp rendering)
      const pointsToEmit = Math.min(count, 12);
      for (let i = 0; i < pointsToEmit; i++) {
        const pointLat = generateJitter(lat, jitterMax, seedIndex++);
        const pointLng = generateJitter(lng, jitterMax, seedIndex * 1.5);
        lights.push({
          id: `light-${countryName}-${actType}-${i}`,
          country: countryName,
          lat: pointLat,
          lng: pointLng,
          type: actType,
          color: COLOR_MAP[actType] || COLOR_MAP.fan,
          intensity: 1.2,
          size: 0.08,
          userName: `${count} ${actType === 'fan' ? 'Fans' : actType === 'simp' ? 'SIMPs' : actType === 'hater' ? 'Haters' : 'Audiencia'} en ${countryName}`
        });
      }
    }
  }

  // Sort stats by total votes descending
  stats.sort((a, b) => b.totalInteractions - a.totalInteractions);

  const dominantCountry = stats.length > 0 && stats[0].totalInteractions > 0 ? stats[0].country : null;

  const result: AudienceResult = {
    stats,
    lights,
    totalVotes: totalValidVotes,
    dominantCountry
  };

  // Cache in local memory
  memoryAudienceCache.set(cleanSlug, {
    timestamp: Date.now(),
    result
  });

  return result;
}
