import { ActitudType, PersonajeActitud, Personaje } from '../types';
import { supabase } from './supabase';
import { getPersonajeBySlug } from './personajesService';
import { updatePersonajeWorldVotes } from './personajesWorldService';

const ACTITUDES_STORAGE_KEY = 'graderz5_personajes_actitud';
const GUEST_UID_KEY = 'graderz5_guest_uid';
const USER_PREFERENCES_KEY = 'graderz5_user_preferences';

/**
 * Obtiene o genera un identificador persistente para usuarios invitados/anónimos.
 */
export function getOrCreateGuestUid(): string {
  try {
    let guestId = localStorage.getItem(GUEST_UID_KEY);
    if (!guestId) {
      guestId = `anon-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(GUEST_UID_KEY, guestId);
    }
    return guestId;
  } catch {
    return 'anon-guest-fallback';
  }
}

/**
 * Obtiene las preferencias locales del usuario (sexo y nacionalidad).
 */
export function getUserPreferences(): { gender: string; nationality: string } {
  try {
    const raw = localStorage.getItem(USER_PREFERENCES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error al leer preferencias de usuario:', e);
  }
  return { gender: 'no_especificado', nationality: 'No especificada' };
}

/**
 * Guarda las preferencias locales del usuario (sexo y nacionalidad).
 */
export function saveUserPreferences(preferences: { gender: string; nationality: string }): void {
  try {
    localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (e) {
    console.warn('Error al guardar preferencias de usuario:', e);
  }
}

/**
 * Obtiene todas las actitudes guardadas localmente.
 */
function getLocalActitudes(): PersonajeActitud[] {
  try {
    const raw = localStorage.getItem(ACTITUDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda la lista de actitudes localmente.
 */
function saveLocalActitudes(list: PersonajeActitud[]): void {
  try {
    localStorage.setItem(ACTITUDES_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error al guardar actitudes locales:', e);
  }
}

/**
 * Obtiene los conteos reales de cada actitud directamente de la base de datos Supabase
 * (tabla `personajes_actitud`), sin inventar ningún dato ni usar estimaciones.
 */
export async function getRealActitudCounts(personajeSlug: string): Promise<{
  conozco: number;
  fan: number;
  simp: number;
  hater: number;
  total: number;
}> {
  const cleanSlug = personajeSlug.toLowerCase().trim();

  // 1. Consultar directamente las filas reales en Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('personajes_actitud')
        .select('actitud')
        .eq('personaje_slug', cleanSlug);

      if (!error && Array.isArray(data)) {
        let conozco = 0;
        let fan = 0;
        let simp = 0;
        let hater = 0;

        for (const row of data) {
          if (row.actitud === 'conozco') conozco++;
          else if (row.actitud === 'fan') fan++;
          else if (row.actitud === 'simp') simp++;
          else if (row.actitud === 'hater') hater++;
        }

        return {
          conozco,
          fan,
          simp,
          hater,
          total: data.length
        };
      }
    } catch (e) {
      console.warn('Error al leer actitudes reales de Supabase:', e);
    }
  }

  // 2. Fallback a caché local real (sin inventar datos)
  const localList = getLocalActitudes();
  const matched = localList.filter(a => a.personaje_slug.toLowerCase() === cleanSlug);
  return {
    conozco: matched.filter(a => a.actitud === 'conozco').length,
    fan: matched.filter(a => a.actitud === 'fan').length,
    simp: matched.filter(a => a.actitud === 'simp').length,
    hater: matched.filter(a => a.actitud === 'hater').length,
    total: matched.length
  };
}

/**
 * Obtiene la actitud actual que un usuario tiene sobre un personaje.
 */
export async function getUserActitudForPersonaje(
  personajeSlug: string,
  userUid: string
): Promise<ActitudType | null> {
  const cleanSlug = personajeSlug.toLowerCase().trim();
  const cleanUid = userUid.trim();

  // 1. Intentar en Supabase tabla 'personajes_actitud'
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('personajes_actitud')
        .select('actitud')
        .eq('personaje_slug', cleanSlug)
        .or(`user_uid.eq.${cleanUid},uid.eq.${cleanUid}`)
        .maybeSingle();

      if (!error && data?.actitud) {
        return data.actitud as ActitudType;
      }
    } catch (e) {
      console.warn('Error al consultar personajes_actitud en Supabase:', e);
    }
  }

  // 2. Fallback a caché local
  const localList = getLocalActitudes();
  const match = localList.find(
    a => a.personaje_slug.toLowerCase() === cleanSlug && a.user_uid === cleanUid
  );
  return match ? match.actitud : null;
}

/**
 * Alterna (Toggle/Switch) la actitud de un usuario hacia un personaje.
 * 
 * Reglas de negocio:
 * 1. Solo se puede elegir UNA opción a la vez entre: 'conozco' | 'fan' | 'simp' | 'hater'.
 * 2. Si se pulsa una opción nueva:
 *    - Se guarda/actualiza el registro en la tabla `personajes_actitud`.
 * 3. Si se vuelve a pulsar la opción que ya estaba seleccionada (deselección):
 *    - Se ELIMINA de la base de datos el registro para evitar guardar filas basura.
 * 4. Los contadores reflejan el total exacto de filas en `personajes_actitud`.
 */
export async function togglePersonajeActitud(params: {
  personajeSlug: string;
  targetActitud: ActitudType;
  userInfo: {
    uid: string;
    name: string;
    isAnonymous: boolean;
    gender?: string;
    nationality?: string;
  };
  personajeInfo?: {
    gender?: string;
    nationality?: string;
  };
}): Promise<{
  activeActitud: ActitudType | null;
  counts: {
    conozco: number;
    fan: number;
    simp: number;
    hater: number;
  };
}> {
  const { personajeSlug, targetActitud, userInfo, personajeInfo } = params;
  const cleanSlug = personajeSlug.toLowerCase().trim();
  const userUid = userInfo.uid.trim();

  // 1. Obtener actitud previa del usuario
  const currentActitud = await getUserActitudForPersonaje(cleanSlug, userUid);

  let newActiveActitud: ActitudType | null = null;
  const localList = getLocalActitudes();
  const recordId = `act_${cleanSlug}_${userUid}`;

  const now = new Date();
  const fechaStr = now.toISOString().split('T')[0];
  const horaStr = now.toTimeString().split(' ')[0];

  if (currentActitud === targetActitud) {
    // CASO A: Deselección / Quitar voto (-1 y eliminar registro)
    newActiveActitud = null;

    // Eliminar localmente
    const filtered = localList.filter(
      a => !(a.personaje_slug.toLowerCase() === cleanSlug && a.user_uid === userUid)
    );
    saveLocalActitudes(filtered);

    // Eliminar en Supabase
    if (supabase) {
      try {
        await supabase
          .from('personajes_actitud')
          .delete()
          .eq('personaje_slug', cleanSlug)
          .or(`user_uid.eq.${userUid},uid.eq.${userUid}`);
      } catch (err) {
        console.warn('Error al eliminar actitud en Supabase:', err);
      }
    }
  } else {
    // CASO B: Nueva selección o cambio de opción
    newActiveActitud = targetActitud;

    const newRecord: PersonajeActitud = {
      id: recordId,
      personaje_slug: cleanSlug,
      user_uid: userUid,
      user_name: userInfo.name || 'Usuario',
      actitud: targetActitud,
      fecha: fechaStr,
      hora: horaStr,
      is_anonymous: userInfo.isAnonymous,
      user_gender: userInfo.gender || 'no_especificado',
      user_nationality: userInfo.nationality || 'No especificada',
      personaje_gender: personajeInfo?.gender || 'No especificado',
      personaje_nationality: personajeInfo?.nationality || 'No especificada',
      created_at: now.toISOString()
    };

    // Guardar localmente
    const filtered = localList.filter(
      a => !(a.personaje_slug.toLowerCase() === cleanSlug && a.user_uid === userUid)
    );
    filtered.unshift(newRecord);
    saveLocalActitudes(filtered);

    // Guardar / Upsert en Supabase tabla 'personajes_actitud'
    if (supabase) {
      try {
        await supabase
          .from('personajes_actitud')
          .upsert(
            {
              id: recordId,
              personaje_slug: cleanSlug,
              user_uid: userUid,
              uid: userUid, // Soportar también columna 'uid'
              user_name: newRecord.user_name,
              actitud: targetActitud,
              fecha: fechaStr,
              hora: horaStr,
              is_anonymous: newRecord.is_anonymous,
              user_gender: newRecord.user_gender,
              user_nationality: newRecord.user_nationality,
              personaje_gender: newRecord.personaje_gender,
              personaje_nationality: newRecord.personaje_nationality,
              created_at: newRecord.created_at
            },
            { onConflict: 'id' }
          );
      } catch (err) {
        console.warn('Error al guardar actitud en Supabase:', err);
      }
    }
  }

  // Sincronizar en la tabla 'personajes_world' (documentos de Fan, SIMP, Hater, Conozco agrupados por país y género)
  try {
    await updatePersonajeWorldVotes({
      personajeSlug: cleanSlug,
      userCountry: userInfo.nationality,
      userGender: userInfo.gender,
      oldActitud: currentActitud,
      newActitud: newActiveActitud
    });
  } catch (err) {
    console.warn('Error al actualizar personajes_world:', err);
  }

  // 2. Calcular conteos reales directamente de la base de datos (sin inventar datos)
  const realCounts = await getRealActitudCounts(cleanSlug);

  // 3. Sincronizar conteos agregados en la tabla 'personajes' si está disponible
  try {
    const localPersonajesJson = localStorage.getItem('graderz5_personajes');
    if (localPersonajesJson) {
      const pList: Personaje[] = JSON.parse(localPersonajesJson);
      const targetIdx = pList.findIndex(p => p.slug.toLowerCase() === cleanSlug);
      if (targetIdx >= 0) {
        pList[targetIdx] = {
          ...pList[targetIdx],
          count_conozco: realCounts.conozco,
          count_fan: realCounts.fan,
          count_simp: realCounts.simp,
          count_hater: realCounts.hater
        };
        localStorage.setItem('graderz5_personajes', JSON.stringify(pList));
      }
    }
  } catch (e) {
    console.warn('Error al actualizar contadores en localStorage:', e);
  }

  if (supabase) {
    try {
      await supabase
        .from('personajes')
        .update({
          count_conozco: realCounts.conozco,
          count_fan: realCounts.fan,
          count_simp: realCounts.simp,
          count_hater: realCounts.hater
        })
        .eq('slug', cleanSlug);
    } catch (e) {
      console.warn('Error al actualizar contadores de personajes en Supabase:', e);
    }
  }

  return {
    activeActitud: newActiveActitud,
    counts: {
      conozco: realCounts.conozco,
      fan: realCounts.fan,
      simp: realCounts.simp,
      hater: realCounts.hater
    }
  };
}
