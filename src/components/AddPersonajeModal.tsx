import React, { useState } from 'react';
import { 
  X, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle, 
  Check, 
  Calendar, 
  ExternalLink, 
  Loader2, 
  Sparkles,
  Flame,
  User as UserIcon,
  Plus,
  MapPin,
  Ruler,
  Weight,
  Users,
  HeartCrack,
  Briefcase
} from 'lucide-react';
import { verifyPersonOnWikipedia, savePersonaje, WikiVerificationResult, createSlug } from '../lib/personajesService';
import { FlagImage } from './FlagImage';
import { User } from 'firebase/auth';
import { PersonajeFamiliar } from '../types';

interface AddPersonajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onPersonajeCreated: (slug: string) => void;
}

export const AddPersonajeModal: React.FC<AddPersonajeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPersonajeCreated,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<WikiVerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (termToSearch?: string) => {
    const searchTerm = (termToSearch !== undefined ? termToSearch : query).trim();
    if (!searchTerm) return;
    if (termToSearch !== undefined) setQuery(termToSearch);

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await verifyPersonOnWikipedia(searchTerm);
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al conectar con el servicio de verificación de Wikipedia/Wikidata.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!result || !result.isHuman) return;

    setIsSaving(true);
    try {
      const creatorUid = currentUser ? currentUser.uid : 'anon-guest-uid';
      const creatorName = currentUser ? (currentUser.displayName || currentUser.email || 'Usuario Graderz5') : 'Invitado Graderz5';

      const saveRes = await savePersonaje(
        {
          nombre: result.exactTitle || result.title,
          slug: createSlug(result.exactTitle || result.title),
          imageUrl: result.imageUrl,
          birthDate: result.birthDate,
          deathDate: result.deathDate,
          birthPlace: result.birthPlace,
          height: result.height,
          weight: result.weight,
          occupation: result.occupation,
          occupations: result.occupations,
          parents: result.parents,
          siblings: result.siblings,
          children: result.children,
          relatives: result.relatives,
          spouse: result.spouse,
          partner: result.partner,
          extract: result.extract,
          wikidataId: result.wikidataId,
          wikipediaUrl: result.wikipediaUrl,
          gender: result.gender,
          nationality: result.nationality,
        },
        creatorUid,
        creatorName
      );

      if (saveRes.success) {
        onPersonajeCreated(saveRes.personaje.slug);
        onClose();
      }
    } catch (err) {
      console.error('Error al guardar personaje:', err);
      setErrorMsg('No se pudo guardar el personaje en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectRelative = async (relativeName: string) => {
    setQuery(relativeName);
    await handleSearch(relativeName);
  };

  const examples = ['Lalisa Manobal', 'Momo Hirai', 'Lionel Messi', 'Donald Trump', 'Algoritmo de Dijkstra'];

  return (
    <div 
      id="add-personaje-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="add-personaje-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0e0e13] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-40 bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 mb-5 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 p-0.5 shadow-lg shadow-red-950/60 flex items-center justify-center text-white">
              <div className="w-full h-full bg-[#131118] rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2">
                Buscar y Agregar Personaje
              </h3>
              <p className="text-xs text-zinc-400">
                Verificación oficial con Wikipedia y filtro de Ser Humano (Wikidata Q5)
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-3 mb-4"
        >
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-zinc-500 absolute left-4 pointer-events-none" />
            <input
              id="wiki-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. momo hirai, donald trump, shakira, messi, lalisa..."
              autoFocus
              className="w-full bg-[#15151c] border border-white/10 hover:border-white/20 focus:border-red-500 rounded-2xl py-3 pl-12 pr-28 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-red-950/60 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>Verificar</span>
            </button>
          </div>


        </form>

        {/* Loading Animation */}
        {isLoading && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 bg-[#13131a] rounded-2xl border border-white/5 p-6 my-3">
            <div className="w-10 h-10 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Buscando y verificando en Wikidata...</p>
              <p className="text-xs text-zinc-400">Normalizando nombre y comprobando entidad Q5 (Ser Humano)</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {result && !isLoading && (
          <div className="space-y-4 my-2">
            {/* Status Banner */}
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${
              result.isHuman 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}>
              <div className="p-2 rounded-lg bg-black/30 shrink-0">
                {result.isHuman ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-white">{result.statusTitle}</h4>
                <p className="text-xs opacity-90 mt-0.5">{result.statusDescription}</p>
              </div>
            </div>

            {/* Person Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#14141c] p-4 rounded-2xl border border-white/5">
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    {result.imageUrl ? (
                      <img 
                        src={result.imageUrl} 
                        alt={result.title}
                        className={`w-20 h-24 sm:w-24 sm:h-28 object-cover rounded-xl border ${result.deathDate ? 'border-zinc-700 grayscale-[35%]' : 'border-white/10'} shadow-md`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-[#1c1c27] border border-white/10 flex items-center justify-center text-zinc-500 flex-shrink-0">
                        <UserIcon className="w-8 h-8" />
                      </div>
                    )}

                    {/* Cinta Roja Conmemorativa si ha fallecido */}
                    {result.deathDate && (
                      <div className="absolute -top-1.5 -left-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-400/70 text-[10px] font-black px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(220,38,38,0.5)] flex items-center gap-1 z-10 font-mono">
                        <span>🎗️</span>
                        <span>Fallecido</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                      Figura Pública Encontrada
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white font-display truncate">
                      {result.exactTitle || result.title}
                    </h3>
                    
                    {result.wikidataId && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono bg-black/40 border border-white/10 text-zinc-400 px-2 py-0.5 rounded-md mt-1">
                        <span className="text-zinc-500">Wikidata:</span>
                        <span className="text-red-400 font-semibold">{result.wikidataId}</span>
                      </div>
                    )}

                    {/* Fechas de Nacimiento y Fallecimiento */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {result.birthDate && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                          <Calendar className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="text-zinc-400">Nacimiento:</span>
                          <span className="text-emerald-400 font-medium">{result.birthDate}</span>
                        </div>
                      )}

                      {result.deathDate && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-black/70 px-2.5 py-1 rounded-lg border border-zinc-700/80 shadow-sm">
                          <HeartCrack className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-zinc-400">Defunción:</span>
                          <span className="text-zinc-200 font-semibold">{result.deathDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Fichas biográficas adicionales: género, nacionalidad, lugar, estatura, peso */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                      {result.gender && (
                        <div className="inline-flex items-center gap-1 text-[11px] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-zinc-300">
                          <span className="text-zinc-500">Sexo/Género:</span>
                          <span className="font-semibold text-white">
                            {result.gender.toLowerCase().includes('masc') ? '♂️ Masculino' : result.gender.toLowerCase().includes('fem') ? '♀️ Femenino' : result.gender}
                          </span>
                        </div>
                      )}

                      {result.nationality && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-zinc-300">
                          <FlagImage countryName={result.nationality} size="sm" />
                          <span className="text-zinc-500">Nacionalidad:</span>
                          <span className="font-semibold text-white">{result.nationality}</span>
                        </div>
                      )}

                      {result.birthPlace && (
                        <div className="inline-flex items-center gap-1 text-[11px] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-zinc-300">
                          <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-zinc-500">Origen:</span>
                          <span className="font-semibold text-white truncate max-w-[120px]">{result.birthPlace}</span>
                        </div>
                      )}

                      {result.occupation && (
                        <div className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg text-amber-200">
                          <Briefcase className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="text-amber-400/70">Ocupación:</span>
                          <span className="font-semibold text-amber-200 truncate max-w-[150px]">{result.occupation}</span>
                        </div>
                      )}

                      {result.height && (
                        <div className="inline-flex items-center gap-1 text-[11px] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-zinc-300">
                          <Ruler className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-zinc-500">Altura:</span>
                          <span className="font-semibold text-white">{result.height}</span>
                        </div>
                      )}

                      {result.weight && (
                        <div className="inline-flex items-center gap-1 text-[11px] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-zinc-300">
                          <Weight className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="text-zinc-500">Peso:</span>
                          <span className="font-semibold text-white">{result.weight}</span>
                        </div>
                      )}

                      {result.parents && result.parents.length > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg text-red-200">
                          <Users className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-red-400/70">Padres:</span>
                          <span className="font-semibold text-red-200 truncate max-w-[150px]" title={result.parents.join(', ')}>{result.parents.join(', ')}</span>
                        </div>
                      )}

                      {result.siblings && result.siblings.length > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg text-red-200">
                          <Users className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-red-400/70">Hermanos:</span>
                          <span className="font-semibold text-red-200 truncate max-w-[150px]" title={result.siblings.join(', ')}>{result.siblings.join(', ')}</span>
                        </div>
                      )}

                      {result.children && result.children.length > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-emerald-200">
                          <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-emerald-400/70">Hijos:</span>
                          <span className="font-semibold text-emerald-200 truncate max-w-[150px]" title={result.children.join(', ')}>{result.children.join(', ')}</span>
                        </div>
                      )}

                      {result.spouse && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg text-red-200">
                          <span>❤️</span>
                          <span className="text-red-400/70">Cónyuge:</span>
                          <span className="font-semibold text-red-200 truncate max-w-[150px]" title={result.spouse}>{result.spouse}</span>
                        </div>
                      )}

                      {result.partner && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] bg-pink-500/10 border border-pink-500/20 px-2.5 py-0.5 rounded-lg text-pink-200">
                          <span>💕</span>
                          <span className="text-pink-400/70">Pareja:</span>
                          <span className="font-semibold text-pink-200 truncate max-w-[150px]" title={result.partner}>{result.partner}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extract */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Extracto Biográfico
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                    {result.extract || 'Sin extracto biográfico disponible en Wikipedia.'}
                  </p>
                </div>

                {result.wikipediaUrl && (
                  <a
                    href={result.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 underline underline-offset-4 font-medium"
                  >
                    <span>Ver artículo completo en Wikipedia</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Technical Structured Verification Checklist */}
              <div className="bg-[#101016] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5 pb-1.5 mb-2.5">
                    Verificación Técnica
                  </h5>
                  <ul className="space-y-2 text-xs">
                    <li className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Existe en Wikipedia</span>
                    </li>
                    <li className={`flex items-center gap-2 ${result.isHuman ? 'text-emerald-400' : 'text-zinc-500 line-through'}`}>
                      {result.isHuman ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                      <span>Es Humano (Wikidata Q5)</span>
                    </li>
                    <li className={`flex items-center gap-2 ${result.hasBirthDate ? 'text-emerald-400' : 'text-zinc-500 line-through'}`}>
                      {result.hasBirthDate ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                      <span>Fecha de nacimiento oficial</span>
                    </li>
                    <li className={`flex items-center gap-2 ${result.hasImage ? 'text-emerald-400' : 'text-zinc-500 line-through'}`}>
                      {result.hasImage ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                      <span>Fotografía disponible</span>
                    </li>
                    <li className={`flex items-center gap-2 ${result.gender ? 'text-emerald-400' : 'text-zinc-500 line-through'}`}>
                      {result.gender ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                      <span>Género / Sexo identificado</span>
                    </li>
                    <li className={`flex items-center gap-2 ${result.nationality ? 'text-emerald-400' : 'text-zinc-500 line-through'}`}>
                      {result.nationality ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                      <span>Nacionalidad verificada</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-white/5 text-[10px] text-zinc-500">
                  Creador:{' '}
                  <span className="text-zinc-300 font-mono">
                    {currentUser ? (currentUser.displayName || currentUser.uid.substring(0, 8)) : 'Invitado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Relatives Suggestion Section ("¿Agregar personajes extras?") */}
            {result.isHuman && result.relatives && result.relatives.length > 0 && (
              <div className="bg-[#12121a] border border-red-500/20 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-500" />
                    <h4 className="text-xs sm:text-sm font-bold text-white font-display">
                      ¿Deseas agregar personajes extras? (Familiares detectados)
                    </h4>
                  </div>
                  <span className="text-[10px] text-red-400 font-mono font-bold bg-red-500/10 px-2 py-0.5 rounded-full">
                    {result.relatives.length} encontrado{result.relatives.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Wikidata vinculó a sus familiares directos. Haz clic en cualquiera de ellos para verificarlo y agregarlo como nuevo personaje:
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {result.relatives.map((rel, idx) => (
                    <button
                      key={`${rel.wikidataId}-${idx}`}
                      type="button"
                      onClick={() => handleSelectRelative(rel.name)}
                      className="inline-flex items-center gap-1.5 bg-black/50 hover:bg-red-500/15 text-zinc-300 hover:text-white border border-white/10 hover:border-red-500/40 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer group"
                    >
                      <span className="text-[10px] text-zinc-500 group-hover:text-red-400 uppercase font-bold tracking-wider">
                        {rel.label}:
                      </span>
                      <span className="font-semibold text-white">{rel.name}</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation Section */}
            {result.isHuman && (
              <div className="p-4 bg-gradient-to-r from-red-950/40 via-[#181822] to-black border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-red-400" />
                    ¿Es esta la persona que estabas buscando?
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Se guardará en la tabla <code className="text-red-400 font-mono">personajes</code> de Supabase y creará su perfil público.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/60 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Guardando...' : 'Sí, es mi personaje'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setResult(null);
                      setQuery('');
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#1a1a24] hover:bg-[#252535] text-zinc-300 text-xs font-semibold rounded-xl border border-white/5 transition cursor-pointer"
                  >
                    Buscar otro
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
