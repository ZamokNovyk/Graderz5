import { AppNotification, PersonajeResena, StarpostReply } from '../types';
import { supabase } from './supabase';
import { app } from './firebase';
import { getResenasForPersonaje, getRepliesForStarpost } from './resenasService';

export const VAPID_KEY = 'BAe6SSlJJP6md9QnoL0lm3QbOqlGchdlomU-8XlwZb57yaLBZl-gp43svztMsWLOjxDknm8PSs7vmtQsDxZlQz0';

const NOTIFICATIONS_STORAGE_PREFIX = 'graderz5_notifications_';
const FCM_TOKEN_STORAGE_KEY = 'graderz5_fcm_token';

/**
 * Obtiene la lista local de notificaciones para un usuario.
 */
function getLocalNotifications(userUid: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(`${NOTIFICATIONS_STORAGE_PREFIX}${userUid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Reproduce el sonido para las notificaciones internas (notisonido.mp3).
 */
export function playNotificationSound(): void {
  try {
    const audio = new Audio('/sounds/notisonido.mp3');
    audio.volume = 0.55;
    audio.play().catch((err) => {
      console.warn('Audio de notificación no reproducido por política del navegador:', err);
    });
  } catch (e) {
    console.warn('Error al reproducir notisonido.mp3:', e);
  }
}

/**
 * Guarda las notificaciones localmente.
 */
function saveLocalNotifications(userUid: string, list: AppNotification[], isNewNotification = false): void {
  try {
    localStorage.setItem(`${NOTIFICATIONS_STORAGE_PREFIX}${userUid}`, JSON.stringify(list));
    // Disparar evento para actualizar componentes reactivos
    window.dispatchEvent(
      new CustomEvent('graderz5_notification_update', {
        detail: { userUid, isNewNotification }
      })
    );
  } catch (e) {
    console.warn('Error al guardar notificaciones locales:', e);
  }
}

/**
 * Consulta todas las notificaciones recibidas por un usuario.
 */
export async function getNotifications(userUid: string): Promise<AppNotification[]> {
  if (!userUid) return [];

  // 1. Intentar desde Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('recipient_uid', userUid)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!error && Array.isArray(data)) {
        const mapped = data.map((item) => ({
          id: String(item.id),
          recipient_uid: item.recipient_uid,
          sender_uid: item.sender_uid,
          sender_name: item.sender_name,
          sender_photo: item.sender_photo || undefined,
          type: item.type as 'reply_to_review' | 'reply_to_reply',
          personaje_slug: item.personaje_slug,
          personaje_nombre: item.personaje_nombre,
          starpost_id: item.starpost_id,
          reply_id: item.reply_id,
          parent_reply_id: item.parent_reply_id || null,
          message: item.message,
          read: Boolean(item.read),
          created_at: item.created_at
        })) as AppNotification[];

        // Guardar copia local de caché
        saveLocalNotifications(userUid, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Error consultando notificaciones en Supabase:', err);
    }
  }

  // 2. Fallback a almacenamiento local
  return getLocalNotifications(userUid).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Obtiene la cantidad de notificaciones sin leer.
 */
export async function getUnreadNotificationsCount(userUid: string): Promise<number> {
  if (!userUid) return 0;
  const list = await getNotifications(userUid);
  return list.filter((n) => !n.read).length;
}

/**
 * Marca una notificación como leída.
 */
export async function markNotificationAsRead(id: string, userUid: string): Promise<void> {
  if (!id || !userUid) return;

  // Actualizar local
  const current = getLocalNotifications(userUid);
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveLocalNotifications(userUid, updated);

  // Actualizar Supabase
  if (supabase) {
    try {
      await supabase
        .from('notificaciones')
        .update({ read: true })
        .eq('id', id)
        .eq('recipient_uid', userUid);
    } catch (err) {
      console.warn('Error marcando notificación en Supabase:', err);
    }
  }
}

/**
 * Marca todas las notificaciones de un usuario como leídas.
 */
export async function markAllNotificationsAsRead(userUid: string): Promise<void> {
  if (!userUid) return;

  // Actualizar local
  const current = getLocalNotifications(userUid);
  const updated = current.map((n) => ({ ...n, read: true }));
  saveLocalNotifications(userUid, updated);

  // Actualizar Supabase
  if (supabase) {
    try {
      await supabase
        .from('notificaciones')
        .update({ read: true })
        .eq('recipient_uid', userUid)
        .eq('read', false);
    } catch (err) {
      console.warn('Error marcando todas las notificaciones en Supabase:', err);
    }
  }
}

/**
 * Crea y envía una nueva notificación interna (y opcionalmente a FCM).
 */
export async function createNotification(params: {
  recipientUid: string;
  senderUid: string;
  senderName: string;
  senderPhoto?: string;
  type: 'reply_to_review' | 'reply_to_reply';
  personajeSlug: string;
  personajeNombre: string;
  starpostId: string;
  replyId: string;
  parentReplyId?: string | null;
  message: string;
}): Promise<AppNotification | null> {
  const {
    recipientUid,
    senderUid,
    senderName,
    senderPhoto,
    type,
    personajeSlug,
    personajeNombre,
    starpostId,
    replyId,
    parentReplyId,
    message
  } = params;

  // No notificarse a uno mismo
  if (!recipientUid || recipientUid === senderUid) {
    return null;
  }

  const now = new Date().toISOString();
  const localId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let newNotif: AppNotification = {
    id: localId,
    recipient_uid: recipientUid,
    sender_uid: senderUid,
    sender_name: senderName,
    sender_photo: senderPhoto,
    type,
    personaje_slug: personajeSlug,
    personaje_nombre: personajeNombre,
    starpost_id: starpostId,
    reply_id: replyId,
    parent_reply_id: parentReplyId || null,
    message,
    read: false,
    created_at: now
  };

  // Guardar localmente
  const current = getLocalNotifications(recipientUid);
  saveLocalNotifications(recipientUid, [newNotif, ...current], true);

  // Guardar en Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .insert([
          {
            recipient_uid: recipientUid,
            sender_uid: senderUid,
            sender_name: senderName,
            sender_photo: senderPhoto || null,
            type,
            personaje_slug: personajeSlug,
            personaje_nombre: personajeNombre,
            starpost_id: starpostId,
            reply_id: replyId,
            parent_reply_id: parentReplyId || null,
            message,
            read: false,
            created_at: now
          }
        ])
        .select()
        .single();

      if (!error && data) {
        newNotif = {
          ...newNotif,
          id: String(data.id)
        };
      }
    } catch (err) {
      console.warn('Error al guardar notificación en Supabase:', err);
    }
  }

  // Notificación visual de navegador y sonido si tiene permisos concedidos
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Graderz5', {
        body: message,
        icon: '/earth-dark.jpg',
        badge: '/earth-dark.jpg'
      });
      playNotificationSound();
    } catch (e) {
      console.warn('No se pudo mostrar la notificación nativa:', e);
    }
  }

  return newNotif;
}

/**
 * Consulta el estado actual de permiso de notificaciones en el navegador.
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permiso para recibir notificaciones y registra el Token FCM en Firebase Messaging.
 */
export async function requestNotificationPermission(
  userUid?: string
): Promise<{ granted: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, error: 'Este navegador no soporta notificaciones web.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, error: 'El permiso para notificaciones fue denegado.' };
    }

    // Registrar Service Worker y obtener Token de Firebase Messaging
    let fcmToken: string | undefined;

    try {
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      const supported = await isSupported();

      if (supported) {
        const messaging = getMessaging(app);

        // Registrar service worker si existe
        let registration: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }

        fcmToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (fcmToken) {
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);

          // Asociar token al usuario en Supabase si está disponible
          if (userUid && supabase) {
            try {
              await supabase
                .from('users')
                .update({ fcm_token: fcmToken, notifications_enabled: true })
                .eq('uid', userUid);
            } catch (supaErr) {
              console.warn('Error guardando token en Supabase:', supaErr);
            }
          }
        }
      }
    } catch (messagingErr) {
      console.warn('Error al obtener token FCM:', messagingErr);
    }

    return { granted: true, token: fcmToken };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { granted: false, error: message };
  }
}

/**
 * Inicializa el listener en primer plano (foreground) de Firebase Messaging.
 */
export async function initForegroundMessaging(
  onMessageReceived: (payload: any) => void
): Promise<(() => void) | null> {
  if (typeof window === 'undefined') return null;

  try {
    const { getMessaging, onMessage, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();

    if (supported) {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        onMessageReceived(payload);
      });
      return unsubscribe;
    }
  } catch (err) {
    console.warn('Error iniciando Firebase Messaging en primer plano:', err);
  }

  return null;
}

/**
 * Carga todo el hilo de una conversación para mostrarlo en el modal:
 * - Caso 1: Reseña original + Respuesta
 * - Caso 2: Reseña original + Respuesta 1 + Respuesta 2
 */
export async function getNotificationThread(params: {
  starpostId: string;
  replyId: string;
  parentReplyId?: string | null;
  personajeSlug: string;
}): Promise<{
  resena: PersonajeResena | null;
  reply1: StarpostReply | null;
  reply2: StarpostReply | null;
}> {
  const { starpostId, replyId, parentReplyId, personajeSlug } = params;

  // 1. Obtener la reseña
  let foundResena: PersonajeResena | null = null;
  try {
    const resenas = await getResenasForPersonaje(personajeSlug);
    foundResena = resenas.find((r) => r.id === starpostId) || null;
  } catch (e) {
    console.warn('Error obteniendo reseña para hilo:', e);
  }

  // 2. Obtener las respuestas del starpost
  let reply1: StarpostReply | null = null;
  let reply2: StarpostReply | null = null;

  try {
    const replies = await getRepliesForStarpost(starpostId);

    if (parentReplyId) {
      // Caso 2: Respuesta a una respuesta
      // reply1 es el comentario original al que se le respondió
      reply1 = replies.find((r) => r.id === parentReplyId) || null;
      // reply2 es la nueva respuesta
      reply2 = replies.find((r) => r.id === replyId) || null;
    } else {
      // Caso 1: Respuesta directa a la reseña
      // reply1 es la nueva respuesta
      reply1 = replies.find((r) => r.id === replyId) || null;
      reply2 = null;
    }
  } catch (e) {
    console.warn('Error obteniendo respuestas para hilo:', e);
  }

  return {
    resena: foundResena,
    reply1,
    reply2
  };
}
