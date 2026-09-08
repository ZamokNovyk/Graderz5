import React, { useEffect, useState, useRef } from 'react';
import { AppNotification, PersonajeResena, StarpostReply, StarpostReactionType } from '../types';
import { getNotificationThread, createNotification } from '../lib/notificationsService';
import { 
  addReplyToStarpost, 
  toggleStarpostReaction, 
  getUserReactionsForStarposts 
} from '../lib/resenasService';
import { getOrCreateGuestUid, getUserPreferences } from '../lib/actitudesService';
import { User } from '../lib/firebase';
import { FlagImage } from './FlagImage';
import { 
  X, 
  MessageSquare, 
  Star, 
  CornerDownRight, 
  ExternalLink, 
  Send, 
  Check, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  User as UserIcon
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

  // Estados de reacciones para la tarjeta de la reseña original
  const [resenaLikes, setResenaLikes] = useState(0);
  const [resenaDislikes, setResenaDislikes] = useState(0);
  const [myReaction, setMyReaction] = useState<StarpostReactionType | null>(null);
  const [isReacting, setIsReacting] = useState(false);

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

    const effectiveUid = currentUser?.uid || getOrCreateGuestUid();

    getNotificationThread({
      starpostId: notification.starpost_id,
      replyId: notification.reply_id,
      parentReplyId: notification.parent_reply_id,
      personajeSlug: notification.personaje_slug
    })
      .then((data) => {
        if (!isMounted) return;

        setResena(data.resena);
        setReply1(data.reply1);
        setReply2(data.reply2);

        if (data.resena) {
          setResenaLikes(data.resena.likes_count ?? 0);
          setResenaDislikes(data.resena.dislikes_count ?? 0);

          getUserReactionsForStarposts(effectiveUid, [data.resena.id])
            .then((reactions) => {
              if (isMounted) {
                setMyReaction(reactions[data.resena!.id] || null);
              }
            })
            .catch(() => {});
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
  }, [notification, currentUser]);

  if (!notification) return null;

  const isReplyToReply = notification.type === 'reply_to_reply';

  // Identificar destinatario y padre jerárquico
  const targetUserName = reply2?.user_name || notification.sender_name || 'Usuario';
  const targetUserUid = reply2?.user_uid || notification.sender_uid || '';

  const effectiveParentId = reply2 
    ? (reply1?.id || reply2.parent_id || reply2.id)
    : (reply1?.id || notification.reply_id);

  // Manejador de reacciones (Like / Dislike) en la tarjeta de la reseña
  const handleReaction = async (type: StarpostReactionType) => {
    if (!resena || isReacting) return;
    const effectiveUid = currentUser?.uid || getOrCreateGuestUid();

    const prevReaction = myReaction;
    const prevLikes = resenaLikes;
    const prevDislikes = resenaDislikes;

    let nextReaction: StarpostReactionType | null = null;
    let nextLikes = prevLikes;
    let nextDislikes = prevDislikes;

    if (prevReaction === type) {
      nextReaction = null;
      if (type === 'like') nextLikes = Math.max(0, nextLikes - 1);
      else nextDislikes = Math.max(0, nextDislikes - 1);
    } else {
      nextReaction = type;
      if (type === 'like') {
        nextLikes += 1;
        if (prevReaction === 'dislike') nextDislikes = Math.max(0, nextDislikes - 1);
      } else {
        nextDislikes += 1;
        if (prevReaction === 'like') nextLikes = Math.max(0, nextLikes - 1);
      }
    }

    setMyReaction(nextReaction);
    setResenaLikes(nextLikes);
    setResenaDislikes(nextDislikes);
    setIsReacting(true);

    try {
      const res = await toggleStarpostReaction({
        starpostId: resena.id,
        userUid: effectiveUid,
        reaction: type
      });
      if (res) {
        setMyReaction(res.activeReaction);
        setResenaLikes(res.likesCount);
        setResenaDislikes(res.dislikesCount);
      }
    } catch (err) {
      console.error('Error al actualizar reacción en el modal:', err);
      setMyReaction(prevReaction);
      setResenaLikes(prevLikes);
      setResenaDislikes(prevDislikes);
    } finally {
      setIsReacting(false);
    }
  };

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

      // 2. Notificar al autor objetivo si no es el mismo
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

  // Datos para renderizar la tarjeta completa de la reseña
  const authorName = resena?.user_name || notification.sender_name || 'Usuario';
  const authorGender = resena?.user_gender;
  const authorNationality = resena?.user_nationality;
  const isAuthorGoogle = resena?.registered_with === 'google';
  const starsCount = resena?.stars ?? 5;
  const starsArr = Array.from({ length: 5 }, (_, i) => i + 1);
  const reviewDate = resena?.created_at ? new Date(resena.created_at) : new Date(notification.created_at);
  const formattedDate = reviewDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[#0d0d12] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
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
              {/* 1. Tarjeta de la Reseña Original (Estilo idéntico a PersonajeProfileView) */}
              <div className="bg-[#111116] border border-white/10 rounded-2xl p-4.5 space-y-3 shadow-lg transition-colors">
                {/* Cabecera de la Reseña: Usuario, Insignias (Google, Sexo, País) y Fecha */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-white">
                      {authorName}
                    </span>
                    
                    {/* Badge Google o Invitado */}
                    {isAuthorGoogle ? (
                      <span 
                        title="Registrado con Google" 
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 border border-white/20 shadow-sm"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                      </span>
                    ) : (
                      <span 
                        title="Usuario Invitado" 
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 border border-white/10 text-zinc-400"
                      >
                        <UserIcon className="w-2.5 h-2.5" />
                      </span>
                    )}

                    {/* Insignia de Sexo: Masculino (♂) o Femenino (♀) */}
                    {authorGender && (authorGender.toLowerCase() === 'masculino' || authorGender.toLowerCase() === 'hombre') && (
                      <span 
                        title="Sexo: Masculino" 
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-xs"
                      >
                        ♂
                      </span>
                    )}
                    {authorGender && (authorGender.toLowerCase() === 'femenino' || authorGender.toLowerCase() === 'mujer') && (
                      <span 
                        title="Sexo: Femenino" 
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 font-bold text-xs"
                      >
                        ♀
                      </span>
                    )}

                    {/* Bandera HD del País */}
                    {authorNationality && authorNationality !== 'No especificada' && (
                      <span 
                        title={`País: ${authorNationality}`} 
                        className="inline-flex items-center justify-center p-0.5 rounded-sm bg-white/5 border border-white/10 shadow-xs"
                      >
                        <FlagImage countryName={authorNationality} size="sm" />
                      </span>
                    )}
                  </div>

                  {/* Fecha de publicación */}
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formattedDate}
                  </span>
                </div>

                {/* Estrellas doradas y Texto de la Reseña */}
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    {starsArr.map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          starsCount >= star
                            ? 'fill-[#ffbf00] text-[#ffbf00]'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-zinc-200 leading-relaxed font-normal whitespace-pre-wrap">
                    {resena?.review_text || (
                      <span className="italic text-zinc-500">Calificó con estrellas a este personaje.</span>
                    )}
                  </p>
                </div>

                {/* Barra Inferior: Contador de respuestas y Botones Like / Dislike */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    <span>
                      {resena?.replies_count !== undefined && resena.replies_count > 0
                        ? `${resena.replies_count} ${resena.replies_count === 1 ? 'respuesta' : 'respuestas'}`
                        : 'Respuestas del Starpost'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botón Like */}
                    <button
                      type="button"
                      onClick={() => handleReaction('like')}
                      disabled={isReacting}
                      title={myReaction === 'like' ? 'Quitar Me gusta' : 'Me gusta'}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        myReaction === 'like'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                      } ${isReacting ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <ThumbsUp 
                        className={`w-3.5 h-3.5 transition-transform ${
                          myReaction === 'like' ? 'fill-emerald-400 scale-110' : ''
                        }`} 
                      />
                      <span className="font-mono text-xs">{resenaLikes}</span>
                    </button>

                    {/* Botón Dislike */}
                    <button
                      type="button"
                      onClick={() => handleReaction('dislike')}
                      disabled={isReacting}
                      title={myReaction === 'dislike' ? 'Quitar No me gusta' : 'No me gusta'}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        myReaction === 'dislike'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-xs'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                      } ${isReacting ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <ThumbsDown 
                        className={`w-3.5 h-3.5 transition-transform ${
                          myReaction === 'dislike' ? 'fill-rose-400 scale-110' : ''
                        }`} 
                      />
                      <span className="font-mono text-xs">{resenaDislikes}</span>
                    </button>
                  </div>
                </div>
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-100">
                        {reply1?.user_name || notification.sender_name}
                      </span>

                      {/* Insignias de la Respuesta 1 */}
                      {reply1?.registered_with === 'google' && (
                        <span title="Registrado con Google" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 border border-white/20">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                        </span>
                      )}

                      {reply1?.user_gender && (reply1.user_gender.toLowerCase() === 'masculino' || reply1.user_gender.toLowerCase() === 'hombre') && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-[10px]">
                          ♂
                        </span>
                      )}
                      {reply1?.user_gender && (reply1.user_gender.toLowerCase() === 'femenino' || reply1.user_gender.toLowerCase() === 'mujer') && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 font-bold text-[10px]">
                          ♀
                        </span>
                      )}

                      {reply1?.user_nationality && reply1.user_nationality !== 'No especificada' && (
                        <span className="inline-flex items-center justify-center p-0.5 rounded-sm bg-white/5 border border-white/10 shadow-xs">
                          <FlagImage countryName={reply1.user_nationality} size="sm" />
                        </span>
                      )}

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
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-white">
                            {reply2?.user_name || notification.sender_name}
                          </span>

                          {/* Insignias de la Respuesta 2 */}
                          {reply2?.registered_with === 'google' && (
                            <span title="Registrado con Google" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 border border-white/20">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                              </svg>
                            </span>
                          )}

                          {reply2?.user_gender && (reply2.user_gender.toLowerCase() === 'masculino' || reply2.user_gender.toLowerCase() === 'hombre') && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-[10px]">
                              ♂
                            </span>
                          )}
                          {reply2?.user_gender && (reply2.user_gender.toLowerCase() === 'femenino' || reply2.user_gender.toLowerCase() === 'mujer') && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 font-bold text-[10px]">
                              ♀
                            </span>
                          )}

                          {reply2?.user_nationality && reply2.user_nationality !== 'No especificada' && (
                            <span className="inline-flex items-center justify-center p-0.5 rounded-sm bg-white/5 border border-white/10 shadow-xs">
                              <FlagImage countryName={reply2.user_nationality} size="sm" />
                            </span>
                          )}

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
