import React, { useEffect, useState } from 'react';
import { AppNotification, PersonajeResena, StarpostReply } from '../types';
import { getNotificationThread } from '../lib/notificationsService';
import { X, MessageSquare, Star, ArrowRight, CornerDownRight, ExternalLink } from 'lucide-react';

interface NotificationThreadModalProps {
  notification: AppNotification | null;
  onClose: () => void;
  onNavigateToPersonaje: (slug: string) => void;
}

export const NotificationThreadModal: React.FC<NotificationThreadModalProps> = ({
  notification,
  onClose,
  onNavigateToPersonaje
}) => {
  const [loading, setLoading] = useState(true);
  const [resena, setResena] = useState<PersonajeResena | null>(null);
  const [reply1, setReply1] = useState<StarpostReply | null>(null);
  const [reply2, setReply2] = useState<StarpostReply | null>(null);

  useEffect(() => {
    if (!notification) return;

    let isMounted = true;
    setLoading(true);

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
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [notification]);

  if (!notification) return null;

  const isReplyToReply = notification.type === 'reply_to_reply';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[#0f0f13] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
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

        {/* Modal Body */}
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 bg-[#141419]/90 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToPersonaje(notification.personaje_slug);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-950/50 border border-red-400/30 transition cursor-pointer"
          >
            <span>Ir al perfil de {notification.personaje_nombre || notification.personaje_slug}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
