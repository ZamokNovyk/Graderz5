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
  Sparkles
} from 'lucide-react';
import { User, updateProfile } from '../lib/firebase';
import { saveUserToSupabase, checkUsernameAvailability, getUserProfileDetails } from '../users/userService';
import { getUserPreferences, saveUserPreferences } from '../lib/actitudesService';
import { ALL_COUNTRIES } from '../data/countries';

interface ProfileViewProps {
  currentUser: User | null;
  onSignInGoogle: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onSignInGoogle }) => {
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

  useEffect(() => {
    // 1. Cargar preferencias locales
    const prefs = getUserPreferences();
    if (prefs.gender === 'femenino') {
      setGender('femenino');
    } else {
      setGender('masculino');
    }
    if (prefs.nationality && prefs.nationality !== 'No especificada') {
      setNationality(prefs.nationality);
    }

    // 2. Si hay usuario autenticado, consultar perfil de Supabase/local
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

  // Real-time username validation effect with debounce
  useEffect(() => {
    if (!isEditingName || !currentUser) {
      setAvailability({ isAvailable: null, message: null });
      return;
    }

    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setAvailability({ isAvailable: false, message: 'El nombre de usuario no puede estar vacío.' });
      return;
    }

    if (trimmed.toLowerCase() === (currentUser.displayName || '').trim().toLowerCase()) {
      setAvailability({ isAvailable: true, message: 'Es tu nombre actual.' });
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

    // Final check before saving
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
    // 1. Guardar preferencias generales (para anónimos y registrados)
    saveUserPreferences({ gender, nationality });

    // 2. Si está registrado con Google, guardar en Supabase
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

  const formatRegistrationDate = (creationTime?: string) => {
    if (!creationTime) return '17 de agosto de 2026';
    try {
      const date = new Date(creationTime);
      if (isNaN(date.getTime())) return '17 de agosto de 2026';
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '17 de agosto de 2026';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 pb-32 space-y-6">
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
                {currentUser ? 'Cuenta de Google Conectada' : 'No autenticado'}
              </span>
            </div>
            
            <p className="text-xs text-zinc-400">
              {currentUser ? currentUser.email : 'Inicia sesión para gestionar tus datos y calificaciones.'}
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

      {/* Account Details & Profile Editor Form */}
      <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
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

        {/* Form Group: Username / Edit Name with Uniqueness Validation */}
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

          {isEditingName && currentUser ? (
            <div className="space-y-2">
              <form onSubmit={handleSaveUsername} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={usernameInput}
                    maxLength={10}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Ej. Starryz5"
                    className={`w-full bg-[#181820] border ${
                      availability.isAvailable === false
                        ? 'border-red-500 focus:ring-red-500/50'
                        : availability.isAvailable === true
                        ? 'border-emerald-500 focus:ring-emerald-500/50'
                        : 'border-white/10 focus:ring-red-500/50'
                    } rounded-xl px-4 py-2.5 pr-14 text-sm text-white focus:outline-none focus:ring-2`}
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {usernameInput.length}/10
                    </span>
                    {isCheckingAvailability ? (
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    ) : availability.isAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : availability.isAvailable === false ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : null}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isSavingName || 
                    isCheckingAvailability || 
                    availability.isAvailable === false || 
                    !usernameInput.trim()
                  }
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-950/60"
                >
                  {isSavingName ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setUsernameInput(currentUser.displayName || '');
                    setAvailability({ isAvailable: null, message: null });
                  }}
                  className="bg-[#181820] hover:bg-[#22222d] text-zinc-400 text-xs px-3 py-2.5 rounded-xl transition-colors cursor-pointer border border-white/5"
                >
                  Cancelar
                </button>
              </form>

              {/* Availability Status Message */}
              {availability.message && (
                <div className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                  availability.isAvailable === true 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {availability.isAvailable === true ? (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{availability.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full bg-[#181820] border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 font-medium flex items-center justify-between">
              <span>{currentUser?.displayName || usernameInput || 'No definido'}</span>
              <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded font-mono">Nombre Único</span>
            </div>
          )}
        </div>

        {/* Group: Correo Asociado */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            Correo Asociado
          </label>
          <div className="w-full bg-[#181820] border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 font-medium tracking-wide">
            {currentUser?.email || 'No conectado'}
          </div>
        </div>

        {/* Group: Fecha de Registro */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            Fecha de Registro
          </label>
          <div className="w-full bg-[#181820] border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 font-medium">
            {formatRegistrationDate(currentUser?.metadata?.creationTime)}
          </div>
        </div>

        {/* Group: Sexo y Nacionalidad */}
        <div className="border-t border-white/5 pt-4 space-y-4">
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
            {/* Sexo Selector */}
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

            {/* Nacionalidad Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Nacionalidad (País)
              </label>
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 cursor-pointer"
              >
                {ALL_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
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
    </div>
  );
};
