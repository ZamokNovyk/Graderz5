import { PersonajeResena, Personaje } from '../types';
import { supabase } from './supabase';
import { getPersonajeBySlug } from './personajesService';

const RESENAS_STORAGE_KEY = 'graderz5_personajes_resenas';

/**
 * Obtiene todas las reseñas guardadas localmente.
 */
function getLocalResenas(): PersonajeResena[] {
  try {
    const raw = localStorage.getItem(RESENAS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda la lista de reseñas localmente.
 */
function saveLocalResenas(list: PersonajeResena[]): void {
  try {
    localStorage.setItem(RESENAS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error al guardar reseñas locales:', e);
  }
}

/**
 * Obtiene todas las reseñas para un personaje específico.
 * Primero intenta en Supabase y luego cae en localStorage.
 */
export async function getResenasForPersonaje(personajeSlug: string): Promise<PersonajeResena[]> {
  const cleanSlug = personajeSlug.toLowerCase().trim();

  // 1. Intentar desde Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('personajes_resenas')
        .select('*')
        .eq('personaje_slug', cleanSlug)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as PersonajeResena[];
      }
    } catch (e) {
      console.warn('Error al obtener reseñas de Supabase:', e);
    }
  }

  // 2. Fallback local
  const localList = getLocalResenas();
  return localList
    .filter(r => r.personaje_slug.toLowerCase() === cleanSlug)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Obtiene la reseña que el usuario actual dejó para un personaje.
 */
export async function getUserResenaForPersonaje(
  personajeSlug: string,
  userUid: string
): Promise<PersonajeResena | null> {
  const cleanSlug = personajeSlug.toLowerCase().trim();
  const cleanUid = userUid.trim();

  // 1. Intentar desde Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('personajes_resenas')
        .select('*')
        .eq('personaje_slug', cleanSlug)
        .eq('user_uid', cleanUid)
        .maybeSingle();

      if (!error && data) {
        return data as PersonajeResena;
      }
    } catch (e) {
      console.warn('Error al obtener reseña de usuario desde Supabase:', e);
    }
  }

  // 2. Fallback local
  const localList = getLocalResenas();
  const match = localList.find(
    r => r.personaje_slug.toLowerCase() === cleanSlug && r.user_uid === cleanUid
  );
  return match || null;
}

/**
 * Agrega o actualiza una reseña (calificación de estrellas + texto opcional de max 500 chars).
 * Luego actualiza el rating promedio y conteo de votos de forma exacta.
 */
export async function saveResena(params: {
  personajeSlug: string;
  personajeNombre: string;
  userUid: string;
  userName: string;
  userGender?: string;
  userNationality?: string;
  isAnonymous: boolean;
  registeredWith: 'google' | 'anonymous';
  reviewText?: string;
  stars: number;
}): Promise<{ success: boolean; resena?: PersonajeResena; error?: string }> {
  const {
    personajeSlug,
    personajeNombre,
    userUid,
    userName,
    userGender,
    userNationality,
    isAnonymous,
    registeredWith,
    reviewText,
    stars
  } = params;

  const cleanSlug = personajeSlug.toLowerCase().trim();
  const cleanUid = userUid.trim();
  const truncatedReview = reviewText ? reviewText.substring(0, 500).trim() : '';

  const id = `res_${cleanSlug}_${cleanUid}`;
  const now = new Date().toISOString();

  const newResena: PersonajeResena = {
    id,
    personaje_slug: cleanSlug,
    personaje_nombre: personajeNombre,
    user_uid: cleanUid,
    user_name: userName || 'Usuario Invitado',
    user_gender: userGender || 'no_especificado',
    user_nationality: userNationality || 'No especificada',
    is_anonymous: isAnonymous,
    registered_with: registeredWith,
    review_text: truncatedReview || undefined,
    stars,
    created_at: now
  };

  // 1. Guardar localmente
  const localList = getLocalResenas();
  const filtered = localList.filter(r => r.id !== id);
  filtered.unshift(newResena);
  saveLocalResenas(filtered);

  // 2. Guardar en Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('personajes_resenas')
        .upsert(newResena, { onConflict: 'id' });

      if (error) {
        console.error('Error al insertar reseña en Supabase:', error);
      }
    } catch (e) {
      console.warn('Error de red al guardar reseña en Supabase:', e);
    }
  }

  // 3. Recalcular y actualizar rating de forma precisa
  await updatePersonajeRatingStats(cleanSlug);

  return { success: true, resena: newResena };
}

/**
 * Elimina la reseña de un usuario para un personaje y recalcula el rating promedio.
 */
export async function deleteResena(
  personajeSlug: string,
  userUid: string
): Promise<boolean> {
  const cleanSlug = personajeSlug.toLowerCase().trim();
  const cleanUid = userUid.trim();
  const id = `res_${cleanSlug}_${cleanUid}`;

  // 1. Eliminar localmente
  const localList = getLocalResenas();
  const filtered = localList.filter(r => r.id !== id);
  saveLocalResenas(filtered);

  // 2. Eliminar en Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('personajes_resenas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar reseña de Supabase:', error);
      }
    } catch (e) {
      console.warn('Error de red al eliminar reseña de Supabase:', e);
    }
  }

  // 3. Recalcular y actualizar rating
  await updatePersonajeRatingStats(cleanSlug);

  return true;
}

/**
 * Recalcula el promedio de estrellas, número de votos y desglose de estrellas (1-5) a partir de las reseñas reales,
 * y actualiza los contadores persistentes en la tabla de personajes tanto en local como en Supabase.
 */
export async function updatePersonajeRatingStats(personajeSlug: string): Promise<void> {
  const cleanSlug = personajeSlug.toLowerCase().trim();

  // Obtener todas las reseñas actuales de este personaje
  const currentResenas = await getResenasForPersonaje(cleanSlug);

  // Calcular estadísticas reales
  const votesCount = currentResenas.length;
  let averageRating = 0.0;
  let stars_1 = 0;
  let stars_2 = 0;
  let stars_3 = 0;
  let stars_4 = 0;
  let stars_5 = 0;
  let reviews_count = 0;

  if (votesCount > 0) {
    let totalStars = 0;
    currentResenas.forEach(r => {
      totalStars += r.stars;
      if (r.stars === 1) stars_1++;
      else if (r.stars === 2) stars_2++;
      else if (r.stars === 3) stars_3++;
      else if (r.stars === 4) stars_4++;
      else if (r.stars === 5) stars_5++;

      if (r.review_text && r.review_text.trim().length > 0) {
        reviews_count++;
      }
    });
    averageRating = Math.round((totalStars / votesCount) * 10) / 10;
  }

  // Actualizar en caché local
  try {
    const localPersonajesJson = localStorage.getItem('graderz5_personajes');
    if (localPersonajesJson) {
      const pList: Personaje[] = JSON.parse(localPersonajesJson);
      const targetIdx = pList.findIndex(p => p.slug.toLowerCase() === cleanSlug);
      if (targetIdx >= 0) {
        pList[targetIdx] = {
          ...pList[targetIdx],
          rating: averageRating,
          votes_count: votesCount,
          stars_1,
          stars_2,
          stars_3,
          stars_4,
          stars_5,
          reviews_count
        };
        localStorage.setItem('graderz5_personajes', JSON.stringify(pList));
      }
    }
  } catch (e) {
    console.warn('Error al actualizar rating local en personajes:', e);
  }

  // Actualizar en Supabase
  if (supabase) {
    try {
      await supabase
        .from('personajes')
        .update({
          rating: averageRating,
          votes_count: votesCount,
          stars_1,
          stars_2,
          stars_3,
          stars_4,
          stars_5,
          reviews_count
        })
        .eq('slug', cleanSlug);
    } catch (e) {
      console.warn('Error al actualizar rating en Supabase:', e);
    }
  }
}
