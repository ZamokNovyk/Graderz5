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
  Loader2
} from 'lucide-react';
import { PersonajeResena, StarpostReply } from '../types';
import { User } from '../lib/firebase';
import { 
  getRepliesForStarpost, 
  addReplyToStarpost, 
  deleteStarpostReply,
  deleteResenaById
} from '../lib/resenasService';
import { getOrCreateGuestUid } from '../lib/actitudesService';
import { FlagImage } from './FlagImage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
  onStarpostDeleted?: (starpostId: string) => void;
}

export const StarpostRepliesModal: React.FC<StarpostRepliesModalProps> = ({
  starpost,
  onClose,
  currentUser,
  guestUserData,
  onRepliesCountChange,
  onStarpostDeleted
}) => {
  const [replies, setReplies] = useState<StarpostReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Caja de texto principal (para responder al Starpost original)
  const [mainInputText, setMainInputText] = useState('');
  const [isSubmittingMain, setIsSubmittingMain] = useState(false);
  
  // Estado para la caja de respuesta EN LÍNEA (justo debajo del comentario correspondiente)
  const [inlineReplyState, setInlineReplyState] = useState<{
    targetReplyId: string; // ID de la respuesta concreta donde se muestra el formulario
    parentId: string; // ID del Nivel 1 para jerarquía en base de datos
    targetUserName: string; // Nombre del usuario al que se responde
  } | null>(null);
  const [inlineInputText, setInlineInputText] = useState('');
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);

  // Estados para desplegar u ocultar respuestas hijas (Nivel 2)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Estado para modal de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'reply' | 'starpost';
    id: string;
    title: string;
    message: string;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

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

  // Abrir o cerrar el formulario de respuesta justo debajo del comentario
  const handleToggleInlineReply = (reply: StarpostReply) => {
    if (inlineReplyState?.targetReplyId === reply.id) {
      setInlineReplyState(null);
      setInlineInputText('');
      return;
    }

    const effectiveParentId = reply.parent_id || reply.id;
    setInlineReplyState({
      targetReplyId: reply.id,
      parentId: effectiveParentId,
      targetUserName: reply.user_name
    });
    setInlineInputText('');

    // Asegurar que el hilo padre esté abierto
    setExpandedParents(prev => ({ ...prev, [effectiveParentId]: true }));
  };

  const handleCancelInlineReply = () => {
    setInlineReplyState(null);
    setInlineInputText('');
  };

  // Envío del comentario principal (Nivel 1 - Directo al Starpost)
  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainInputText.trim() || isSubmittingMain) return;

    setIsSubmittingMain(true);
    try {
      const isAnon = !currentUser;
      const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || guestUserData?.alias || 'Invitado';
      const userGender = guestUserData?.gender;
      const userNationality = guestUserData?.nationality;

      const newReply = await addReplyToStarpost({
        starpostId: starpost.id,
        parentId: null,
        userUid: effectiveUid,
        userName,
        userGender,
        userNationality,
        isAnonymous: isAnon,
        registeredWith: currentUser ? 'google' : 'anonymous',
        commentText: mainInputText.trim()
      });

      const updatedReplies = [...replies, newReply];
      setReplies(updatedReplies);
      setMainInputText('');

      onRepliesCountChange?.(starpost.id, updatedReplies.length);
    } catch (err) {
      console.error('Error al responder al Starpost:', err);
    } finally {
      setIsSubmittingMain(false);
    }
  };

  // Envío de respuesta en línea (Nivel 2 o respuesta a sub-comentario)
  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineInputText.trim() || isSubmittingInline || !inlineReplyState) return;

    setIsSubmittingInline(true);
    try {
      const isAnon = !currentUser;
      const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || guestUserData?.alias || 'Invitado';
      const userGender = guestUserData?.gender;
      const userNationality = guestUserData?.nationality;

      const newReply = await addReplyToStarpost({
        starpostId: starpost.id,
        parentId: inlineReplyState.parentId,
        userUid: effectiveUid,
        userName,
        userGender,
        userNationality,
        isAnonymous: isAnon,
        registeredWith: currentUser ? 'google' : 'anonymous',
        replyToUserName: inlineReplyState.targetUserName,
        commentText: inlineInputText.trim()
      });

      const updatedReplies = [...replies, newReply];
      setReplies(updatedReplies);
      setExpandedParents(prev => ({ ...prev, [inlineReplyState.parentId]: true }));
      setInlineInputText('');
      setInlineReplyState(null);

      onRepliesCountChange?.(starpost.id, updatedReplies.length);
    } catch (err) {
      console.error('Error al enviar respuesta en línea:', err);
    } finally {
      setIsSubmittingInline(false);
    }
  };

  // Solicitar confirmación para eliminar respuesta
  const promptDeleteReply = (replyId: string) => {
    setDeleteConfirm({
      type: 'reply',
      id: replyId,
      title: '¿Eliminar respuesta?',
      message: '¿Estás seguro de que deseas eliminar tu respuesta? Si tiene respuestas asociadas también serán eliminadas de la base de datos de forma permanente.'
    });
  };

  // Solicitar confirmación para eliminar Starpost completo
  const promptDeleteStarpost = () => {
    setDeleteConfirm({
      type: 'starpost',
      id: starpost.id,
      title: '¿Eliminar este Starpost?',
      message: '¿Estás seguro de que deseas eliminar tu Starpost? Se eliminará de la base de datos junto con todas sus respuestas y reacciones de me gusta / no me gusta asociadas de forma permanente.'
    });
  };

  // Ejecutar eliminación confirmada
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeletingItem(true);
    try {
      if (deleteConfirm.type === 'reply') {
        await deleteStarpostReply(deleteConfirm.id, starpost.id);
        const updated = replies.filter(r => r.id !== deleteConfirm.id && r.parent_id !== deleteConfirm.id);
        setReplies(updated);
        onRepliesCountChange?.(starpost.id, updated.length);
        if (inlineReplyState?.targetReplyId === deleteConfirm.id) {
          setInlineReplyState(null);
        }
        setDeleteConfirm(null);
      } else if (deleteConfirm.type === 'starpost') {
        await deleteResenaById(starpost.id, starpost.personaje_slug);
        onStarpostDeleted?.(starpost.id);
        setDeleteConfirm(null);
        onClose();
      }
    } catch (err) {
      console.error('Error al eliminar elemento de la base de datos:', err);
    } finally {
      setIsDeletingItem(false);
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          className="bg-[#0b0b0f] border border-red-500/25 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* MODAL HEADER - ROJO Y NEGRO */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#111116]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Respuestas al Starpost</span>
                  <span className="bg-red-500/15 text-red-400 text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                    {replies.length}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">Hilo de conversación de la comunidad</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MODAL BODY (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* STARPOST ORIGINAL (TARJETA DESTACADA EN ROJO Y NEGRO, ESTRELLAS AMARILLAS) */}
            <div className="bg-[#14141b] border border-red-500/30 rounded-2xl p-4 space-y-2.5 relative">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                    {starpost.user_name}
                  </span>
                  {starpost.user_nationality && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <FlagImage countryName={starpost.user_nationality} className="w-4 h-3 rounded-xs object-cover" />
                      <span>{starpost.user_nationality}</span>
                    </span>
                  )}
                  {starpost.user_uid === effectiveUid && (
                    <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-red-500/30 uppercase">
                      Tu Starpost
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">{formatDate(starpost.created_at)}</span>
                  {starpost.user_uid === effectiveUid && (
                    <button
                      type="button"
                      onClick={promptDeleteStarpost}
                      className="text-zinc-500 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition cursor-pointer"
                      title="Eliminar este Starpost"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Estrellas: SOLO LAS ESTRELLAS QUEDAN AMARILLAS */}
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

            {/* CAJA PRINCIPAL: RESPONDER DIRECTAMENTE AL STARPOST */}
            <form onSubmit={handleMainSubmit} className="bg-[#111116] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-red-500" />
                  <span>Responder a este Starpost</span>
                </span>
              </div>

              <div className="relative">
                <textarea
                  value={mainInputText}
                  onChange={e => setMainInputText(e.target.value)}
                  maxLength={500}
                  placeholder="Escribe tu respuesta para la comunidad (máx. 500 caracteres)..."
                  rows={2}
                  className="w-full bg-[#0a0a0d] border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-red-500 resize-none"
                />
                <span className="absolute right-2.5 bottom-2 text-[10px] text-zinc-500 font-mono">
                  {mainInputText.length}/500
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-500">
                  {currentUser ? `Publicando como @${currentUser.displayName || 'usuario'}` : 'Publicando como invitado'}
                </span>

                <button
                  type="submit"
                  disabled={!mainInputText.trim() || isSubmittingMain}
                  className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20"
                >
                  {isSubmittingMain ? (
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
                  <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                  <span>Respuestas de la comunidad ({replies.length})</span>
                </h3>
              </div>

              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin text-red-500" />
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
                    const isReplyingThis1 = inlineReplyState?.targetReplyId === reply1.id;

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
                              <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/40 uppercase">
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
                            onClick={() => handleToggleInlineReply(reply1)}
                            className={`flex items-center gap-1 font-semibold transition cursor-pointer ${
                              isReplyingThis1 ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'
                            }`}
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>{isReplyingThis1 ? 'Cerrar respuesta' : 'Responder'}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            {/* Si el usuario actual es el autor, puede eliminar con confirmación */}
                            {isAuthor && (
                              <button
                                type="button"
                                onClick={() => promptDeleteReply(reply1.id)}
                                className="text-zinc-500 hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
                                title="Eliminar respuesta"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* CUADRO DE RESPUESTA EN LÍNEA PARA NIVEL 1 (JUSTO DEBAJO) */}
                        {isReplyingThis1 && (
                          <form onSubmit={handleInlineSubmit} className="mt-2.5 bg-[#0d0d12] border border-red-500/35 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                                <CornerDownRight className="w-3.5 h-3.5 text-red-500" />
                                <span>Respondiendo a <strong className="text-red-400">@{reply1.user_name}</strong></span>
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelInlineReply}
                                className="text-[11px] text-zinc-400 hover:text-red-400 transition cursor-pointer font-medium"
                              >
                                Cancelar
                              </button>
                            </div>

                            <div className="relative">
                              <textarea
                                autoFocus
                                value={inlineInputText}
                                onChange={e => setInlineInputText(e.target.value)}
                                maxLength={500}
                                placeholder={`Escribe tu respuesta para @${reply1.user_name}...`}
                                rows={2}
                                className="w-full bg-[#060608] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-red-500 resize-none"
                              />
                              <span className="absolute right-2.5 bottom-1.5 text-[10px] text-zinc-500 font-mono">
                                {inlineInputText.length}/500
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[10px] text-zinc-500">
                                {currentUser ? `Publicando como @${currentUser.displayName || 'usuario'}` : 'Publicando como invitado'}
                              </span>

                              <button
                                type="submit"
                                disabled={!inlineInputText.trim() || isSubmittingInline}
                                className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20"
                              >
                                {isSubmittingInline ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Enviando...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3 h-3" />
                                    <span>Responder</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Botón Ocultar / Mostrar respuestas hijas (Nivel 2) */}
                        {childReplies.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleExpandParent(reply1.id)}
                              className="text-[11px] font-bold text-red-400 hover:underline flex items-center gap-1 cursor-pointer py-1"
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
                              <div className="mt-2 space-y-2 pl-3 border-l-2 border-red-500/40">
                                {childReplies.map(reply2 => {
                                  const isAuthor2 = reply2.user_uid === effectiveUid;
                                  const isReplyingThis2 = inlineReplyState?.targetReplyId === reply2.id;

                                  return (
                                    <div 
                                      key={reply2.id}
                                      className="bg-[#16161f] border border-red-500/20 rounded-xl p-3 space-y-2"
                                    >
                                      <div className="flex items-center justify-between flex-wrap gap-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-bold text-white">
                                            {reply2.user_name}
                                          </span>

                                          {isAuthor2 && (
                                            <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/40 uppercase">
                                              Tú
                                            </span>
                                          )}

                                          {reply2.reply_to_user_name && (
                                            <span className="text-[10px] bg-red-500/10 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
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
                                          onClick={() => handleToggleInlineReply(reply2)}
                                          className={`flex items-center gap-1 font-semibold transition cursor-pointer ${
                                            isReplyingThis2 ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'
                                          }`}
                                        >
                                          <CornerDownRight className="w-3 h-3" />
                                          <span>{isReplyingThis2 ? 'Cerrar respuesta' : 'Responder'}</span>
                                        </button>

                                        {isAuthor2 && (
                                          <button
                                            type="button"
                                            onClick={() => promptDeleteReply(reply2.id)}
                                            className="text-zinc-500 hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
                                            title="Eliminar respuesta"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* CUADRO DE RESPUESTA EN LÍNEA PARA NIVEL 2 (JUSTO DEBAJO) */}
                                      {isReplyingThis2 && (
                                        <form onSubmit={handleInlineSubmit} className="mt-2.5 bg-[#0d0d12] border border-red-500/35 rounded-xl p-2.5 space-y-2 animate-in fade-in duration-150">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                                              <CornerDownRight className="w-3 h-3 text-red-500" />
                                              <span>Respondiendo a <strong className="text-red-400">@{reply2.user_name}</strong></span>
                                            </span>
                                            <button
                                              type="button"
                                              onClick={handleCancelInlineReply}
                                              className="text-[11px] text-zinc-400 hover:text-red-400 transition cursor-pointer font-medium"
                                            >
                                              Cancelar
                                            </button>
                                          </div>

                                          <div className="relative">
                                            <textarea
                                              autoFocus
                                              value={inlineInputText}
                                              onChange={e => setInlineInputText(e.target.value)}
                                              maxLength={500}
                                              placeholder={`Escribe tu respuesta para @${reply2.user_name}...`}
                                              rows={2}
                                              className="w-full bg-[#060608] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-red-500 resize-none"
                                            />
                                            <span className="absolute right-2.5 bottom-1.5 text-[10px] text-zinc-500 font-mono">
                                              {inlineInputText.length}/500
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between pt-0.5">
                                            <span className="text-[10px] text-zinc-500">
                                              {currentUser ? `Publicando como @${currentUser.displayName || 'usuario'}` : 'Publicando como invitado'}
                                            </span>

                                            <button
                                              type="submit"
                                              disabled={!inlineInputText.trim() || isSubmittingInline}
                                              className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20"
                                            >
                                              {isSubmittingInline ? (
                                                <>
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                  <span>Enviando...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Send className="w-3 h-3" />
                                                  <span>Responder</span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </form>
                                      )}
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirm}
        title={deleteConfirm?.title}
        message={deleteConfirm?.message}
        isDeleting={isDeletingItem}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeletingItem && setDeleteConfirm(null)}
      />
    </>
  );
};
