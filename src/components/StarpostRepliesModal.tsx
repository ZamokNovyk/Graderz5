import React, { useState, useEffect } from 'react';
import { 
  X, 
  CornerDownRight, 
  Send, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Star, 
  User as UserIcon,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { PersonajeResena, StarpostReply } from '../types';
import { User } from '../lib/firebase';
import { 
  getRepliesForStarpost, 
  addReplyToStarpost, 
  deleteStarpostReply 
} from '../lib/resenasService';
import { getOrCreateGuestUid } from '../lib/actitudesService';
import { getCountryFlag } from '../data/countries';
import { FlagImage } from './FlagImage';

interface StarpostRepliesModalProps {
  starpost: PersonajeResena | null;
  onClose: () => void;
  currentUser: User | null;
  guestUserData?: {
    alias?: string;
    gender?: string;
    nationality?: string;
  } | null;
  onRepliesCountChange?: (starpostId: string, newCount: number) => void;
}

export const StarpostRepliesModal: React.FC<StarpostRepliesModalProps> = ({
  starpost,
  onClose,
  currentUser,
  guestUserData,
  onRepliesCountChange
}) => {
  const [replies, setReplies] = useState<StarpostReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Estado cuando se responde directamente a una respuesta (Nivel 2)
  const [replyingTo, setReplyingTo] = useState<{
    replyId: string; // ID de la respuesta Nivel 1 que servirá de parent_id
    targetUserName: string; // Nombre del usuario al que se le responde
  } | null>(null);

  // Estados para desplegar u ocultar respuestas hijas (Nivel 2)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const effectiveUid = currentUser?.uid || getOrCreateGuestUid();

  // Cargar respuestas al montar el modal
  useEffect(() => {
    if (!starpost) return;
    setIsLoading(true);
    getRepliesForStarpost(starpost.id)
      .then(list => {
        setReplies(list);
        // Expandir por defecto todas las respuestas que tengan hijos
        const initialExpanded: Record<string, boolean> = {};
        list.forEach(item => {
          if (item.parent_id) {
            initialExpanded[item.parent_id] = true;
          }
        });
        setExpandedParents(initialExpanded);
      })
      .catch(err => {
        console.error('Error al cargar respuestas del Starpost:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [starpost]);

  if (!starpost) return null;

  // Organizar en Nivel 1 (parent_id == null) y Nivel 2 (parent_id == id_nivel_1)
  const level1Replies = replies.filter(r => !r.parent_id);
  const getChildReplies = (parentId: string) => {
    return replies.filter(r => r.parent_id === parentId);
  };

  const toggleExpandParent = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  const handleStartReplyTo = (reply: StarpostReply) => {
    // Si la respuesta es de Nivel 2, el parent sigue siendo el Nivel 1 (regla de máximo 2 niveles)
    const effectiveParentId = reply.parent_id || reply.id;
    setReplyingTo({
      replyId: effectiveParentId,
      targetUserName: reply.user_name
    });
  };

  const handleCancelReplyingTo = () => {
    setReplyingTo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isAnon = !currentUser;
      const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || guestUserData?.alias || 'Invitado';
      const userGender = guestUserData?.gender;
      const userNationality = guestUserData?.nationality;
      const registeredWith = currentUser ? 'google' : 'anonymous';

      const newReply = await addReplyToStarpost({
        starpostId: starpost.id,
        parentId: replyingTo ? replyingTo.replyId : null,
        userUid: effectiveUid,
        userName,
        userGender,
        userNationality,
        isAnonymous: isAnon,
        registeredWith,
        replyToUserName: replyingTo ? `@${replyingTo.targetUserName}` : null,
        commentText: inputText.trim()
      });

      const updatedReplies = [...replies, newReply];
      setReplies(updatedReplies);
      setInputText('');

      // Si respondimos a un padre, asegurar que quede desplegado
      if (replyingTo) {
        setExpandedParents(prev => ({ ...prev, [replyingTo.replyId]: true }));
      }
      setReplyingTo(null);

      // Notificar al componente padre el nuevo conteo
      onRepliesCountChange?.(starpost.id, updatedReplies.length);
    } catch (err) {
      console.error('Error al enviar respuesta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (replyId: string) => {
    try {
      await deleteStarpostReply(replyId, starpost.id);
      const updated = replies.filter(r => r.id !== replyId && r.parent_id !== replyId);
      setReplies(updated);
      onRepliesCountChange?.(starpost.id, updated.length);
    } catch (err) {
      console.error('Error al eliminar respuesta:', err);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Reciente';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'Hace un momento';
      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return 'Reciente';
    }
  };

  const starsArr = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0b0b0f] border border-[#ffbf00]/25 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#111116]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ffbf00]/10 border border-[#ffbf00]/25 flex items-center justify-center text-[#ffbf00]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Respuestas al Starpost</span>
                <span className="bg-[#ffbf00]/15 text-[#ffbf00] text-xs font-mono px-2 py-0.5 rounded-full border border-[#ffbf00]/30">
                  {replies.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Hilo de conversación de la comunidad</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* STARPOST ORIGINAL (TARJETA DESTACADA) */}
          <div className="bg-[#14141b] border-2 border-[#ffbf00]/30 rounded-2xl p-4 space-y-2.5 relative">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#ffbf00] uppercase tracking-wider">
                  {starpost.user_name}
                </span>
                {starpost.user_nationality && (
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <FlagImage countryName={starpost.user_nationality} className="w-4 h-3 rounded-xs object-cover" />
                    <span>{starpost.user_nationality}</span>
                  </span>
                )}
                {starpost.user_uid === effectiveUid && (
                  <span className="bg-yellow-500/20 text-[#ffbf00] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#ffbf00]/30 uppercase">
                    Tu Starpost
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-500">{formatDate(starpost.created_at)}</span>
            </div>

            {/* Estrellas */}
            <div className="flex items-center gap-0.5">
              {starsArr.map(s => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    starpost.stars >= s ? 'fill-[#ffbf00] text-[#ffbf00]' : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Contenido del Starpost */}
            <p className="text-sm text-zinc-200 leading-relaxed font-normal whitespace-pre-wrap">
              {starpost.review_text || <span className="italic text-zinc-500">Sin comentario escrito (sólo puntuación de estrellas).</span>}
            </p>
          </div>

          {/* CAJA PARA ESCRIBIR RESPUESTA */}
          <form onSubmit={handleSubmit} className="bg-[#111116] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5 text-[#ffbf00]" />
                {replyingTo ? (
                  <span>
                    Respondiendo a <strong className="text-[#ffbf00]">@{replyingTo.targetUserName}</strong>
                  </span>
                ) : (
                  <span>Responder a este Starpost</span>
                )}
              </span>

              {replyingTo && (
                <button
                  type="button"
                  onClick={handleCancelReplyingTo}
                  className="text-[11px] text-zinc-400 hover:text-red-400 transition"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                maxLength={500}
                placeholder={
                  replyingTo 
                    ? `Escribe tu respuesta para @${replyingTo.targetUserName}...` 
                    : "Escribe tu respuesta para la comunidad (máx. 500 caracteres)..."
                }
                rows={2}
                className="w-full bg-[#0a0a0d] border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-[#ffbf00] resize-none"
              />
              <span className="absolute right-2.5 bottom-2 text-[10px] text-zinc-500 font-mono">
                {inputText.length}/500
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500">
                {currentUser ? `Publicando como @${currentUser.displayName || 'usuario'}` : 'Publicando como invitado'}
              </span>

              <button
                type="submit"
                disabled={!inputText.trim() || isSubmitting}
                className="bg-[#ffbf00] hover:bg-[#ffcf33] text-black font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Responder</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* LISTA DE RESPUESTAS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#ffbf00]" />
                <span>Respuestas de la comunidad ({replies.length})</span>
              </h3>
            </div>

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#ffbf00]" />
                <span className="text-xs">Cargando respuestas...</span>
              </div>
            ) : level1Replies.length === 0 ? (
              <div className="py-8 text-center bg-[#111116] rounded-2xl border border-dashed border-white/5 text-zinc-500">
                <p className="text-xs font-semibold">Aún no hay respuestas en este Starpost.</p>
                <p className="text-[11px] pt-0.5">¡Sé el primero en iniciar la conversación!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {level1Replies.map(reply1 => {
                  const isAuthor = reply1.user_uid === effectiveUid;
                  const childReplies = getChildReplies(reply1.id);
                  const isExpanded = !!expandedParents[reply1.id];

                  return (
                    <div 
                      key={reply1.id}
                      className="bg-[#111116] border border-white/5 rounded-2xl p-3.5 space-y-2.5 transition-colors"
                    >
                      {/* Cabecera Nivel 1 */}
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {reply1.user_name}
                          </span>

                          {isAuthor && (
                            <span className="bg-[#ffbf00]/20 text-[#ffbf00] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#ffbf00]/30 uppercase">
                              Tú
                            </span>
                          )}

                          {reply1.user_nationality && (
                            <FlagImage countryName={reply1.user_nationality} className="w-3.5 h-2.5 rounded-xs object-cover" />
                          )}
                        </div>

                        <span className="text-[11px] text-zinc-500">
                          {formatDate(reply1.created_at)}
                        </span>
                      </div>

                      {/* Texto Nivel 1 */}
                      <p className="text-xs text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
                        {reply1.comment_text}
                      </p>

                      {/* Acciones Nivel 1 */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                        {/* Botón Responder a este usuario */}
                        <button
                          type="button"
                          onClick={() => handleStartReplyTo(reply1)}
                          className="text-zinc-400 hover:text-[#ffbf00] flex items-center gap-1 font-semibold transition cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Responder</span>
                        </button>

                        <div className="flex items-center gap-3">
                          {/* Si el usuario actual es el autor, puede eliminar */}
                          {isAuthor && (
                            <button
                              type="button"
                              onClick={() => handleDelete(reply1.id)}
                              className="text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                              title="Eliminar respuesta"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Botón Ocultar / Mostrar respuestas hijas (Nivel 2) */}
                      {childReplies.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => toggleExpandParent(reply1.id)}
                            className="text-[11px] font-bold text-[#ffbf00] hover:underline flex items-center gap-1 cursor-pointer py-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                <span>Ocultar respuestas ({childReplies.length})</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                <span>Ver respuestas ({childReplies.length})</span>
                              </>
                            )}
                          </button>

                          {/* CONTENEDOR DE RESPUESTAS NIVEL 2 */}
                          {isExpanded && (
                            <div className="mt-2 space-y-2 pl-3 border-l-2 border-[#ffbf00]/40">
                              {childReplies.map(reply2 => {
                                const isAuthor2 = reply2.user_uid === effectiveUid;

                                return (
                                  <div 
                                    key={reply2.id}
                                    className="bg-[#16161f] border border-[#ffbf00]/20 rounded-xl p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-white">
                                          {reply2.user_name}
                                        </span>

                                        {isAuthor2 && (
                                          <span className="bg-[#ffbf00]/20 text-[#ffbf00] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#ffbf00]/30 uppercase">
                                            Tú
                                          </span>
                                        )}

                                        {reply2.reply_to_user_name && (
                                          <span className="text-[10px] bg-[#ffbf00]/10 text-[#ffbf00] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                                            <CornerDownRight className="w-2.5 h-2.5" />
                                            <span>ha respondido a {reply2.reply_to_user_name}</span>
                                          </span>
                                        )}
                                      </div>

                                      <span className="text-[10px] text-zinc-500">
                                        {formatDate(reply2.created_at)}
                                      </span>
                                    </div>

                                    <p className="text-xs text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
                                      {reply2.comment_text}
                                    </p>

                                    {/* Acciones Nivel 2 */}
                                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                                      <button
                                        type="button"
                                        onClick={() => handleStartReplyTo(reply2)}
                                        className="text-zinc-400 hover:text-[#ffbf00] flex items-center gap-1 font-semibold transition cursor-pointer"
                                      >
                                        <CornerDownRight className="w-3 h-3" />
                                        <span>Responder</span>
                                      </button>

                                      {isAuthor2 && (
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(reply2.id)}
                                          className="text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                                          title="Eliminar respuesta"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};
