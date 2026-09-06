import { PersonajeResena, Personaje, ResenaLikeDislike, StarpostReactionType, StarpostReply } from '../types';
import { supabase } from './supabase';
import { getPersonajeBySlug } from './personajesService';

const RESENAS_STORAGE_KEY = 'graderz5_personajes_resenas';
const REACTIONS_STORAGE_KEY = 'graderz5_resenas_like_dislike';
const REPLIES_STORAGE_KEY = 'graderz5_starposts_respuestas';

/**
 * Obtiene todas las respuestas de Starposts guardadas localmente.
 */
function getLocalReplies(): StarpostReply[] {
  try {
    const raw = localStorage.getItem(REPLIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda las respuestas de Starposts localmente.
 */
function saveLocalReplies(list: StarpostReply[]): void {
  try {
    localStorage.setItem(REPLIES_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error al guardar respuestas locales:', e);
  }
}

/**
 * Obtiene todas las reacciones de like/dislike guardadas localmente.
 */
function getLocalReactions(): ResenaLikeDislike[] {
  try {
    const raw = localStorage.getItem(REACTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda la lista de reacciones localmente.
 */
function saveLocalReactions(list: ResenaLikeDislike[]): void {
  try {
    localStorage.setItem(REACTIONS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error al guardar reacciones locales:', e);
  }
}

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

  // 1. Guardar localmente (preservando contadores de likes/dislikes si ya existían)
  const localList = getLocalResenas();
  const existing = localList.find(r => r.id === id);
  const likes_count = existing?.likes_count ?? 0;
  const dislikes_count = existing?.dislikes_count ?? 0;
  newResena.likes_count = likes_count;
  newResena.dislikes_count = dislikes_count;

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

/**
 * Obtiene todas las reseñas/Starsposts realizadas por un usuario determinado.
 */
/**
 * Obtiene todas las reacciones de un usuario para una lista de Starposts.
 * Devuelve un mapa con resena_id -> 'like' | 'dislike'.
 */
export async function getUserReactionsForStarposts(
  userUid: string,
  starpostIds: string[]
): Promise<Record<string, StarpostReactionType>> {
  const cleanUid = userUid.trim();
  if (!cleanUid || starpostIds.length === 0) return {};

  const map: Record<string, StarpostReactionType> = {};

  // 1. Intentar desde Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('resenas_like_dislike')
        .select('resena_id, reaction')
        .eq('user_uid', cleanUid)
        .in('resena_id', starpostIds);

      if (!error && Array.isArray(data)) {
        data.forEach(item => {
          if (item.resena_id && (item.reaction === 'like' || item.reaction === 'dislike')) {
            map[item.resena_id] = item.reaction;
          }
        });
        return map;
      }
    } catch (e) {
      console.warn('Error al consultar reacciones del usuario en Supabase:', e);
    }
  }

  // 2. Fallback local
  const localReactions = getLocalReactions();
  localReactions
    .filter(r => r.user_uid === cleanUid && starpostIds.includes(r.resena_id))
    .forEach(r => {
      map[r.resena_id] = r.reaction;
    });

  return map;
}

/**
 * Lógica de reacción (+1 / -1):
 * - Si el usuario no tenía reacción previa a este Starpost y da 'like':
 *     -> crea registro 'like' en resenas_like_dislike
 *     -> Starpost: likes_count + 1
 * - Si el usuario ya tenía 'like' y pulsa 'like' nuevamente (desmarcar):
 *     -> elimina registro en resenas_like_dislike
 *     -> Starpost: likes_count - 1
 * - Si el usuario tenía 'dislike' y pulsa 'like' (cambiar voto):
 *     -> actualiza registro a 'like' en resenas_like_dislike
 *     -> Starpost: dislikes_count - 1, likes_count + 1
 * - Análogo para 'dislike'.
 */
export async function toggleStarpostReaction(params: {
  starpostId: string;
  userUid: string;
  reaction: StarpostReactionType; // 'like' | 'dislike'
}): Promise<{
  activeReaction: StarpostReactionType | null;
  likesCount: number;
  dislikesCount: number;
}> {
  const { starpostId, userUid, reaction } = params;
  const cleanId = starpostId.trim();
  const cleanUid = userUid.trim();

  // 1. Obtener la reacción actual de este usuario en local o supabase
  const allLocalReactions = getLocalReactions();
  const existingReactionIndex = allLocalReactions.findIndex(
    r => r.resena_id === cleanId && r.user_uid === cleanUid
  );
  const currentReaction: StarpostReactionType | null = 
    existingReactionIndex >= 0 ? allLocalReactions[existingReactionIndex].reaction : null;

  let newActiveReaction: StarpostReactionType | null = null;
  let likeDelta = 0;
  let dislikeDelta = 0;

  if (currentReaction === reaction) {
    // Quita la reacción (toggle off)
    newActiveReaction = null;
    if (reaction === 'like') {
      likeDelta = -1;
    } else {
      dislikeDelta = -1;
    }
  } else if (currentReaction === null) {
    // Primera vez que reacciona
    newActiveReaction = reaction;
    if (reaction === 'like') {
      likeDelta = 1;
    } else {
      dislikeDelta = 1;
    }
  } else {
    // Cambia de like a dislike o de dislike a like
    newActiveReaction = reaction;
    if (reaction === 'like') {
      likeDelta = 1;
      dislikeDelta = -1;
    } else {
      dislikeDelta = 1;
      likeDelta = -1;
    }
  }

  // 2. Actualizar tabla local resenas_like_dislike
  let updatedReactions = [...allLocalReactions];
  if (newActiveReaction === null) {
    updatedReactions = updatedReactions.filter(
      r => !(r.resena_id === cleanId && r.user_uid === cleanUid)
    );
  } else if (existingReactionIndex >= 0) {
    updatedReactions[existingReactionIndex] = {
      ...updatedReactions[existingReactionIndex],
      reaction: newActiveReaction,
      created_at: new Date().toISOString()
    };
  } else {
    updatedReactions.push({
      resena_id: cleanId,
      user_uid: cleanUid,
      reaction: newActiveReaction,
      created_at: new Date().toISOString()
    });
  }
  saveLocalReactions(updatedReactions);

  // 3. Actualizar contadores en la lista local de Starposts (personajes_resenas)
  const localResenas = getLocalResenas();
  let finalLikes = 0;
  let finalDislikes = 0;

  const resenaIdx = localResenas.findIndex(r => r.id === cleanId);
  if (resenaIdx >= 0) {
    const curLikes = localResenas[resenaIdx].likes_count || 0;
    const curDislikes = localResenas[resenaIdx].dislikes_count || 0;

    finalLikes = Math.max(0, curLikes + likeDelta);
    finalDislikes = Math.max(0, curDislikes + dislikeDelta);

    localResenas[resenaIdx].likes_count = finalLikes;
    localResenas[resenaIdx].dislikes_count = finalDislikes;
    saveLocalResenas(localResenas);
  }

  // 4. Sincronizar en Supabase (si está conectado)
  if (supabase) {
    try {
      // 4a. Actualizar o eliminar en resenas_like_dislike
      if (newActiveReaction === null) {
        await supabase
          .from('resenas_like_dislike')
          .delete()
          .match({ resena_id: cleanId, user_uid: cleanUid });
      } else {
        await supabase
          .from('resenas_like_dislike')
          .upsert({
            resena_id: cleanId,
            user_uid: cleanUid,
            reaction: newActiveReaction,
            created_at: new Date().toISOString()
          }, { onConflict: 'resena_id,user_uid' });
      }

      // 4b. Actualizar el contador general en personajes_resenas
      await supabase
        .from('personajes_resenas')
        .update({
          likes_count: finalLikes,
          dislikes_count: finalDislikes
        })
        .eq('id', cleanId);
    } catch (e) {
      console.warn('Error al sincronizar reacción de Starpost en Supabase:', e);
    }
  }

  return {
    activeReaction: newActiveReaction,
    likesCount: finalLikes,
    dislikesCount: finalDislikes
  };
}

/**
 * Obtiene todas las reseñas/Starsposts realizadas por un usuario determinado.
 */
export async function getUserAllResenas(userUid: string): Promise<PersonajeResena[]> {
  const cleanUid = userUid.trim();
  if (!cleanUid) return [];

  // 1. Intentar desde Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('personajes_resenas')
        .select('*')
        .eq('user_uid', cleanUid)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as PersonajeResena[];
      }
    } catch (e) {
      console.warn('Error al consultar todas las reseñas del usuario en Supabase:', e);
    }
  }

  // 2. Fallback local
  const localList = getLocalResenas();
  return localList.filter(r => r.user_uid === cleanUid);
}

/**
 * Obtiene todas las respuestas correspondientes a un Starpost.
 */
export async function getRepliesForStarpost(starpostId: string): Promise<StarpostReply[]> {
  const cleanId = starpostId.trim();
  if (!cleanId) return [];

  // 1. Intentar desde Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('starposts_respuestas')
        .select('*')
        .eq('starpost_id', cleanId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map(item => ({
          id: String(item.id),
          starpost_id: item.starpost_id,
          parent_id: item.parent_id ? String(item.parent_id) : null,
          user_uid: item.user_uid,
          user_name: item.user_name,
          user_gender: item.user_gender,
          user_nationality: item.user_nationality,
          is_anonymous: !!item.is_anonymous,
          registered_with: item.registered_with || 'anonymous',
          reply_to_user_name: item.reply_to_user_name || null,
          comment_text: item.comment_text,
          created_at: item.created_at
        })) as StarpostReply[];
      }
    } catch (e) {
      console.warn('Error al consultar respuestas en Supabase:', e);
    }
  }

  // 2. Fallback local
  const localList = getLocalReplies();
  return localList.filter(r => r.starpost_id === cleanId);
}

/**
 * Obtiene los conteos de respuestas para una lista de IDs de Starposts.
 */
export async function getRepliesCountsForStarposts(
  starpostIds: string[]
): Promise<Record<string, number>> {
  if (starpostIds.length === 0) return {};
  const countsMap: Record<string, number> = {};
  starpostIds.forEach(id => { countsMap[id] = 0; });

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('starposts_respuestas')
        .select('starpost_id')
        .in('starpost_id', starpostIds);

      if (!error && Array.isArray(data)) {
        data.forEach(item => {
          if (item.starpost_id) {
            countsMap[item.starpost_id] = (countsMap[item.starpost_id] || 0) + 1;
          }
        });
        return countsMap;
      }
    } catch (e) {
      console.warn('Error al consultar conteo de respuestas en Supabase:', e);
    }
  }

  // Fallback local
  const localList = getLocalReplies();
  localList.forEach(item => {
    if (countsMap[item.starpost_id] !== undefined) {
      countsMap[item.starpost_id] += 1;
    }
  });

  return countsMap;
}

/**
 * Agrega una nueva respuesta a un Starpost (Nivel 1 o Nivel 2).
 */
export async function addReplyToStarpost(params: {
  starpostId: string;
  parentId?: string | null; // null si es Nivel 1; ID de respuesta si es Nivel 2
  userUid: string;
  userName: string;
  userGender?: string;
  userNationality?: string;
  isAnonymous?: boolean;
  registeredWith?: 'google' | 'anonymous';
  replyToUserName?: string | null;
  commentText: string;
}): Promise<StarpostReply> {
  const {
    starpostId,
    parentId,
    userUid,
    userName,
    userGender,
    userNationality,
    isAnonymous = false,
    registeredWith = 'anonymous',
    replyToUserName,
    commentText
  } = params;

  const cleanText = commentText.substring(0, 500).trim();
  const now = new Date().toISOString();
  const generatedLocalId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let createdReply: StarpostReply = {
    id: generatedLocalId,
    starpost_id: starpostId,
    parent_id: parentId ? String(parentId) : null,
    user_uid: userUid,
    user_name: userName || 'Usuario',
    user_gender: userGender,
    user_nationality: userNationality,
    is_anonymous: isAnonymous,
    registered_with: registeredWith,
    reply_to_user_name: replyToUserName || null,
    comment_text: cleanText,
    created_at: now
  };

  // 1. Guardar localmente
  const allLocal = getLocalReplies();
  allLocal.push(createdReply);
  saveLocalReplies(allLocal);

  // Incrementar contador local de replies_count en personajes_resenas
  const localResenas = getLocalResenas();
  const rIdx = localResenas.findIndex(r => r.id === starpostId);
  if (rIdx >= 0) {
    localResenas[rIdx].replies_count = (localResenas[rIdx].replies_count || 0) + 1;
    saveLocalResenas(localResenas);
  }

  // 2. Guardar en Supabase si está disponible
  if (supabase) {
    try {
      const payload: Record<string, unknown> = {
        starpost_id: starpostId,
        parent_id: parentId ? parentId : null,
        user_uid: userUid,
        user_name: userName || 'Usuario',
        user_gender: userGender || null,
        user_nationality: userNationality || null,
        is_anonymous: isAnonymous,
        registered_with: registeredWith,
        reply_to_user_name: replyToUserName || null,
        comment_text: cleanText,
        created_at: now
      };

      const { data, error } = await supabase
        .from('starposts_respuestas')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        createdReply = {
          ...createdReply,
          id: String(data.id),
          created_at: data.created_at || now
        };
      }

      // Actualizar columna replies_count en personajes_resenas
      const newRepliesCount = (localResenas[rIdx]?.replies_count) || 1;
      await supabase
        .from('personajes_resenas')
        .update({ replies_count: newRepliesCount })
        .eq('id', starpostId);
    } catch (e) {
      console.warn('Error al guardar respuesta en Supabase:', e);
    }
  }

  return createdReply;
}

/**
 * Elimina una respuesta de un Starpost.
 */
export async function deleteStarpostReply(replyId: string, starpostId: string): Promise<void> {
  const cleanId = String(replyId).trim();
  const cleanStarpostId = String(starpostId).trim();

  // 1. Local
  const localList = getLocalReplies();
  // Al eliminar una respuesta de Nivel 1, también eliminamos las de Nivel 2 que dependan de ella
  const filtered = localList.filter(r => r.id !== cleanId && r.parent_id !== cleanId);
  saveLocalReplies(filtered);

  // Reducir contador en personajes_resenas
  const localResenas = getLocalResenas();
  const rIdx = localResenas.findIndex(r => r.id === cleanStarpostId);
  if (rIdx >= 0) {
    localResenas[rIdx].replies_count = Math.max(0, (localResenas[rIdx].replies_count || 1) - 1);
    saveLocalResenas(localResenas);
  }

  // 2. Supabase
  if (supabase) {
    try {
      await supabase
        .from('starposts_respuestas')
        .delete()
        .or(`id.eq.${cleanId},parent_id.eq.${cleanId}`);

      const remainingCount = localResenas[rIdx]?.replies_count ?? 0;
      await supabase
        .from('personajes_resenas')
        .update({ replies_count: remainingCount })
        .eq('id', cleanStarpostId);
    } catch (e) {
      console.warn('Error al eliminar respuesta en Supabase:', e);
    }
  }
}

