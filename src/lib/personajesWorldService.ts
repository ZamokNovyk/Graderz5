import { supabase } from './supabase';
import { ActitudType, PersonajeWorldRecord } from '../types';
import { getCountryCoordinates } from '../data/countryCoordinates';
import { invalidateAudienceCache } from './audienceService';

const WORLD_STORAGE_KEY = 'graderz5_personajes_world';

/**
 * Retorna la clave de registro para la tabla personajes_world
 * Ej: 'lalisa.manobal_fan'
 */
export function getPersonajeWorldRecordId(slug: string, actitud: string): string {
  return `${slug.toLowerCase().trim()}_${actitud.toLowerCase().trim()}`;
}

/**
 * Lee los registros locales de personajes_world desde localStorage
 */
function getLocalWorldRecords(): Record<string, PersonajeWorldRecord> {
  try {
    const raw = localStorage.getItem(WORLD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Guarda registros en localStorage
 */
function saveLocalWorldRecords(records: Record<string, PersonajeWorldRecord>) {
  try {
    localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignorar errores de almacenamiento local
  }
}

/**
 * Obtiene los 4 documentos ('fan', 'simp', 'hater', 'conozco') para un personaje.
 * Intenta primero en Supabase (tabla 'personajes_world'); si no existen o hay error,
 * recurre a localStorage.
 */
export async function getPersonajeWorldRecords(
  personajeSlug: string
): Promise<Record<ActitudType, PersonajeWorldRecord>> {
  const cleanSlug = personajeSlug.toLowerCase().trim();
  const actitudes: ActitudType[] = ['fan', 'simp', 'hater', 'conozco'];
  const localMap = getLocalWorldRecords();

  const result: Record<ActitudType, PersonajeWorldRecord> = {
    fan: localMap[getPersonajeWorldRecordId(cleanSlug, 'fan')] || {
      id: getPersonajeWorldRecordId(cleanSlug, 'fan'),
      personaje_slug: cleanSlug,
      actitud: 'fan',
      paises: {},
      total: 0
    },
    simp: localMap[getPersonajeWorldRecordId(cleanSlug, 'simp')] || {
      id: getPersonajeWorldRecordId(cleanSlug, 'simp'),
      personaje_slug: cleanSlug,
      actitud: 'simp',
      paises: {},
      total: 0
    },
    hater: localMap[getPersonajeWorldRecordId(cleanSlug, 'hater')] || {
      id: getPersonajeWorldRecordId(cleanSlug, 'hater'),
      personaje_slug: cleanSlug,
      actitud: 'hater',
      paises: {},
      total: 0
    },
    conozco: localMap[getPersonajeWorldRecordId(cleanSlug, 'conozco')] || {
      id: getPersonajeWorldRecordId(cleanSlug, 'conozco'),
      personaje_slug: cleanSlug,
      actitud: 'conozco',
      paises: {},
      total: 0
    }
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('personajes_world')
        .select('*')
        .eq('personaje_slug', cleanSlug);

      if (!error && Array.isArray(data) && data.length > 0) {
        data.forEach((row: any) => {
          const act = row.actitud as ActitudType;
          if (actitudes.includes(act)) {
            result[act] = {
              id: row.id || getPersonajeWorldRecordId(cleanSlug, act),
              personaje_slug: cleanSlug,
              actitud: act,
              paises: typeof row.paises === 'object' && row.paises !== null ? row.paises : {},
              total: typeof row.total === 'number' ? row.total : 0,
              updated_at: row.updated_at
            };
            // Actualizar local
            localMap[result[act].id] = result[act];
          }
        });
        saveLocalWorldRecords(localMap);
        return result;
      }
    } catch (err) {
      console.warn('Advertencia al consultar tabla personajes_world en Supabase:', err);
    }
  }

  return result;
}

/**
 * Normaliza el nombre del país para consistencia en el JSONB
 */
function normalizeCountryName(countryRaw: string): string {
  if (!countryRaw || countryRaw === 'No especificada' || countryRaw === 'todos') {
    return '';
  }
  const coords = getCountryCoordinates(countryRaw.trim());
  return coords ? coords.name : countryRaw.trim();
}

/**
 * Actualiza los contadores en personajes_world cuando un usuario vota,
 * cambia de actitud (ej. Fan -> Hater), o remueve su voto.
 * 
 * Regla:
 * - Si oldActitud existía: resta 1 al país correspondiente en el documento de oldActitud.
 * - Si newActitud existe: suma 1 al país correspondiente en el documento de newActitud.
 */
export async function updatePersonajeWorldVotes({
  personajeSlug,
  userCountry,
  oldActitud,
  newActitud
}: {
  personajeSlug: string;
  userCountry?: string;
  oldActitud?: ActitudType | null;
  newActitud?: ActitudType | null;
}): Promise<void> {
  const cleanSlug = personajeSlug.toLowerCase().trim();
  const country = normalizeCountryName(userCountry || '');

  // Si no hay país especificado, no hay país qué sumar/restar en el mapa
  if (!country) return;

  // Si no hay cambio de actitud, nada qué hacer
  if (oldActitud === newActitud) return;

  const currentRecords = await getPersonajeWorldRecords(cleanSlug);
  const localMap = getLocalWorldRecords();
  const recordsToUpsert: PersonajeWorldRecord[] = [];

  // 1. CASO RESTA: El usuario tenía una actitud anterior y la quitó o cambió (ej: de fan a hater)
  if (oldActitud && currentRecords[oldActitud]) {
    const docOld = { ...currentRecords[oldActitud], paises: { ...currentRecords[oldActitud].paises } };
    const prevCount = docOld.paises[country] || 0;
    if (prevCount > 1) {
      docOld.paises[country] = prevCount - 1;
    } else {
      delete docOld.paises[country];
    }
    docOld.total = Math.max(0, Object.values(docOld.paises).reduce((a, b) => a + b, 0));
    docOld.updated_at = new Date().toISOString();

    currentRecords[oldActitud] = docOld;
    localMap[docOld.id] = docOld;
    recordsToUpsert.push(docOld);
  }

  // 2. CASO SUMA: El usuario seleccionó una nueva actitud
  if (newActitud && currentRecords[newActitud]) {
    const docNew = { ...currentRecords[newActitud], paises: { ...currentRecords[newActitud].paises } };
    const prevCount = docNew.paises[country] || 0;
    docNew.paises[country] = prevCount + 1;
    docNew.total = Object.values(docNew.paises).reduce((a, b) => a + b, 0);
    docNew.updated_at = new Date().toISOString();

    currentRecords[newActitud] = docNew;
    localMap[docNew.id] = docNew;
    recordsToUpsert.push(docNew);
  }

  // Guardar en localStorage
  saveLocalWorldRecords(localMap);

  // Invalidate in-memory audience cache for immediate 0ms refresh on UI
  invalidateAudienceCache(cleanSlug);

  // Guardar en Supabase tabla 'personajes_world'
  if (supabase && recordsToUpsert.length > 0) {
    try {
      for (const rec of recordsToUpsert) {
        await supabase
          .from('personajes_world')
          .upsert({
            id: rec.id,
            personaje_slug: rec.personaje_slug,
            actitud: rec.actitud,
            paises: rec.paises,
            total: rec.total,
            updated_at: rec.updated_at
          }, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('Error al guardar en tabla personajes_world de Supabase:', err);
    }
  }
}

/**
 * Sincroniza y pobla automáticamente los 4 documentos de personajes_world
 * a partir de los registros individuales de 'personajes_actitud'.
 */
export async function syncPersonajeWorldFromActitudes(personajeSlug: string): Promise<Record<ActitudType, PersonajeWorldRecord> | null> {
  const cleanSlug = personajeSlug.toLowerCase().trim();

  if (!supabase) return null;

  try {
    const { data: rows, error } = await supabase
      .from('personajes_actitud')
      .select('actitud, user_nationality')
      .eq('personaje_slug', cleanSlug);

    if (error || !Array.isArray(rows)) return null;

    const actitudes: ActitudType[] = ['fan', 'simp', 'hater', 'conozco'];
    const docs: Record<ActitudType, PersonajeWorldRecord> = {
      fan: { id: getPersonajeWorldRecordId(cleanSlug, 'fan'), personaje_slug: cleanSlug, actitud: 'fan', paises: {}, total: 0 },
      simp: { id: getPersonajeWorldRecordId(cleanSlug, 'simp'), personaje_slug: cleanSlug, actitud: 'simp', paises: {}, total: 0 },
      hater: { id: getPersonajeWorldRecordId(cleanSlug, 'hater'), personaje_slug: cleanSlug, actitud: 'hater', paises: {}, total: 0 },
      conozco: { id: getPersonajeWorldRecordId(cleanSlug, 'conozco'), personaje_slug: cleanSlug, actitud: 'conozco', paises: {}, total: 0 }
    };

    for (const r of rows) {
      const act = r.actitud?.toLowerCase() as ActitudType;
      if (!actitudes.includes(act)) continue;

      const country = normalizeCountryName(r.user_nationality || '');
      if (!country) continue;

      docs[act].paises[country] = (docs[act].paises[country] || 0) + 1;
      docs[act].total++;
    }

    // Upsert the 4 documents to Supabase
    const now = new Date().toISOString();
    for (const act of actitudes) {
      docs[act].updated_at = now;
      await supabase
        .from('personajes_world')
        .upsert({
          id: docs[act].id,
          personaje_slug: docs[act].personaje_slug,
          actitud: docs[act].actitud,
          paises: docs[act].paises,
          total: docs[act].total,
          updated_at: now
        }, { onConflict: 'id' });
    }

    // Update local cache
    const localMap = getLocalWorldRecords();
    actitudes.forEach(act => {
      localMap[docs[act].id] = docs[act];
    });
    saveLocalWorldRecords(localMap);
    invalidateAudienceCache(cleanSlug);

    return docs;
  } catch (err) {
    console.warn('Error sincronizando personajes_world desde personajes_actitud:', err);
    return null;
  }
}
