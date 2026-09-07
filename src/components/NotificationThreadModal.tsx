import React, { useEffect, useState, useRef } from 'react';
import { AppNotification, PersonajeResena, StarpostReply } from '../types';
import { getNotificationThread, createNotification } from '../lib/notificationsService';
import { addReplyToStarpost } from '../lib/resenasService';
import { getOrCreateGuestUid, getUserPreferences } from '../lib/actitudesService';
import { User } from '../lib/firebase';
import { 
  X, 
  MessageSquare, 
  Star, 
  CornerDownRight, 
  ExternalLink, 
  Send, 
  Check, 
  AlertCircle 
} from 'lucide-react';

interface NotificationThreadModalProps {
  notification: AppNotification | null;
  currentUser?: User | null;
  onClose: () => void;
  onNavigateToPersonaje: (slug: string) => void;
}

export const NotificationThreadModal: React.FC<NotificationThreadModalProps> = ({
  notification,
  currentUser,
  onClose,
  onNavigateToPersonaje
}) => {
  const [loading, setLoading] = useState(true);
  const [resena, setResena] = useState<PersonajeResena | null>(null);
  const [reply1, setReply1] = useState<StarpostReply | null>(null);
  const [reply2, setReply2] = useState<StarpostReply | null>(null);

  // Estados para responder directamente desde la notificación
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subsequentReplies, setSubsequentReplies] = useState<StarpostReply[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notification) return;

    let isMounted = true;
    setLoading(true);
    setSubsequentReplies([]);
    setReplyText('');
    setSuccessMsg(null);
    setErrorMsg(null);

    getNotificationThread({
      starpostId: notification.starpost_id,
      replyId: notification.reply_id,
      parentReplyId: notification.parent_reply_id,
      personajeSlug: notification.personaje_slug
    })
      .then((data) => {
        if (isMounted) {
          setResena(data.resena);
          setReply1(data.reply1);
          setReply2(data.reply2);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [notification]);

  if (!notification) return null;

  const isReplyToReply = notification.type === 'reply_to_reply';

  // Identificar el destinatario de la respuesta y el ID padre correspondiente en la jerarquía
  const targetUserName = reply2?.user_name || notification.sender_name || 'Usuario';
  const targetUserUid = reply2?.user_uid || notification.sender_uid || '';

  // Determinar parent_id para mantener la consistencia con Graderz5
  // Si reply2 existe, su parent es reply1?.id || reply2.parent_id || reply2.id
  // Si es respuesta a reseña, parent es reply1?.id || notification.reply_id
  const effectiveParentId = reply2 
    ? (reply1?.id || reply2.parent_id || reply2.id)
    : (reply1?.id || notification.reply_id);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = replyText.trim();
    if (!cleanContent || isSubmitting || !notification) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const effectiveUid = currentUser?.uid || getOrCreateGuestUid();
      const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Invitado';
      const userPrefs = getUserPreferences();

      // 1. Guardar la respuesta localmente y en Supabase
      const newReply = await addReplyToStarpost({
        starpostId: notification.starpost_id,
        parentId: effectiveParentId,
        userUid: effectiveUid,
        userName: currentUserName,
        userGender: userPrefs.gender,
        userNationality: userPrefs.nationality,
        isAnonymous: !currentUser,
        registeredWith: currentUser ? 'google' : 'anonymous',
        replyToUserName: targetUserName,
        commentText: cleanContent
      });

      // 2. Notificar al autor del comentario/respuesta objetivo si no es el mismo usuario
      if (targetUserUid && targetUserUid !== effectiveUid) {
        createNotification({
          recipientUid: targetUserUid,
          senderUid: effectiveUid,
          senderName: currentUserName,
          senderPhoto: currentUser?.photoURL || undefined,
          type: 'reply_to_reply',
          personajeSlug: notification.personaje_slug,
          personajeNombre: notification.personaje_nombre || notification.personaje_slug,
          starpostId: notification.starpost_id,
          parentReplyId: effectiveParentId,
          replyId: newReply.id,
          message: `${currentUserName} respondió a tu comentario en ${notification.personaje_nombre || notification.personaje_slug}`
        }).catch((err) => console.warn('Error enviando notificación:', err));
      }

      // 3. Añadir a la vista del hilo actual y limpiar formulario
      setSubsequentReplies((prev) => [...prev, newReply]);
      setReplyText('');
      setSuccessMsg('¡Respuesta publicada!');
      setTimeout(() => setSuccessMsg(null), 3000);

      // Desplazar suavemente hacia la nueva respuesta
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error al responder desde el hilo de notificación:', err);
      setErrorMsg('No se pudo enviar la respuesta. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[#0f0f13] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#141419]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Hilo de Conversación
              </h3>
              <p className="text-xs text-zinc-400">
                En{' '}
                <span className="text-red-400 font-semibold">
                  {notification.personaje_nombre || notification.personaje_slug}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Conversación */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Cargando contexto del hilo...</p>
            </div>
          ) : (
            <div className="relative space-y-3">
              {/* 1. Reseña Original */}
              <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold border border-white/10">
                      {resena?.user_name ? resena.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-200">
                        {resena?.user_name || 'Autor del Starpost'}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-2 font-mono">
                        Reseña original
                      </span>
                    </div>
                  </div>

                  {resena && (
                    <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/5 text-[11px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{resena.stars}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 pl-9">
                  {resena?.review_text || (
                    <span className="italic text-zinc-500">Calificó con estrellas este personaje.</span>
                  )}
                </p>
              </div>

              {/* Conector de hilo visual 1 */}
              <div className="pl-6 flex items-center gap-2 text-zinc-600">
                <div className="w-0.5 h-6 bg-gradient-to-b from-white/20 to-red-500/50"></div>
                <CornerDownRight className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                  {isReplyToReply ? 'Respuesta anterior' : 'Respuesta recibida'}
                </span>
              </div>

              {/* 2. Respuesta 1 */}
              <div
                className={`border rounded-2xl p-4 space-y-2 ml-4 ${
                  isReplyToReply
                    ? 'bg-black/20 border-white/10'
                    : 'bg-red-500/5 border-red-500/30 shadow-lg shadow-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold border border-white/10">
                      {reply1?.user_name ? reply1.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-100">
                        {reply1?.user_name || notification.sender_name}
                      </span>
                      {!isReplyToReply && (
                        <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          Nueva
                        </span>
                      )}
                    </div>
                  </div>
                  {reply1?.created_at && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(reply1.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-zinc-200 pl-9">
                  {reply1?.comment_text || (
                    <span className="italic text-zinc-400">{notification.message}</span>
                  )}
                </p>
              </div>

              {/* Si es respuesta a una respuesta (Nivel 2) */}
              {isReplyToReply && (
                <>
                  {/* Conector de hilo visual 2 */}
                  <div className="pl-10 flex items-center gap-2 text-zinc-600">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-red-500/30 to-red-500"></div>
                    <CornerDownRight className="w-4 h-4 text-red-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-400">
                      Nueva respuesta a este comentario
                    </span>
                  </div>

                  {/* 3. Respuesta 2 (La nueva respuesta recibida) */}
                  <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 space-y-2 ml-8 shadow-xl shadow-red-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md">
                          {reply2?.user_name ? reply2.user_name.charAt(0).toUpperCase() : notification.sender_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-white">
                            {reply2?.user_name || notification.sender_name}
                          </span>
                          <span className="ml-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase shadow-sm">
                            ¡Nueva respuesta!
                          </span>
                        </div>
                      </div>
                      {reply2?.created_at && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(reply2.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-100 pl-9 font-medium">
                      {reply2?.comment_text || notification.message}
                    </p>
                  </div>
                </>
              )}

              {/* 4. Respuestas enviadas directamente desde este modal */}
              {subsequentReplies.map((subReply) => (
                <div key={subReply.id} className="space-y-2">
                  <div className="pl-12 flex items-center gap-2 text-zinc-600">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-red-500/30 to-emerald-500/60"></div>
                    <CornerDownRight className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                      Tu respuesta enviada
                    </span>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-2 ml-10 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-md">
                          {subReply.user_name ? subReply.user_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white">
                            {subReply.user_name}
                          </span>
                          <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                            Tú
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Ahora
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-100 pl-9 font-medium">
                      {subReply.comment_text}
                    </p>
                  </div>
                </div>
              ))}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Sección Inferior: Opción para responder directamente desde la notificación */}
        <div className="border-t border-white/10 bg-[#121217] p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] px-1">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <CornerDownRight className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>
                Responder a{' '}
                <span className="text-red-400 font-bold">@{targetUserName}</span>
              </span>
            </div>

            {successMsg && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                {successMsg}
              </span>
            )}

            {errorMsg && (
              <span className="text-rose-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmitReply} className="relative flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply(e);
                  }
                }}
                placeholder={`Escribe tu respuesta a @${targetUserName}... (Enter para enviar)`}
                rows={2}
                maxLength={500}
                disabled={isSubmitting || loading}
                className="w-full bg-black/60 border border-white/10 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none transition shadow-inner"
              />
              <div className="absolute right-2.5 bottom-2 text-[10px] text-zinc-500 font-mono pointer-events-none">
                {replyText.length}/500
              </div>
            </div>

            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting || loading}
              className={`h-[58px] px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition shadow-lg shrink-0 cursor-pointer ${
                !replyText.trim() || isSubmitting || loading
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white shadow-red-950/50 border border-red-500/40 active:scale-95'
              }`}
              title="Enviar respuesta directamente"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Responder</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Modal Footer: Acciones secundarias */}
        <div className="px-4 py-3 border-t border-white/5 bg-[#141419]/90 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToPersonaje(notification.personaje_slug);
            }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-xl border border-white/10 transition cursor-pointer"
          >
            <span>Ir al perfil de {notification.personaje_nombre || notification.personaje_slug}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
