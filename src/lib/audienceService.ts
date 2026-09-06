import { supabase } from './supabase';
import { ActitudType, PersonajeActitud, CountryDemographics } from '../types';
import { getCountryCoordinates, latLngToVector3 } from '../data/countryCoordinates';
import { getPersonajeWorldRecords, syncPersonajeWorldFromActitudes, parseCountryStats, normalizeGender } from './personajesWorldService';

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
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  reviewsCount: number;
  avgRating?: number;
  percentageOfTotal: number;
  isHomeCountry?: boolean;
  byActitud?: {
    fan: CountryDemographics;
    simp: CountryDemographics;
    hater: CountryDemographics;
    conozco: CountryDemographics;
  };
}

export interface GlobeLightPoint {
  id: string;
  country: string;
  lat: number;
  lng: number;
  type: 'fan' | 'simp' | 'hater' | 'conozco' | 'home';
  gender?: 'm' | 'f' | 'o';
  color: string;
  intensity: number;
  size: number;
  radius?: number;
  altitude?: number;
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
    male: number;
    female: number;
    other: number;
    byActitud: {
      fan: { total: number; m: number; f: number; o: number };
      simp: { total: number; m: number; f: number; o: number };
      hater: { total: number; m: number; f: number; o: number };
      conozco: { total: number; m: number; f: number; o: number };
    };
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
        conozco: 0,
        male: 0,
        female: 0,
        other: 0,
        byActitud: {
          fan: { total: 0, m: 0, f: 0, o: 0 },
          simp: { total: 0, m: 0, f: 0, o: 0 },
          hater: { total: 0, m: 0, f: 0, o: 0 },
          conozco: { total: 0, m: 0, f: 0, o: 0 }
        }
      };
    }

    const fanStats = parseCountryStats(worldDocs.fan.paises[rawCountry]);
    const simpStats = parseCountryStats(worldDocs.simp.paises[rawCountry]);
    const haterStats = parseCountryStats(worldDocs.hater.paises[rawCountry]);
    const conozcoStats = parseCountryStats(worldDocs.conozco.paises[rawCountry]);

    countryMap[canonicalName].byActitud.fan = fanStats;
    countryMap[canonicalName].byActitud.simp = simpStats;
    countryMap[canonicalName].byActitud.hater = haterStats;
    countryMap[canonicalName].byActitud.conozco = conozcoStats;

    countryMap[canonicalName].fan += fanStats.total;
    countryMap[canonicalName].simp += simpStats.total;
    countryMap[canonicalName].hater += haterStats.total;
    countryMap[canonicalName].conozco += conozcoStats.total;

    const mTotal = fanStats.m + simpStats.m + haterStats.m + conozcoStats.m;
    const fTotal = fanStats.f + simpStats.f + haterStats.f + conozcoStats.f;
    const oTotal = fanStats.o + simpStats.o + haterStats.o + conozcoStats.o;

    countryMap[canonicalName].male += mTotal;
    countryMap[canonicalName].female += fTotal;
    countryMap[canonicalName].other += oTotal;

    const countryTotal = fanStats.total + simpStats.total + haterStats.total + conozcoStats.total;
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
            countryMap[canonicalName] = {
              total: 0,
              fan: 0,
              simp: 0,
              hater: 0,
              conozco: 0,
              male: 0,
              female: 0,
              other: 0,
              byActitud: {
                fan: { total: 0, m: 0, f: 0, o: 0 },
                simp: { total: 0, m: 0, f: 0, o: 0 },
                hater: { total: 0, m: 0, f: 0, o: 0 },
                conozco: { total: 0, m: 0, f: 0, o: 0 }
              }
            };
          }
          countryMap[canonicalName].total++;
          totalValidVotes++;

          const gender = normalizeGender(item.user_gender);
          if (gender === 'm') countryMap[canonicalName].male++;
          else if (gender === 'f') countryMap[canonicalName].female++;
          else countryMap[canonicalName].other++;

          const act = item.actitud?.toLowerCase() as 'fan' | 'simp' | 'hater' | 'conozco';
          if (act && countryMap[canonicalName].byActitud[act]) {
            countryMap[canonicalName][act]++;
            countryMap[canonicalName].byActitud[act].total++;
            countryMap[canonicalName].byActitud[act][gender]++;
          }
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
          maleCount: 0,
          femaleCount: 0,
          otherCount: 0,
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
    const canonicalCountryName = coords ? coords.name : countryName;
    const lat = coords ? coords.lat : 0;
    const lng = coords ? coords.lng : 0;
    const jitterMax = coords?.jitterRadius || 2.5;
    const regions = coords?.regions || [];
    const code = coords ? coords.code : '';

    stats.push({
      country: canonicalCountryName,
      countryCode: code,
      lat,
      lng,
      totalInteractions: data.total,
      fanCount: data.fan,
      simpCount: data.simp,
      haterCount: data.hater,
      conozcoCount: data.conozco,
      maleCount: data.male,
      femaleCount: data.female,
      otherCount: data.other,
      reviewsCount: 0,
      percentageOfTotal: totalValidVotes > 0 ? Math.round((data.total / totalValidVotes) * 100) : 0,
      isHomeCountry: Boolean(personajeNationality && personajeNationality.toLowerCase().includes(canonicalCountryName.toLowerCase())),
      byActitud: {
        fan: { ...data.byActitud.fan },
        simp: { ...data.byActitud.simp },
        hater: { ...data.byActitud.hater },
        conozco: { ...data.byActitud.conozco }
      }
    });

    // Generate Guardian-style points inspired by Rise of the Guardians (El Origen de los Guardianes)
    // Distributed across the country's actual geography (departments/regions), flat on map surface
    const actitudTypes: ('fan' | 'simp' | 'hater' | 'conozco')[] = ['fan', 'simp', 'hater', 'conozco'];
    for (const actType of actitudTypes) {
      const actStats = data.byActitud[actType];
      const count = actStats.total;
      if (count <= 0) continue;

      // "mientras más votos son, más pequeños los puntos"
      // Individual radius decreases smoothly from 0.18 (for 1 vote) down to 0.04 (for dense clusters)
      const pointRadius = Math.max(0.04, 0.20 / Math.pow(count, 0.35));

      // Emitted sparks count scales smoothly with votes to create a rich starry constellation
      let pointsToEmit = 2;
      if (count === 1) pointsToEmit = 2;
      else if (count <= 5) pointsToEmit = count * 2;
      else if (count <= 20) pointsToEmit = Math.round(count * 1.6);
      else pointsToEmit = Math.min(35 + Math.round(count * 0.5), 85);
      
      // Determine genders of the emitted points based on proportions
      for (let i = 0; i < pointsToEmit; i++) {
        let pointGender: 'm' | 'f' | 'o' = 'o';
        if (actStats.m > 0 && i < Math.round((actStats.m / count) * pointsToEmit)) {
          pointGender = 'm';
        } else if (actStats.f > 0) {
          pointGender = 'f';
        }

        let pointLat = lat;
        let pointLng = lng;
        let regionLabel = canonicalCountryName;

        if (regions.length > 0) {
          // Distribute naturally across all geographic regions and departments
          const region = regions[(i + seedIndex) % regions.length];
          regionLabel = region.name;
          const localJitter = 0.45;
          const offsetAngle = (seedIndex * 137.5) * (Math.PI / 180);
          const offsetDist = (((seedIndex % 7) + 1) / 8) * localJitter;
          pointLat = region.lat + Math.sin(offsetAngle) * offsetDist;
          pointLng = region.lng + Math.cos(offsetAngle) * offsetDist;
        } else {
          // Natural dispersion around country bounds
          const distanceFactor = Math.pow((i + 1) / pointsToEmit, 0.65) * 0.95;
          const angle = (seedIndex * 137.5) * (Math.PI / 180);
          const currentJitter = jitterMax * distanceFactor;
          pointLat = lat + Math.sin(angle) * currentJitter;
          pointLng = lng + Math.cos(angle) * currentJitter;
        }
        seedIndex++;

        // Points lie directly ON the map surface (altitude ~0.005) - NO vertical spikes!
        const pointAltitude = 0.005;

        lights.push({
          id: `light-${canonicalCountryName}-${actType}-${i}`,
          country: canonicalCountryName,
          lat: pointLat,
          lng: pointLng,
          type: actType,
          gender: pointGender,
          color: COLOR_MAP[actType] || COLOR_MAP.fan,
          intensity: 1.4,
          size: pointRadius,
          radius: pointRadius,
          altitude: pointAltitude,
          userName: `${count} ${actType === 'fan' ? 'Fans' : actType === 'simp' ? 'SIMPs' : actType === 'hater' ? 'Haters' : 'Audiencia'} en ${canonicalCountryName} (${regionLabel})`
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
