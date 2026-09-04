import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Users, 
  Heart, 
  BookOpen, 
  MessageSquare, 
  Flame, 
  BarChart3, 
  ExternalLink, 
  Calendar, 
  Fingerprint, 
  Clock, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Globe,
  Sparkles,
  Info,
  TrendingUp,
  UserCheck,
  Skull,
  MapPin,
  Ruler,
  Weight,
  HeartCrack,
  Briefcase,
  Trash2,
  User as UserIcon
} from 'lucide-react';
import { ActitudType, Personaje, PersonajeResena } from '../types';
import { User } from '../lib/firebase';
import { getPersonajeBySlug, votePersonaje, getPersonajesList } from '../lib/personajesService';
import { 
  getOrCreateGuestUid, 
  getUserPreferences, 
  getUserActitudForPersonaje, 
  togglePersonajeActitud,
  getRealActitudCounts
} from '../lib/actitudesService';
import { 
  getResenasForPersonaje, 
  getUserResenaForPersonaje, 
  saveResena, 
  deleteResena 
} from '../lib/resenasService';
import { getCountryFlag } from '../data/countries';
import { FlagImage } from './FlagImage';

interface PersonajeProfileViewProps {
  slug: string;
  onBack: () => void;
  currentUser?: User | null;
}

export const PersonajeProfileView: React.FC<PersonajeProfileViewProps> = ({ slug, onBack, currentUser }) => {
  const [personaje, setPersonaje] = useState<Personaje | null>(null);
  const [personajesList, setPersonajesList] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  
  // Interactive Tabs
  const [activeTab, setActiveTab] = useState<'informacion' | 'resenas' | 'crushes' | 'ship' | 'estadistica'>('informacion');

  // Rating and voting state
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  
  // Reviews state
  const [resenasList, setResenasList] = useState<PersonajeResena[]>([]);
  const [userReviewText, setUserReviewText] = useState('');
  const [isSubmittingResena, setIsSubmittingResena] = useState(false);

  // Ship Calculator State
  const [shipTargetSlug, setShipTargetSlug] = useState<string>('');
  const [shipResult, setShipResult] = useState<{ percentage: number; text: string } | null>(null);

  // 4 Attitude Metrics States (Single-Choice: Only 1 option active per user)
  const [activeActitud, setActiveActitud] = useState<ActitudType | null>(null);
  const [isTogglingActitud, setIsTogglingActitud] = useState(false);
  const [counts, setCounts] = useState({
    conozco: 0,
    fan: 0,
    simp: 0,
    hater: 0,
  });

  // Crushes State (tied visually)
  const [crushCount, setCrushCount] = useState<number>(0);
  const [hasCrushed, setHasCrushed] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getPersonajeBySlug(slug);
      setPersonaje(data);

      // Load other characters for ship calculator
      const list = await getPersonajesList();
      setPersonajesList(list.filter(p => p.slug !== slug));

      // Get user's effective UID
      const effectiveUid = currentUser?.uid || getOrCreateGuestUid();

      // Check user's saved attitude for this character
      const userActitud = await getUserActitudForPersonaje(slug, effectiveUid);
      setActiveActitud(userActitud);

      // Initialize counters directly and strictly from real database records (no fake/invented counts)
      const realCounts = await getRealActitudCounts(slug);
      setCounts({
        conozco: realCounts.conozco,
        fan: realCounts.fan,
        simp: realCounts.simp,
        hater: realCounts.hater
      });

      // Load reviews and user's review status
      try {
        const reviews = await getResenasForPersonaje(slug);
        setResenasList(reviews);

        const userReview = reviews.find(r => r.user_uid === effectiveUid);
        if (userReview) {
          setUserRating(userReview.stars);
          setVoteSubmitted(true);
          setUserReviewText(userReview.review_text || '');
        } else {
          setUserRating(null);
          setVoteSubmitted(false);
          setUserReviewText('');
        }
      } catch (err) {
        console.warn('Error al cargar reseñas:', err);
      }

      setLoading(false);
    }
    loadData();
  }, [slug, currentUser]);

  const handleSelectActitud = async (target: ActitudType) => {
    if (isTogglingActitud || !personaje) return;
    setIsTogglingActitud(true);

    const prevActitud = activeActitud;
    let nextConozco = counts.conozco;
    let nextFan = counts.fan;
    let nextSimp = counts.simp;
    let nextHater = counts.hater;

    // Optimistic calculation for instant UI feedback
    if (prevActitud === target) {
      // Unselecting (decrements and removes)
      if (target === 'conozco') nextConozco = Math.max(0, nextConozco - 1);
      if (target === 'fan') nextFan = Math.max(0, nextFan - 1);
      if (target === 'simp') nextSimp = Math.max(0, nextSimp - 1);
      if (target === 'hater') nextHater = Math.max(0, nextHater - 1);
      setActiveActitud(null);
    } else {
      // Switching: decrement previous if any
      if (prevActitud === 'conozco') nextConozco = Math.max(0, nextConozco - 1);
      if (prevActitud === 'fan') nextFan = Math.max(0, nextFan - 1);
      if (prevActitud === 'simp') nextSimp = Math.max(0, nextSimp - 1);
      if (prevActitud === 'hater') nextHater = Math.max(0, nextHater - 1);

      // Increment target
      if (target === 'conozco') nextConozco += 1;
      if (target === 'fan') nextFan += 1;
      if (target === 'simp') nextSimp += 1;
      if (target === 'hater') nextHater += 1;
      setActiveActitud(target);
    }

    setCounts({
      conozco: nextConozco,
      fan: nextFan,
      simp: nextSimp,
      hater: nextHater
    });

    try {
      const effectiveUid = currentUser?.uid || getOrCreateGuestUid();
      const isAnon = !currentUser;
      const userName = currentUser?.displayName || currentUser?.email || 'Usuario Invitado';
      const userPrefs = getUserPreferences();

      const res = await togglePersonajeActitud({
        personajeSlug: personaje.slug,
        targetActitud: target,
        userInfo: {
          uid: effectiveUid,
          name: userName,
          isAnonymous: isAnon,
          gender: userPrefs.gender,
          nationality: userPrefs.nationality
        },
        personajeInfo: {
          gender: personaje.gender,
          nationality: personaje.nationality
        }
      });

      setActiveActitud(res.activeActitud);
      setCounts(res.counts);
    } catch (err) {
      console.error('Error al registrar actitud en base de datos:', err);
    } finally {
      setIsTogglingActitud(false);
    }
  };

  const handleVote = (score: number) => {
    if (voteSubmitted || !personaje) return;
    setUserRating(score);
  };

  const handleSubmitResena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaje || isSubmittingResena || userRating === null) return;

    setIsSubmittingResena(true);
    const effectiveUid = currentUser?.uid || getOrCreateGuestUid();
    const userPrefs = getUserPreferences();

    try {
      const res = await saveResena({
        personajeSlug: personaje.slug,
        personajeNombre: personaje.nombre,
        userUid: effectiveUid,
        userName: currentUser?.displayName || currentUser?.email || 'Usuario Invitado',
        userGender: userPrefs.gender,
        userNationality: userPrefs.nationality,
        isAnonymous: !currentUser,
        registeredWith: currentUser ? 'google' : 'anonymous',
        reviewText: userReviewText,
        stars: userRating
      });

      if (res.success) {
        const updatedChar = await getPersonajeBySlug(personaje.slug);
        if (updatedChar) {
          setPersonaje(updatedChar);
        }

        const reviews = await getResenasForPersonaje(personaje.slug);
        setResenasList(reviews);
        setVoteSubmitted(true);
      }
    } catch (err) {
      console.error('Error al guardar reseña:', err);
    } finally {
      setIsSubmittingResena(false);
    }
  };

  const handleDeleteResena = async () => {
    if (!personaje || isSubmittingResena) return;
    setIsSubmittingResena(true);
    const effectiveUid = currentUser?.uid || getOrCreateGuestUid();

    try {
      const success = await deleteResena(personaje.slug, effectiveUid);
      if (success) {
        const updatedChar = await getPersonajeBySlug(personaje.slug);
        if (updatedChar) {
          setPersonaje(updatedChar);
        }

        const reviews = await getResenasForPersonaje(personaje.slug);
        setResenasList(reviews);

        setUserRating(null);
        setVoteSubmitted(false);
        setUserReviewText('');
      }
    } catch (err) {
      console.error('Error al eliminar reseña:', err);
    } finally {
      setIsSubmittingResena(false);
    }
  };

  const copyProfileUrl = () => {
    const fullUrl = `${window.location.origin}/personajes/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCreatorUid = () => {
    if (personaje?.creator_uid) {
      navigator.clipboard.writeText(personaje.creator_uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const formatCreationDateTime = (isoDate?: string) => {
    if (!isoDate) return 'Recientemente';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      const datePart = d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const timePart = d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${datePart} a las ${timePart}`;
    } catch {
      return isoDate;
    }
  };

  // Get exact star rating distribution directly from database counter columns or memory reviews
  const getVoteDistribution = (p: Personaje) => {
    if (!p.votes_count || p.votes_count <= 0) return [0, 0, 0, 0, 0];

    // 1. Si el personaje ya tiene los contadores persistentes en la base de datos (rendimiento óptimo O(1))
    if (
      p.stars_1 !== undefined ||
      p.stars_2 !== undefined ||
      p.stars_3 !== undefined ||
      p.stars_4 !== undefined ||
      p.stars_5 !== undefined
    ) {
      const dbDist = [
        p.stars_5 || 0,
        p.stars_4 || 0,
        p.stars_3 || 0,
        p.stars_2 || 0,
        p.stars_1 || 0
      ];
      if (dbDist.some(count => count > 0)) {
        return dbDist;
      }
    }

    // 2. Si tenemos la lista de reseñas cargada en memoria
    if (resenasList.length > 0) {
      const distribution = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1 estrellas
      resenasList.forEach(r => {
        const starIdx = 5 - r.stars;
        if (starIdx >= 0 && starIdx < 5) {
          distribution[starIdx]++;
        }
      });
      return distribution;
    }

    return [0, 0, 0, 0, 0];
  };

  const handleCalculateShip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipTargetSlug || !personaje) return;

    const target = personajesList.find(p => p.slug === shipTargetSlug);
    if (!target) return;

    // Calculate a deterministic percentage based on the names of both characters
    const combinedString = (personaje.nombre + target.nombre).toLowerCase();
    let sum = 0;
    for (let i = 0; i < combinedString.length; i++) {
      sum += combinedString.charCodeAt(i);
    }
    const percentage = 45 + (sum % 51); // Returns a value between 45% and 95%

    let affinityText = '';
    if (percentage >= 85) {
      affinityText = '¡Afinidad Legendaria! Son el uno para el otro según el algoritmo de Graderz5.';
    } else if (percentage >= 70) {
      affinityText = 'Excelente química. Tienen una gran compatibilidad de estrellas.';
    } else if (percentage >= 55) {
      affinityText = 'Compatibilidad moderada. Hay potencial, pero requerirá algo de esfuerzo.';
    } else {
      affinityText = 'Afinidad baja. Es posible que sus órbitas no estén del todo sincronizadas.';
    }

    setShipResult({ percentage, text: affinityText });
  };

  const handleRegisterCrush = () => {
    if (hasCrushed) {
      setCrushCount(prev => prev - 1);
      setHasCrushed(false);
    } else {
      setCrushCount(prev => prev + 1);
      setHasCrushed(true);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
        <p className="text-zinc-400 text-sm">Cargando perfil del personaje...</p>
      </div>
    );
  }

  if (!personaje) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/20 text-red-500 mx-auto flex items-center justify-center">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Personaje no encontrado</h2>
        <p className="text-zinc-400 text-sm">
          No se encontró ningún personaje con el identificador <code className="text-red-400">/personajes/{slug}</code>.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Volver a Graderz5
        </button>
      </div>
    );
  }

  const profileUrl = `${window.location.origin}/personajes/${personaje.slug}`;
  const voteDist = getVoteDistribution(personaje);
  const firstLetter = personaje.nombre.trim().charAt(0).toUpperCase();

  // Adapting the layout beautifully according to Starryz5 UI / image.png:
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-32 space-y-8">
      
      {/* Top Navigation bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white bg-[#101015] hover:bg-[#181822] border border-white/5 px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-red-500" />
          <span>Volver al buscador</span>
        </button>

        <button
          onClick={copyProfileUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-[#101015] hover:bg-[#181822] border border-white/5 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-red-500" />}
          <span>{copiedLink ? '¡Enlace copiado!' : 'Compartir perfil'}</span>
        </button>
      </div>

      {/* Main Avatar & Title Area (Centered, identical to mock) */}
      <div className="flex flex-col items-center text-center space-y-4">
        
        {/* Rounded Center Avatar Container with small badge and mourning ribbon */}
        <div className="relative group">
          <div 
            onClick={() => personaje.image_url && setIsImageLightboxOpen(true)}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#14141a] border-4 ${personaje.death_date ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'border-white/10'} overflow-hidden flex items-center justify-center shadow-xl relative transition-all duration-300 hover:scale-105 active:scale-95 ${personaje.image_url ? 'cursor-pointer hover:border-[#ffbf00]' : ''}`}
            title={personaje.image_url ? "Ver foto de perfil ampliada" : undefined}
          >
            {personaje.image_url ? (
              <>
                <img
                  src={personaje.image_url}
                  alt={personaje.nombre}
                  className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${personaje.death_date ? 'grayscale-[20%] brightness-95' : ''}`}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/60 px-2 py-1 rounded-md border border-white/10">Ver foto</span>
                </div>
              </>
            ) : (
              <span className="text-white text-4xl sm:text-5xl font-black font-display tracking-wider">
                {firstLetter}
              </span>
            )}

            {/* Cinta Roja de Luto / Conmemoración sobre la foto */}
            {personaje.death_date && (
              <div 
                title="En memoria (Personaje fallecido)"
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red-950 via-red-900/80 to-transparent pt-3 pb-1 flex items-center justify-center border-t border-red-500/40 z-10"
              >
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white font-mono">
                  <span className="text-red-400">🎗️</span>
                  <span className="text-red-100 font-bold">En Memoria</span>
                </div>
              </div>
            )}
          </div>

          {/* Yellow Rating Badge at the bottom right */}
          <div className="absolute bottom-0 right-1 bg-[#ffbf00] text-black font-extrabold text-xs px-2.5 py-0.5 rounded-full border-2 border-[#08080a] shadow-md z-10">
            {personaje.rating.toFixed(1)}
          </div>

          {/* Cinta Roja de Luto Flotante */}
          {personaje.death_date && (
            <div 
              title={`Falleció: ${personaje.death_date}`}
              className="absolute -top-2 -left-2 bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-400/60 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] flex items-center gap-1.5 z-10 font-mono cursor-default"
            >
              <span>🎗️</span>
              <span className="text-[9px] uppercase tracking-widest text-white font-black">LUTO</span>
            </div>
          )}
        </div>

        {/* Character Name & Role Pill */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-display uppercase tracking-wide">
            {personaje.nombre}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-[#141419] border border-white/5 px-3.5 py-1 rounded-full font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Persona Verificada Q5</span>
            </div>

            {personaje.death_date && (
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-red-200 bg-red-950/50 border border-red-500/40 px-3.5 py-1 rounded-full font-mono shadow-[0_0_12px_rgba(220,38,38,0.25)]">
                <HeartCrack className="w-3.5 h-3.5 text-red-400" />
                <span>Fallecido ({personaje.death_date})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards (Four interactive modules: Yo te conozco, Fan, Simp, Hater) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {/* YO TE CONOZCO (Votes Card) */}
        <button
          onClick={() => handleSelectActitud('conozco')}
          disabled={isTogglingActitud}
          title={activeActitud === 'conozco' ? 'Haz clic para desmarcar' : 'Marcar que conoces a este personaje'}
          className={`border rounded-2xl p-4 sm:p-5 text-center space-y-2 active:scale-98 transition-all flex flex-col items-center justify-center w-full cursor-pointer relative overflow-hidden ${
            activeActitud === 'conozco' 
              ? 'bg-blue-950/40 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.35)] ring-1 ring-blue-500/50' 
              : 'bg-[#111116] border-white/5 hover:border-blue-500/40 hover:bg-[#15151c]'
          }`}
        >
          <div className="relative">
            <Users className={`w-5 h-5 transition-transform duration-200 ${
              activeActitud === 'conozco' ? 'text-blue-400 scale-125' : 'text-blue-400/70'
            }`} />
            {activeActitud === 'conozco' && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {counts.conozco}
          </div>
          <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${
            activeActitud === 'conozco' ? 'text-blue-300 font-extrabold' : 'text-zinc-400'
          }`}>
            Yo te conozco
          </div>
          {activeActitud === 'conozco' && (
            <span className="text-[9px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-semibold border border-blue-500/20">
              ✓ Marcado
            </span>
          )}
        </button>

        {/* FAN (Heart Rating Card) */}
        <button
          onClick={() => handleSelectActitud('fan')}
          disabled={isTogglingActitud}
          title={activeActitud === 'fan' ? 'Haz clic para desmarcar' : 'Marcar como Fan'}
          className={`border rounded-2xl p-4 sm:p-5 text-center space-y-2 active:scale-98 transition-all flex flex-col items-center justify-center w-full cursor-pointer relative overflow-hidden ${
            activeActitud === 'fan' 
              ? 'bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)] ring-1 ring-red-500/50' 
              : 'bg-[#111116] border-white/5 hover:border-red-500/40 hover:bg-[#15151c]'
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 transition-transform duration-200 ${
              activeActitud === 'fan' ? 'fill-red-500 text-red-500 scale-125' : 'text-red-500'
            }`} />
            {activeActitud === 'fan' && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {counts.fan}
          </div>
          <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${
            activeActitud === 'fan' ? 'text-red-300 font-extrabold' : 'text-zinc-400'
          }`}>
            Fan
          </div>
          {activeActitud === 'fan' && (
            <span className="text-[9px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-semibold border border-red-500/20">
              ✓ Marcado
            </span>
          )}
        </button>

        {/* SIMP (Flame/Sparks Rating Card) */}
        <button
          onClick={() => handleSelectActitud('simp')}
          disabled={isTogglingActitud}
          title={activeActitud === 'simp' ? 'Haz clic para desmarcar' : 'Marcar como Simp'}
          className={`border rounded-2xl p-4 sm:p-5 text-center space-y-2 active:scale-98 transition-all flex flex-col items-center justify-center w-full cursor-pointer relative overflow-hidden ${
            activeActitud === 'simp' 
              ? 'bg-orange-950/40 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.35)] ring-1 ring-orange-500/50' 
              : 'bg-[#111116] border-white/5 hover:border-orange-500/40 hover:bg-[#15151c]'
          }`}
        >
          <div className="relative">
            <Flame className={`w-5 h-5 transition-transform duration-200 ${
              activeActitud === 'simp' ? 'fill-orange-500 text-orange-500 scale-125' : 'text-orange-500'
            }`} />
            {activeActitud === 'simp' && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-orange-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {counts.simp}
          </div>
          <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${
            activeActitud === 'simp' ? 'text-orange-300 font-extrabold' : 'text-zinc-400'
          }`}>
            Simp
          </div>
          {activeActitud === 'simp' && (
            <span className="text-[9px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-semibold border border-orange-500/20">
              ✓ Marcado
            </span>
          )}
        </button>

        {/* HATER (Skull Rating Card) */}
        <button
          onClick={() => handleSelectActitud('hater')}
          disabled={isTogglingActitud}
          title={activeActitud === 'hater' ? 'Haz clic para desmarcar' : 'Marcar como Hater'}
          className={`border rounded-2xl p-4 sm:p-5 text-center space-y-2 active:scale-98 transition-all flex flex-col items-center justify-center w-full cursor-pointer relative overflow-hidden ${
            activeActitud === 'hater' 
              ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-1 ring-purple-500/50' 
              : 'bg-[#111116] border-white/5 hover:border-purple-500/40 hover:bg-[#15151c]'
          }`}
        >
          <div className="relative">
            <Skull className={`w-5 h-5 transition-transform duration-200 ${
              activeActitud === 'hater' ? 'text-purple-400 scale-125' : 'text-purple-400/70'
            }`} />
            {activeActitud === 'hater' && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {counts.hater}
          </div>
          <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${
            activeActitud === 'hater' ? 'text-purple-300 font-extrabold' : 'text-zinc-400'
          }`}>
            Hater
          </div>
          {activeActitud === 'hater' && (
            <span className="text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-semibold border border-purple-500/20">
              ✓ Marcado
            </span>
          )}
        </button>
      </div>

      {/* Tabs Container (Interactive premium bar, similar to mock) */}
      <div className="bg-[#0e0e13] border border-white/5 rounded-2xl p-1 flex overflow-x-auto gap-1 scrollbar-none max-w-2xl mx-auto">
        <button
          onClick={() => setActiveTab('informacion')}
          className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'informacion'
              ? 'text-[#ffbf00] bg-white/5 border border-white/10 shadow-inner'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Información</span>
        </button>

        <button
          onClick={() => setActiveTab('resenas')}
          className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'resenas'
              ? 'text-[#ffbf00] bg-white/5 border border-white/10 shadow-inner'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Reseñas</span>
        </button>

        <button
          onClick={() => setActiveTab('crushes')}
          className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'crushes'
              ? 'text-[#ffbf00] bg-white/5 border border-white/10 shadow-inner'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Crushes</span>
        </button>

        <button
          onClick={() => setActiveTab('ship')}
          className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'ship'
              ? 'text-[#ffbf00] bg-white/5 border border-white/10 shadow-inner'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Ship</span>
        </button>

        <button
          onClick={() => setActiveTab('estadistica')}
          className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'estadistica'
              ? 'text-[#ffbf00] bg-white/5 border border-white/10 shadow-inner'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Estadística</span>
        </button>
      </div>

      {/* Dynamic Tab Content Area */}
      <div className="max-w-2xl mx-auto w-full transition-all duration-300">
        
        {/* 1. INFORMACIÓN TAB (Extract, details, wiki url, supabase registration metadata) */}
        {activeTab === 'informacion' && (
          <div className="space-y-6">
            
            {/* Bio box */}
            <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Info className="w-4 h-4 text-[#ffbf00]" />
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">
                  Biografía de Wikipedia
                </h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {personaje.extract || 'Figura pública validada mediante los registros oficiales de Wikipedia y Wikidata.'}
              </p>
              {personaje.wikipedia_url && (
                <div className="pt-2">
                  <a
                    href={personaje.wikipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#ffbf00] hover:text-yellow-400 transition"
                  >
                    <span>Ver artículo completo en Wikipedia</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Registration Database metadata grid */}
            <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Fingerprint className="w-4 h-4 text-[#ffbf00]" />
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">
                  Registro Técnico en Supabase
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Creation date */}
                <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1">
                  <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#ffbf00]" />
                    <span>Fecha de registro</span>
                  </div>
                  <div className="text-zinc-200 font-semibold">
                    {formatCreationDateTime(personaje.created_at)}
                  </div>
                </div>

                {/* Birth date */}
                {personaje.birth_date && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#ffbf00]" />
                      <span>Nacimiento</span>
                    </div>
                    <div className="text-zinc-200 font-semibold">
                      {personaje.birth_date}
                    </div>
                  </div>
                )}

                {/* Death date with black ribbon indicator */}
                {personaje.death_date && (
                  <div className="bg-black/60 border border-zinc-700/80 p-3 rounded-xl space-y-1 relative overflow-hidden">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <HeartCrack className="w-3 h-3 text-red-400" />
                      <span>Fallecimiento</span>
                      <span className="ml-auto text-[9px] text-zinc-300 font-mono bg-zinc-800 px-1.5 py-0.2 rounded">🎗️ Luto</span>
                    </div>
                    <div className="text-zinc-100 font-semibold">
                      {personaje.death_date}
                    </div>
                  </div>
                )}

                {/* Place of Birth */}
                {personaje.birth_place && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#ffbf00]" />
                      <span>Lugar de Nacimiento</span>
                    </div>
                    <div className="text-zinc-200 font-semibold">
                      {personaje.birth_place}
                    </div>
                  </div>
                )}

                {/* Height */}
                {personaje.height && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-[#ffbf00]" />
                      <span>Estatura</span>
                    </div>
                    <div className="text-zinc-200 font-semibold">
                      {personaje.height}
                    </div>
                  </div>
                )}

                {/* Weight */}
                {personaje.weight && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Weight className="w-3 h-3 text-[#ffbf00]" />
                      <span>Peso</span>
                    </div>
                    <div className="text-zinc-200 font-semibold">
                      {personaje.weight}
                    </div>
                  </div>
                )}

                {/* Gender */}
                {personaje.gender && personaje.gender !== 'no_especificado' && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#ffbf00]" />
                      <span>Sexo / Género</span>
                    </div>
                    <div className="text-zinc-200 font-semibold flex items-center gap-1">
                      <span>{personaje.gender.toLowerCase().includes('masc') ? '♂️' : personaje.gender.toLowerCase().includes('fem') ? '♀️' : '⚧️'}</span>
                      <span>{personaje.gender}</span>
                    </div>
                  </div>
                )}

                {/* Nationality */}
                {personaje.nationality && personaje.nationality !== 'No especificada' && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#ffbf00]" />
                      <span>Nacionalidad</span>
                    </div>
                    <div className="text-zinc-200 font-semibold flex items-center gap-1.5">
                      <FlagImage countryName={personaje.nationality} size="md" />
                      <span>{personaje.nationality}</span>
                    </div>
                  </div>
                )}

                {/* Occupation / Profession */}
                {(personaje.occupation || (personaje.occupations && personaje.occupations.length > 0)) && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1 sm:col-span-2">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#ffbf00]" />
                      <span>Ocupación / Profesión</span>
                    </div>
                    {personaje.occupations && personaje.occupations.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {personaje.occupations.map((occ, oIdx) => (
                          <span key={oIdx} className="inline-flex items-center px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 font-semibold text-xs">
                            {occ}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-zinc-200 font-semibold text-xs pt-0.5">
                        {personaje.occupation}
                      </div>
                    )}
                  </div>
                )}

                {/* Parents */}
                {personaje.parents && personaje.parents.length > 0 && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1 sm:col-span-2">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#ffbf00]" />
                      <span>Padres</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {personaje.parents.map((parent, pIdx) => (
                        <span key={pIdx} className="inline-flex items-center px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-zinc-200 font-medium text-xs">
                          {parent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Siblings */}
                {personaje.siblings && personaje.siblings.length > 0 && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1 sm:col-span-2">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#ffbf00]" />
                      <span>Hermanos / Familiares</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {personaje.siblings.map((sibling, sIdx) => (
                        <span key={sIdx} className="inline-flex items-center px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-zinc-200 font-medium text-xs">
                          {sibling}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Children / Hijos */}
                {personaje.children && personaje.children.length > 0 && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1 sm:col-span-2">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <span>Hijos / Descendencia</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {personaje.children.map((child, cIdx) => (
                        <span key={cIdx} className="inline-flex items-center px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-200 font-medium text-xs">
                          {child}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spouse / Cónyuge */}
                {personaje.spouse && !['matrimonio', 'hlist', 'lista'].includes(personaje.spouse.trim().toLowerCase()) && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1 sm:col-span-2">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <span className="text-red-400">❤️</span>
                      <span>Cónyuge (Esposo/a)</span>
                    </div>
                    <div className="text-zinc-200 font-semibold text-xs pt-0.5">
                      {personaje.spouse}
                    </div>
                  </div>
                )}

                {/* Partner / Pareja */}
                {personaje.partner && !['hlist', 'lista'].includes(personaje.partner.trim().toLowerCase()) && (
                  <div className="bg-black/35 border border-white/5 p-3 rounded-xl space-y-1 sm:col-span-2">
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <span className="text-pink-400">💕</span>
                      <span>Pareja / Relación</span>
                    </div>
                    <div className="text-zinc-200 font-semibold text-xs pt-0.5">
                      {personaje.partner}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 2. RESEÑAS TAB (Star ratings summary and submission) */}
        {activeTab === 'resenas' && (
          <div className="space-y-6">
            
            {/* Resumen de estrellas box */}
            <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">
                  Resumen de Estrellas
                </h3>
                <span className="text-[10px] bg-yellow-500/10 text-[#ffbf00] border border-yellow-500/20 px-2.5 py-1 rounded-full font-mono font-bold uppercase">
                  {voteSubmitted ? 'Reseña Registrada' : 'Deja tu Calificación'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left side big badge */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 bg-black/20 rounded-xl border border-white/5 space-y-1">
                  <div className="text-4xl sm:text-5xl font-black text-[#ffbf00] font-display">
                    {(personaje.votes_count > 0 ? personaje.rating : 0).toFixed(1)}
                  </div>
                  
                  {/* Rating Stars graphic */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${
                          personaje.votes_count > 0 && personaje.rating >= star 
                            ? 'fill-[#ffbf00] text-[#ffbf00]' 
                            : 'text-zinc-600'
                        }`} 
                      />
                    ))}
                  </div>

                  <div className="text-[10px] text-zinc-400 font-medium pt-1">
                    {personaje.votes_count || 0} votos totales
                  </div>
                </div>

                {/* Right side progress distribution */}
                <div className="md:col-span-8 space-y-2.5">
                  {[5, 4, 3, 2, 1].map((star, idx) => {
                    const count = voteDist[idx];
                    const percentage = personaje.votes_count > 0 ? (count / personaje.votes_count) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-3 text-zinc-400 font-bold text-right">{star}</span>
                        <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-[#ffbf00] rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-8 text-zinc-500 font-mono text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vote input selector and text area form */}
              <div className="border-t border-white/5 pt-5 space-y-4">
                {!voteSubmitted ? (
                  <form onSubmit={handleSubmitResena} className="space-y-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center">
                      ¿Conoces a {personaje.nombre}? ¡Deja tu calificación y reseña!
                    </p>

                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (hoverRating !== null ? hoverRating >= star : (userRating !== null ? userRating >= star : false));
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={() => handleVote(star)}
                            className="p-1.5 text-zinc-600 hover:text-[#ffbf00] transition-colors"
                          >
                            <Star
                              className={`w-7 h-7 transition-transform ${
                                isFilled ? 'fill-[#ffbf00] text-[#ffbf00] scale-110' : 'text-zinc-700 border-white/10'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Escribe tu reseña (Opcional, máximo 500 caracteres)
                      </label>
                      <textarea
                        value={userReviewText}
                        onChange={(e) => setUserReviewText(e.target.value.substring(0, 500))}
                        maxLength={500}
                        rows={3}
                        placeholder="Escribe lo que opinas de este personaje... ¿Por qué le das esta puntuación?"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#ffbf00]/50 focus:ring-1 focus:ring-[#ffbf00]/30 transition"
                      />
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium">
                        <span>{currentUser ? 'Registrado con Google' : 'Modo Invitado (Anónimo)'}</span>
                        <span>{userReviewText.length} / 500 caracteres</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={userRating === null || isSubmittingResena}
                        className="px-5 py-2.5 bg-[#ffbf00] hover:bg-[#ffbf00]/90 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-[#ffbf00]/10"
                      >
                        {isSubmittingResena ? (
                          <span>Publicando...</span>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4" />
                            <span>Publicar Reseña</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-yellow-400 uppercase tracking-wider">
                        Tu Calificación Registrada
                      </span>
                      <button
                        onClick={handleDeleteResena}
                        disabled={isSubmittingResena}
                        className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1 font-bold uppercase tracking-wider disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Reseña</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="font-bold text-zinc-300">Puntuación:</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                (userRating || 0) >= star
                                  ? 'fill-[#ffbf00] text-[#ffbf00]'
                                  : 'text-zinc-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {userReviewText && (
                        <p className="text-sm text-zinc-300 italic pt-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                          "{userReviewText}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Reseñas de la comunidad */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ffbf00]" />
                <span>Reseñas de la Comunidad ({resenasList.length})</span>
              </h3>

              {resenasList.length === 0 ? (
                <div className="bg-[#111116] border border-white/5 rounded-2xl p-8 text-center text-zinc-500">
                  <p className="text-sm">Aún no hay reseñas de la comunidad para este personaje.</p>
                  <p className="text-xs pt-1">¡Sé el primero en escribir tu reseña!</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {resenasList.map((resena) => {
                    const starsArr = Array.from({ length: 5 }, (_, i) => i + 1);
                    return (
                      <div 
                        key={resena.id} 
                        className="bg-[#111116] border border-white/5 rounded-2xl p-4.5 space-y-3 shadow-md"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          {/* User info & Metadata badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-white">
                              {resena.user_name}
                            </span>
                            
                            {/* Reg with icon badge */}
                            {resena.registered_with === 'google' ? (
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
                                title="Usuario Invitado (Anónimo)" 
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 border border-white/10 text-zinc-400"
                              >
                                <UserIcon className="w-2.5 h-2.5" />
                              </span>
                            )}

                            {/* Gender icon badge (♂ / ♀) - sin texto */}
                            {resena.user_gender && (resena.user_gender.toLowerCase() === 'masculino' || resena.user_gender.toLowerCase() === 'hombre') && (
                              <span 
                                title="Sexo: Masculino" 
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-xs"
                              >
                                ♂
                              </span>
                            )}
                            {resena.user_gender && (resena.user_gender.toLowerCase() === 'femenino' || resena.user_gender.toLowerCase() === 'mujer') && (
                              <span 
                                title="Sexo: Femenino" 
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 font-bold text-xs"
                              >
                                ♀
                              </span>
                            )}

                            {/* Country Flag badge - solo la bandera en imagen HD sin texto */}
                            {resena.user_nationality && resena.user_nationality !== 'No especificada' && (
                              <span 
                                title={`País: ${resena.user_nationality}`} 
                                className="inline-flex items-center justify-center p-0.5 rounded-sm bg-white/5 border border-white/10 shadow-xs"
                              >
                                <FlagImage countryName={resena.user_nationality} size="sm" />
                              </span>
                            )}
                          </div>

                          {/* Created date */}
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(resena.created_at).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Stars and optional text review */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-0.5">
                            {starsArr.map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  resena.stars >= star
                                    ? 'fill-[#ffbf00] text-[#ffbf00]'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>

                          {resena.review_text && (
                            <p className="text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
                              {resena.review_text}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. CRUSHES TAB (Engagement statistics and registry) */}
        {activeTab === 'crushes' && (
          <div className="space-y-6">
            <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl text-center space-y-5">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-md">
                <Heart className="w-7 h-7 fill-red-500 text-red-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white uppercase tracking-wide">
                  Crush Counter
                </h3>
                <p className="text-sm text-zinc-300">
                  Este personaje tiene <strong className="text-red-500 font-mono text-base">{crushCount}</strong> personas que lo consideran su crush en Graderz5.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRegisterCrush}
                  className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                    hasCrushed
                      ? 'bg-[#181824] hover:bg-[#20202e] text-red-500 border border-red-500/30 shadow-inner'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60'
                  }`}
                >
                  {hasCrushed ? 'Quitar de mis Crushes' : 'Registrar como mi crush'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. SHIP CALCULATOR TAB (Find compatibility match) */}
        {activeTab === 'ship' && (
          <div className="space-y-6">
            <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Flame className="w-4 h-4 text-[#ffbf00]" />
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">
                  Calculadora de Afinidad / Ship
                </h3>
              </div>

              <form onSubmit={handleCalculateShip} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Selecciona un personaje de la base de datos para emparejar:
                  </label>
                  
                  {personajesList.length > 0 ? (
                    <select
                      value={shipTargetSlug}
                      onChange={(e) => {
                        setShipTargetSlug(e.target.value);
                        setShipResult(null);
                      }}
                      className="w-full bg-[#161620] border border-white/10 hover:border-white/20 focus:border-yellow-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
                    >
                      <option value="">-- Selecciona un personaje --</option>
                      {personajesList.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      No hay otros personajes disponibles para emparejar. Agrega más personajes primero.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!shipTargetSlug}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-[#ffbf00] hover:from-[#ffbf00] hover:to-yellow-500 active:scale-98 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-yellow-950/30 cursor-pointer disabled:opacity-40"
                >
                  Calcular Ship Match
                </button>
              </form>

              {/* Match Result Display */}
              {shipResult && (
                <div className="bg-black/30 border border-white/5 p-5 rounded-2xl text-center space-y-3 animate-fade-in">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-yellow-500/20 bg-[#ffbf00]/10">
                    <span className="text-2xl font-black text-[#ffbf00] font-mono">
                      {shipResult.percentage}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold uppercase text-white">
                      Afinidad calculada con éxito
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-md mx-auto">
                      {shipResult.text}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. ESTADÍSTICA TAB (Community visual rating breakdown) */}
        {activeTab === 'estadistica' && (
          <div className="space-y-6">
            <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
              
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <BarChart3 className="w-4 h-4 text-[#ffbf00]" />
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">
                  Métricas de Comunidad
                </h3>
              </div>

              {/* Dynamic Analytics Layout */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-black/25 border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">
                      Aprobación General
                    </span>
                    <span className="text-xl font-black text-[#ffbf00] font-mono block pt-1">
                      {Math.round((personaje.rating / 5) * 100)}%
                    </span>
                  </div>

                  <div className="bg-black/25 border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">
                      Factor Popularidad
                    </span>
                    <span className="text-xl font-black text-blue-400 font-mono block pt-1">
                      {personaje.votes_count > 1000 ? 'A++' : personaje.votes_count > 100 ? 'A' : 'B'}
                    </span>
                  </div>
                </div>

                {/* SVG Visual Representation of Community ratings */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center space-y-4">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                    Distribución Visual de Votos (Estadística de Estrellas)
                  </span>

                  <div className="w-full max-w-sm flex items-end justify-between h-32 pt-4 px-4 border-b border-white/10">
                    {voteDist.map((count, idx) => {
                      const starNum = 5 - idx;
                      const maxVote = Math.max(...voteDist, 1);
                      const heightPercent = Math.min(100, Math.max(10, (count / maxVote) * 100));

                      return (
                        <div key={starNum} className="flex flex-col items-center flex-1 space-y-2">
                          <span className="text-[10px] text-zinc-500 font-mono">{count}</span>
                          <div 
                            className="w-8 sm:w-10 bg-gradient-to-t from-[#ffbf00]/40 to-[#ffbf00] rounded-t-md hover:opacity-85 transition-all"
                            style={{ height: `${heightPercent}px` }}
                          ></div>
                          <span className="text-[10px] font-bold text-zinc-400">{starNum}★</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Growth Trend Indicators */}
                <div className="flex items-center justify-between text-xs text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Tendencia de calificación: Estable / Alta</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#ffbf00]">
                    Graderz5 Engine v1.0
                  </span>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* Lightbox Modal de Imagen de Perfil */}
      {isImageLightboxOpen && personaje && personaje.image_url && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-md transition-all duration-300 animate-fadeIn"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          {/* Botón de cerrar flotante */}
          <button 
            onClick={() => setIsImageLightboxOpen(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl border border-red-400/20 shadow-2xl transition-all cursor-pointer z-50 flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>CERRAR</span>
          </button>

          {/* Contenedor principal de la imagen */}
          <div 
            className="relative max-w-full max-h-[80vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Foto de perfil grande */}
            <div className="relative rounded-2xl overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
              <img 
                src={personaje.image_url} 
                alt={personaje.nombre}
                className="max-w-full max-h-[70vh] sm:max-h-[75vh] object-contain rounded-xl select-none"
                referrerPolicy="no-referrer"
              />
              
              {/* Pie de foto con título */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-white font-black text-lg tracking-wide uppercase">{personaje.nombre}</h3>
                  <p className="text-zinc-400 text-xs font-mono">{personaje.wikidata_id || 'ID de Wikidata'}</p>
                </div>
                {personaje.wikipedia_url && (
                  <a 
                    href={personaje.wikipedia_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#ffbf00] hover:underline font-bold"
                  >
                    <span>Ver en Wikipedia</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
