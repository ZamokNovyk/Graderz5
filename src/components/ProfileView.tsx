import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Crown, 
  ShieldCheck, 
  Mail, 
  Calendar, 
  UserCheck, 
  Edit2, 
  Check, 
  Copy, 
  Fingerprint,
  Save,
  AlertCircle,
  Loader2,
  XCircle,
  Globe,
  Sparkles,
  Heart,
  Flame,
  UserX,
  Compass,
  Star,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Info,
  ThumbsUp,
  ThumbsDown,
  Trash2
} from 'lucide-react';
import { User, updateProfile } from '../lib/firebase';
import { saveUserToSupabase, checkUsernameAvailability, getUserProfileDetails } from '../users/userService';
import { 
  getUserPreferences, 
  saveUserPreferences, 
  getUserAllActitudes, 
  getOrCreateGuestUid 
} from '../lib/actitudesService';
import { 
  getUserAllResenas, 
  getUserReactionsForStarposts, 
  toggleStarpostReaction,
  getRepliesCountsForStarposts,
  deleteResenaById
} from '../lib/resenasService';
import { StarpostRepliesModal } from './StarpostRepliesModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getPersonajesList } from '../lib/personajesService';
import { Personaje, PersonajeActitud, PersonajeResena, ActitudType, StarpostReactionType } from '../types';
import { ALL_COUNTRIES } from '../data/countries';
import { CountrySelect } from './CountrySelect';

type ProfileTab = 'informacion' | 'interacciones' | 'starspost';
type InteractionDivision = 'fan' | 'simp' | 'hater' | 'conozco';

interface ProfileViewProps {
  currentUser: User | null;
  onSignInGoogle: () => void;
  onSelectPersonaje?: (slug: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  currentUser, 
  onSignInGoogle,
  onSelectPersonaje 
}) => {
  // Main Tab Navigation
  const [activeTab, setActiveTab] = useState<ProfileTab>('informacion');

  // Interacciones Sub-division
  const [activeDivision, setActiveDivision] = useState<InteractionDivision>('fan');

  // Account information state
  const [usernameInput, setUsernameInput] = useState(currentUser?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Sexo y Nacionalidad states (Only 'masculino' or 'femenino')
  const [gender, setGender] = useState<'masculino' | 'femenino'>('masculino');
  const [nationality, setNationality] = useState<string>('España');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsSavedSuccess, setDetailsSavedSuccess] = useState(false);

  // Status for live username availability check
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<{ isAvailable: boolean | null; message: string | null }>({
    isAvailable: null,
    message: null,
  });

  // Interacciones & Starspost data state
  const [actitudes, setActitudes] = useState<PersonajeActitud[]>([]);
  const [resenas, setResenas] = useState<PersonajeResena[]>([]);
  const [userReactions, setUserReactions] = useState<Record<string, StarpostReactionType>>({});
  const [isTogglingReaction, setIsTogglingReaction] = useState<Record<string, boolean>>({});
  const [activeReplyStarpost, setActiveReplyStarpost] = useState<PersonajeResena | null>(null);
  const [repliesCountMap, setRepliesCountMap] = useState<Record<string, number>>({});
  const [personajesMap, setPersonajesMap] = useState<Record<string, Personaje>>({});
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [isLoadingResenas, setIsLoadingResenas] = useState(false);
  const [starpostToDelete, setStarpostToDelete] = useState<PersonajeResena | null>(null);
  const [isDeletingStarpost, setIsDeletingStarpost] = useState(false);

  const handleConfirmDeleteStarpost = async () => {
    if (!starpostToDelete) return;
    setIsDeletingStarpost(true);
    try {
      await deleteResenaById(starpostToDelete.id, starpostToDelete.personaje_slug);
      setResenas(prev => prev.filter(r => r.id !== starpostToDelete.id));
      setStarpostToDelete(null);
    } catch (err) {
      console.error('Error al eliminar Starpost:', err);
    } finally {
      setIsDeletingStarpost(false);
    }
  };

  const effectiveUid = currentUser?.uid || getOrCreateGuestUid();

  // Load account preferences & profile details
  useEffect(() => {
    const prefs = getUserPreferences();
    if (prefs.gender === 'femenino') {
      setGender('femenino');
    } else {
      setGender('masculino');
    }
    if (prefs.nationality && prefs.nationality !== 'No especificada') {
      setNationality(prefs.nationality);
    }

    if (currentUser?.uid) {
      setUsernameInput(currentUser.displayName || '');
      getUserProfileDetails(currentUser.uid).then(profile => {
        if (profile) {
          if (profile.gender === 'femenino') {
            setGender('femenino');
          } else {
            setGender('masculino');
          }
          if (profile.nationality && profile.nationality !== 'No especificada') {
            setNationality(profile.nationality);
          }
        }
      });
    }
  }, [currentUser]);

  // Load catalog of personajes to cross-reference with interactions & starsposts
  useEffect(() => {
    getPersonajesList().then(list => {
      const map: Record<string, Personaje> = {};
      list.forEach(p => {
        map[p.slug.toLowerCase()] = p;
      });
      setPersonajesMap(map);
    }).catch(err => {
      console.warn('Error al cargar personajes para el perfil:', err);
    });
  }, []);

  // Fetch user interactions (actitudes)
  useEffect(() => {
    if (!effectiveUid) return;
    setIsLoadingInteractions(true);
    getUserAllActitudes(effectiveUid)
      .then(list => {
        setActitudes(list);
      })
      .catch(err => {
        console.warn('Error al cargar actitudes del usuario:', err);
      })
      .finally(() => {
        setIsLoadingInteractions(false);
      });
  }, [effectiveUid, activeTab]);

  // Fetch user starsposts (reseñas)
  useEffect(() => {
    if (!effectiveUid) return;
    setIsLoadingResenas(true);
    getUserAllResenas(effectiveUid)
      .then(list => {
        setResenas(list);
        if (list.length > 0) {
          const ids = list.map(r => r.id);
          getUserReactionsForStarposts(effectiveUid, ids).then(map => {
            setUserReactions(map);
          }).catch(() => {});

          getRepliesCountsForStarposts(ids).then(map => {
            setRepliesCountMap(map);
          }).catch(() => {});
        }
      })
      .catch(err => {
        console.warn('Error al cargar reseñas del usuario:', err);
      })
      .finally(() => {
        setIsLoadingResenas(false);
      });
  }, [effectiveUid, activeTab]);

  // Check username availability live debounce
  useEffect(() => {
    if (!isEditingName || !currentUser) {
      setAvailability({ isAvailable: null, message: null });
      return;
    }

    const trimmed = usernameInput.trim();
    if (trimmed.length === 0) {
      setAvailability({ isAvailable: false, message: 'El nombre no puede estar vacío.' });
      return;
    }

    if (trimmed.length > 10) {
      setAvailability({ isAvailable: false, message: 'Máximo 10 caracteres permitidos.' });
      return;
    }

    if (trimmed.toLowerCase() === (currentUser.displayName || '').toLowerCase()) {
      setAvailability({ isAvailable: true, message: 'Tu nombre actual.' });
      return;
    }

    setIsCheckingAvailability(true);
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(trimmed, currentUser.uid);
      setAvailability({ isAvailable: res.isAvailable, message: res.message || (res.isAvailable ? '¡Nombre de usuario disponible!' : null) });
      setIsCheckingAvailability(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [usernameInput, isEditingName, currentUser]);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !usernameInput.trim()) return;

    setIsSavingName(true);
    const checkRes = await checkUsernameAvailability(usernameInput.trim(), currentUser.uid);
    if (!checkRes.isAvailable && usernameInput.trim().toLowerCase() !== (currentUser.displayName || '').trim().toLowerCase()) {
      setAvailability({ isAvailable: false, message: checkRes.message || 'Este nombre de usuario ya está ocupado.' });
      setIsSavingName(false);
      return;
    }

    try {
      await updateProfile(currentUser, {
        displayName: usernameInput.trim()
      });
      await saveUserToSupabase(currentUser, { gender, nationality });
      setSaveSuccess(true);
      setIsEditingName(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error al actualizar el nombre de usuario:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveDetails = async () => {
    setIsSavingDetails(true);
    saveUserPreferences({ gender, nationality });

    if (currentUser) {
      try {
        await saveUserToSupabase(currentUser, { gender, nationality });
      } catch (e) {
        console.warn('Error al guardar detalles en Supabase:', e);
      }
    }

    setDetailsSavedSuccess(true);
    setTimeout(() => setDetailsSavedSuccess(false), 3000);
    setIsSavingDetails(false);
  };

  const copyUidToClipboard = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleReactionToStarpost = async (starpostId: string, reaction: StarpostReactionType) => {
    if (isTogglingReaction[starpostId]) return;

    // Guardar estado previo para rollback en caso de error
    const prevReaction = userReactions[starpostId] || null;
    const currentResena = resenas.find(r => r.id === starpostId);
    const prevLikes = currentResena?.likes_count || 0;
    const prevDislikes = currentResena?.dislikes_count || 0;

    // Calcular actualización optimista (+1 / -1)
    let nextReaction: StarpostReactionType | null = null;
    let nextLikes = prevLikes;
    let nextDislikes = prevDislikes;

    if (prevReaction === reaction) {
      // Toggle off (quitar reacción)
      nextReaction = null;
      if (reaction === 'like') {
        nextLikes = Math.max(0, nextLikes - 1);
      } else {
        nextDislikes = Math.max(0, nextDislikes - 1);
      }
    } else if (prevReaction === null) {
      // Primera reacción
      nextReaction = reaction;
      if (reaction === 'like') {
        nextLikes = nextLikes + 1;
      } else {
        nextDislikes = nextDislikes + 1;
      }
    } else {
      // Cambio de like a dislike o de dislike a like
      nextReaction = reaction;
      if (reaction === 'like') {
        nextLikes = nextLikes + 1;
        nextDislikes = Math.max(0, nextDislikes - 1);
      } else {
        nextDislikes = nextDislikes + 1;
        nextLikes = Math.max(0, nextLikes - 1);
      }
    }

    // Actualización optimista inmediata
    setUserReactions(prev => {
      const copy = { ...prev };
      if (nextReaction === null) {
        delete copy[starpostId];
      } else {
        copy[starpostId] = nextReaction;
      }
      return copy;
    });

    setResenas(prevList => prevList.map(r => {
      if (r.id === starpostId) {
        return {
          ...r,
          likes_count: nextLikes,
          dislikes_count: nextDislikes
        };
      }
      return r;
    }));

    setIsTogglingReaction(prev => ({ ...prev, [starpostId]: true }));

    try {
      const res = await toggleStarpostReaction({
        starpostId,
        userUid: effectiveUid,
        reaction
      });

      setUserReactions(prev => {
        const copy = { ...prev };
        if (res.activeReaction === null) {
          delete copy[starpostId];
        } else {
          copy[starpostId] = res.activeReaction;
        }
        return copy;
      });

      setResenas(prevList => prevList.map(r => {
        if (r.id === starpostId) {
          return {
            ...r,
            likes_count: res.likesCount,
            dislikes_count: res.dislikesCount
          };
        }
        return r;
      }));
    } catch (err) {
      console.error('Error al reaccionar al Starpost en ProfileView:', err);
      // Revertir optimismo
      setUserReactions(prev => {
        const copy = { ...prev };
        if (prevReaction === null) {
          delete copy[starpostId];
        } else {
          copy[starpostId] = prevReaction;
        }
        return copy;
      });
      setResenas(prevList => prevList.map(r => {
        if (r.id === starpostId) {
          return {
            ...r,
            likes_count: prevLikes,
            dislikes_count: prevDislikes
          };
        }
        return r;
      }));
    } finally {
      setIsTogglingReaction(prev => ({ ...prev, [starpostId]: false }));
    }
  };

  const formatRegistrationDate = (creationTime?: string) => {
    if (!creationTime) return '17 de agosto de 2026';
    try {
      return new Date(creationTime).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '17 de agosto de 2026';
    }
  };

  const formatDateShort = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Filter attitudes by active division
  const filteredActitudes = actitudes.filter(a => a.actitud === activeDivision);

  const divisionMeta: Record<InteractionDivision, { label: string; icon: any; colorText: string; bgBadge: string; borderBadge: string; desc: string }> = {
    fan: {
      label: 'Fan',
      icon: Heart,
      colorText: 'text-rose-400',
      bgBadge: 'bg-rose-500/10',
      borderBadge: 'border-rose-500/30',
      desc: 'Personajes de los que eres fan declarado'
    },
    simp: {
      label: 'Simp',
      icon: Flame,
      colorText: 'text-red-500',
      bgBadge: 'bg-red-500/10',
      borderBadge: 'border-red-500/30',
      desc: 'Personajes con los que tienes una simpatía especial'
    },
    hater: {
      label: 'Hater',
      icon: UserX,
      colorText: 'text-amber-400',
      bgBadge: 'bg-amber-500/10',
      borderBadge: 'border-amber-500/30',
      desc: 'Personajes que no son de tu agrado'
    },
    conozco: {
      label: 'Conozco',
      icon: Compass,
      colorText: 'text-emerald-400',
      bgBadge: 'bg-emerald-500/10',
      borderBadge: 'border-emerald-500/30',
      desc: 'Personajes que conoces o has explorado'
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 pb-32 space-y-6">
      {/* Profile Header Card */}
      <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600 via-red-800 to-black p-0.5 shadow-xl shadow-red-950/70 flex items-center justify-center">
              <div className="w-full h-full bg-[#181820] rounded-2xl flex items-center justify-center text-white overflow-hidden">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Usuario'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-red-500" />
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border-2 border-[#121217]">
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-2xl font-bold text-white font-display">
                {currentUser ? (currentUser.displayName || usernameInput || 'Usuario de Graderz5') : 'Invitado Graderz5'}
              </h2>
              <span className="text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {currentUser ? 'Cuenta de Google Conectada' : 'Modo Local / Invitado'}
              </span>
            </div>
            
            <p className="text-xs text-zinc-400">
              {currentUser ? currentUser.email : 'Tus interacciones y starsposts se guardan en este dispositivo.'}
            </p>

            {!currentUser && (
              <button
                onClick={onSignInGoogle}
                className="mt-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-red-950/70 border border-red-400/30 transition-all cursor-pointer"
              >
                Unirse con Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Tabs: Información | Interacciones | Starspost */}
      {/* On mobile: Compact icon-only unless active (displays full label when selected). On desktop (sm+): Always full label */}
      <div className="bg-[#121217] border border-white/10 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-lg">
        <button
          id="profile-tab-informacion"
          onClick={() => setActiveTab('informacion')}
          title="Información"
          className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'informacion'
              ? 'flex-1 sm:flex-1 bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-500'
              : 'flex-initial sm:flex-1 text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span className={activeTab === 'informacion' ? 'inline' : 'hidden sm:inline'}>
            Información
          </span>
        </button>

        <button
          id="profile-tab-interacciones"
          onClick={() => setActiveTab('interacciones')}
          title="Interacciones"
          className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'interacciones'
              ? 'flex-1 sm:flex-1 bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-500'
              : 'flex-initial sm:flex-1 text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span className={activeTab === 'interacciones' ? 'inline' : 'hidden sm:inline'}>
            Interacciones
          </span>
        </button>

        <button
          id="profile-tab-starspost"
          onClick={() => setActiveTab('starspost')}
          title="Starspost"
          className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'starspost'
              ? 'flex-1 sm:flex-1 bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-500'
              : 'flex-initial sm:flex-1 text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Star className="w-4 h-4 shrink-0 fill-current" />
          <span className={activeTab === 'starspost' ? 'inline' : 'hidden sm:inline'}>
            Starspost
          </span>
        </button>
      </div>

      {/* TAB 1: INFORMACIÓN */}
      {activeTab === 'informacion' && (
        <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
              <UserCheck className="w-4 h-4 text-red-500" />
              <span>Información de la Cuenta</span>
            </h3>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Nombre actualizado correctamente
              </span>
            )}
          </div>

          {/* Form Group: Username / Edit Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                Nombre de Usuario (Único, Máx. 10 Caracteres)
              </span>
              {!isEditingName && currentUser && (
                <button
                  onClick={() => {
                    setIsEditingName(true);
                    setUsernameInput(currentUser.displayName || '');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-normal lowercase cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>editar</span>
                </button>
              )}
            </label>

            {isEditingName ? (
              <form onSubmit={handleSaveUsername} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Tu apodo único"
                    className="w-full bg-[#181820] border border-red-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-medium pr-10"
                    autoFocus
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    {isCheckingAvailability ? (
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    ) : availability.isAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : availability.isAvailable === false ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>

                {availability.message && (
                  <p className={`text-xs flex items-center gap-1.5 font-medium ${
                    availability.isAvailable ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {availability.isAvailable ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{availability.message}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingName || availability.isAvailable === false}
                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSavingName ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Guardar Nombre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setUsernameInput(currentUser?.displayName || '');
                    }}
                    className="bg-[#181820] hover:bg-[#22222d] border border-white/10 text-zinc-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="w-full bg-[#181820] border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-medium">
                {currentUser?.displayName || usernameInput || 'Invitado sin nombre'}
              </div>
            )}
          </div>

          {/* Group: Email */}
          {currentUser && (
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                Correo Electrónico
              </label>
              <div className="w-full bg-[#181820] border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-300 font-medium">
                {currentUser.email}
              </div>
            </div>
          )}

          {/* Group: Fecha de Registro */}
          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Fecha de Registro
            </label>
            <div className="w-full bg-[#181820] border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-300 font-medium">
              {formatRegistrationDate(currentUser?.metadata?.creationTime)}
            </div>
          </div>

          {/* Group: Sexo y Nacionalidad */}
          <div className="border-t border-white/5 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-red-500" />
                Datos de Votación (Sexo y Nacionalidad)
              </h4>
              {detailsSavedSuccess && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Preferencias guardadas
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Sexo
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'masculino' | 'femenino')}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 cursor-pointer"
                >
                  <option value="masculino">♂️ 👨 Masculino</option>
                  <option value="femenino">♀️ 👩 Femenino</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Nacionalidad (País)
                </label>
                <CountrySelect
                  value={nationality}
                  onChange={setNationality}
                />
              </div>
            </div>

            <button
              onClick={handleSaveDetails}
              disabled={isSavingDetails}
              className="w-full bg-[#181820] hover:bg-[#22222d] border border-white/10 text-zinc-200 hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isSavingDetails ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-3.5 h-3.5 text-red-500" />
              )}
              <span>Guardar Sexo y Nacionalidad</span>
            </button>
          </div>

          {/* Group: Identificador Único (UID) */}
          {currentUser && (
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-zinc-400" />
                  Identificador de Usuario (UID)
                </span>
                <button
                  onClick={copyUidToClipboard}
                  className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 font-normal lowercase cursor-pointer transition-colors"
                >
                  {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUid ? 'copiado' : 'copiar uid'}</span>
                </button>
              </label>
              <div className="w-full bg-[#181820] border border-white/5 rounded-xl px-4 py-3 text-xs text-red-400 font-mono break-all select-all">
                {currentUser.uid}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACCIONES (4 Divisiones: Fan, Simp, Hater, Conozco) */}
      {activeTab === 'interacciones' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub-divisions Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['fan', 'simp', 'hater', 'conozco'] as InteractionDivision[]).map((div) => {
              const meta = divisionMeta[div];
              const IconComp = meta.icon;
              const isSelected = activeDivision === div;
              const count = actitudes.filter(a => a.actitud === div).length;

              return (
                <button
                  key={div}
                  onClick={() => setActiveDivision(div)}
                  className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#181822] border-red-500/70 shadow-lg shadow-red-950/40'
                      : 'bg-[#121217] border-white/5 hover:border-white/15 hover:bg-[#15151c]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <IconComp className={`w-4 h-4 ${meta.colorText}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                      {meta.label}
                    </span>
                  </div>
                  <span className={`text-lg font-black font-display ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                    {count}
                  </span>
                  {isSelected && (
                    <div className="absolute -bottom-1 w-8 h-1 bg-red-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content: List of interacted personajes */}
          {isLoadingInteractions ? (
            <div className="bg-[#121217] border border-white/10 rounded-2xl p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Cargando interacciones...</p>
            </div>
          ) : filteredActitudes.length === 0 ? (
            <div className="bg-[#121217] border border-white/10 rounded-2xl p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-zinc-800/40 rounded-full flex items-center justify-center mx-auto text-zinc-500">
                {React.createElement(divisionMeta[activeDivision].icon, { className: "w-7 h-7" })}
              </div>
              <h4 className="text-base font-bold text-white">
                No tienes personajes marcados como {divisionMeta[activeDivision].label}
              </h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Explora perfiles en Graderz5 y marca tu actitud ({divisionMeta[activeDivision].label}) para seguir el rastro desde tu perfil.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredActitudes.map((act) => {
                const personaje = personajesMap[act.personaje_slug.toLowerCase()];
                const displayName = personaje?.nombre || act.personaje_slug.replace(/\./g, ' ');
                const imageUrl = personaje?.image_url || '/placeholder.jpg';
                const occupation = personaje?.occupation?.split(',')[0] || 'Figura pública';
                const rating = personaje?.rating ?? 0;

                return (
                  <div
                    key={act.id}
                    onClick={() => onSelectPersonaje && onSelectPersonaje(act.personaje_slug)}
                    className="bg-[#121217] hover:bg-[#181822] border border-white/10 hover:border-red-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 group shadow-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-800">
                        <img
                          src={imageUrl}
                          alt={displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback image if broken
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate capitalize">
                          {displayName}
                        </h5>
                        <p className="text-xs text-zinc-400 truncate">
                          {occupation}
                        </p>
                        {rating > 0 && (
                          <div className="flex items-center gap-1 pt-1">
                            <Star className="w-3 h-3 text-red-500 fill-red-500" />
                            <span className="text-[11px] font-bold text-white">{rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${divisionMeta[activeDivision].bgBadge} ${divisionMeta[activeDivision].colorText} ${divisionMeta[activeDivision].borderBadge}`}>
                        {divisionMeta[activeDivision].label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STARSPOST (Calificaciones con estrellas dejadas por el usuario) */}
      {activeTab === 'starspost' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-red-500 fill-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                  Mis Starsposts & Calificaciones
                </h4>
                <p className="text-xs text-zinc-400">
                  Historial de estrellas y opiniones que has dejado en perfiles de personajes
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
              {resenas.length} publicaciones
            </span>
          </div>

          {/* List of Starsposts */}
          {isLoadingResenas ? (
            <div className="bg-[#121217] border border-white/10 rounded-2xl p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Cargando Starsposts...</p>
            </div>
          ) : resenas.length === 0 ? (
            <div className="bg-[#121217] border border-white/10 rounded-2xl p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-zinc-800/40 rounded-full flex items-center justify-center mx-auto text-zinc-500">
                <Star className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">
                Aún no has publicado ningún Starspost
              </h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Ingresa al perfil de cualquier personaje para calificarlo con estrellas y dejar tu reseña. Aparecerán listadas aquí con indicación directa de su perfil.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {resenas.map((resena) => {
                const personaje = personajesMap[resena.personaje_slug.toLowerCase()];
                const displayName = resena.personaje_nombre || personaje?.nombre || resena.personaje_slug.replace(/\./g, ' ');
                const imageUrl = personaje?.image_url;

                return (
                  <div
                    key={resena.id}
                    className="bg-[#121217] border border-white/10 rounded-2xl p-5 space-y-3.5 hover:border-white/20 transition-all shadow-lg"
                  >
                    {/* Top Row: Target Personaje and Navigation Link */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div 
                        onClick={() => onSelectPersonaje && onSelectPersonaje(resena.personaje_slug)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-800">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={displayName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-red-500 font-bold">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors uppercase">
                            {displayName}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-400 transition-colors" />
                        </div>
                      </div>

                      {/* Date and Delete Button */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {formatDateShort(resena.created_at)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStarpostToDelete(resena)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition cursor-pointer"
                          title="Eliminar este Starpost"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Stars Rating (SOLO ESTRELLAS EN AMARILLO) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              resena.stars >= star
                                ? 'text-[#ffbf00] fill-[#ffbf00]'
                                : 'text-zinc-700'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-bold text-white ml-2">
                          {resena.stars} de 5 estrellas
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Review text if provided */}
                    {resena.review_text ? (
                      <div className="bg-[#181820] border border-white/5 rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed font-normal">
                        "{resena.review_text}"
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 italic">
                        Calificación sin comentario escrito adicional.
                      </p>
                    )}

                    {/* Reaction Bar & Replies */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      {/* BOTÓN RESPUESTAS / CONVERSACIÓN */}
                      <button
                        type="button"
                        onClick={() => setActiveReplyStarpost(resena)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition cursor-pointer"
                        title="Ver respuestas a este Starpost"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {repliesCountMap[resena.id] !== undefined
                            ? repliesCountMap[resena.id] === 0
                              ? 'Respuestas'
                              : `${repliesCountMap[resena.id]} ${repliesCountMap[resena.id] === 1 ? 'respuesta' : 'respuestas'}`
                            : (resena.replies_count || 0) > 0
                              ? `${resena.replies_count} ${resena.replies_count === 1 ? 'respuesta' : 'respuestas'}`
                              : 'Respuestas'}
                        </span>
                      </button>

                      <div className="flex items-center gap-2">
                        {/* LIKE BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleReactionToStarpost(resena.id, 'like')}
                          disabled={isTogglingReaction[resena.id]}
                          title={userReactions[resena.id] === 'like' ? 'Quitar Me gusta' : 'Me gusta'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            userReactions[resena.id] === 'like'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                          } ${isTogglingReaction[resena.id] ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <ThumbsUp 
                            className={`w-3.5 h-3.5 transition-transform ${
                              userReactions[resena.id] === 'like' ? 'fill-emerald-400 scale-110' : ''
                            }`} 
                          />
                          <span className="font-mono text-xs">{resena.likes_count ?? 0}</span>
                        </button>

                        {/* DISLIKE BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleReactionToStarpost(resena.id, 'dislike')}
                          disabled={isTogglingReaction[resena.id]}
                          title={userReactions[resena.id] === 'dislike' ? 'Quitar No me gusta' : 'No me gusta'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            userReactions[resena.id] === 'dislike'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-xs'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                          } ${isTogglingReaction[resena.id] ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <ThumbsDown 
                            className={`w-3.5 h-3.5 transition-transform ${
                              userReactions[resena.id] === 'dislike' ? 'fill-rose-400 scale-110' : ''
                            }`} 
                          />
                          <span className="font-mono text-xs">{resena.dislikes_count ?? 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE RESPUESTAS A STARPOSTS */}
      {activeReplyStarpost && (
        <StarpostRepliesModal
          starpost={activeReplyStarpost}
          onClose={() => setActiveReplyStarpost(null)}
          currentUser={currentUser}
          guestUserData={{
            alias: usernameInput || undefined,
            gender: gender || undefined,
            nationality: nationality || undefined
          }}
          onRepliesCountChange={(starpostId, newCount) => {
            setRepliesCountMap(prev => ({ ...prev, [starpostId]: newCount }));
            setResenas(prev => prev.map(r => r.id === starpostId ? { ...r, replies_count: newCount } : r));
          }}
          onStarpostDeleted={(deletedId) => {
            setResenas(prev => prev.filter(r => r.id !== deletedId));
            setActiveReplyStarpost(null);
          }}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE STARPOST */}
      <ConfirmDeleteModal
        isOpen={!!starpostToDelete}
        title="¿Eliminar tu Starpost?"
        message="¿Estás seguro de que deseas eliminar tu Starpost? Se eliminará definitivamente de la base de datos junto con todas sus respuestas y reacciones asociadas."
        isDeleting={isDeletingStarpost}
        onConfirm={handleConfirmDeleteStarpost}
        onClose={() => !isDeletingStarpost && setStarpostToDelete(null)}
      />
    </div>
  );
};
