/**
 * soundService.ts
 * Gestor y caché local de sonidos para Graderz5 / Wikistars.
 * 
 * - Pre-carga y almacena en caché local (en memoria y Blob URLs) todos los sonidos:
 *   - /sounds/notisonido.mp3 (Notificaciones internas)
 *   - /sounds/star1.mp3 a star5.mp3 (Puntuaciones con estrellas)
 * - Evita re-descargas repetidas en la red.
 * - Desbloquea la política de Autoplay de los navegadores tras la primera interacción.
 */

// Rutas de los audios del sistema
export const SOUND_PATHS = {
  notification: '/sounds/notisonido.mp3',
  star1: '/sounds/star1.mp3',
  star2: '/sounds/star2.mp3',
  star3: '/sounds/star3.mp3',
  star4: '/sounds/star4.mp3',
  star5: '/sounds/star5.mp3',
} as const;

// Caché local en memoria de elementos Audio pre-cargados
const audioCache: Map<string, HTMLAudioElement> = new Map();
// Caché local de Object URLs (Blob) para evitar peticiones HTTP repetidas
const blobUrlCache: Map<string, string> = new Map();

let isAudioUnlocked = false;
let audioContext: AudioContext | null = null;

/**
 * Obtiene o inicializa el AudioContext para desbloqueo universal
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }
  return audioContext;
}

/**
 * Desbloquea la reproducción de audio tras la primera interacción del usuario en la página.
 */
export function unlockAudio(): void {
  if (isAudioUnlocked || typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Desbloquear elementos de audio en caché reproduciendo y pausando silenciosamente
  audioCache.forEach((audio) => {
    try {
      const prevVolume = audio.volume;
      audio.volume = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = prevVolume;
          })
          .catch(() => {
            audio.volume = prevVolume;
          });
      }
    } catch {
      // Ignorar errores en el intento de desbloqueo
    }
  });

  isAudioUnlocked = true;
}

// Configurar escuchas de interacción para desbloqueo automático en la primera acción
if (typeof window !== 'undefined') {
  const unlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown'];
  const handleFirstInteraction = () => {
    unlockAudio();
    unlockEvents.forEach((evt) => {
      window.removeEventListener(evt, handleFirstInteraction);
    });
  };

  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleFirstInteraction, { passive: true, once: true });
  });
}

/**
 * Pre-carga un archivo de audio y lo almacena localmente en memoria y Blob.
 */
async function preloadAudioFile(key: string, url: string): Promise<HTMLAudioElement | null> {
  if (typeof window === 'undefined') return null;

  // Si ya existe en caché, devolverlo
  if (audioCache.has(key)) {
    return audioCache.get(key)!;
  }

  let effectiveUrl = url;

  // Intentar cargar como Blob para garantizar persistencia local en memoria
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(key, blobUrl);
      effectiveUrl = blobUrl;
    }
  } catch (err) {
    console.warn(`[soundService] No se pudo crear Blob para ${url}, usando URL directa:`, err);
  }

  // Crear elemento de audio con preload automático
  try {
    const audio = new Audio(effectiveUrl);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    // Forzar carga de datos
    audio.load();
    audioCache.set(key, audio);
    return audio;
  } catch (err) {
    console.warn(`[soundService] Error al instanciar elemento Audio para ${url}:`, err);
    return null;
  }
}

/**
 * Inicializa la pre-carga local de todos los sonidos de la aplicación.
 */
export function preloadAllSounds(): void {
  if (typeof window === 'undefined') return;

  Object.entries(SOUND_PATHS).forEach(([key, url]) => {
    preloadAudioFile(key, url).catch(() => {});
  });
}

/**
 * Reproduce un sonido desde la caché local sin descargas repetidas.
 */
export function playSound(key: string, defaultUrl: string, volume = 0.65): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // Desbloquear si aún no se ha hecho
  unlockAudio();

  return new Promise((resolve) => {
    const cachedAudio = audioCache.get(key);
    const audioSrc = blobUrlCache.get(key) || defaultUrl;

    // Clonar o reutilizar el audio para permitir reproducciones consecutivas rápidas
    let audioToPlay: HTMLAudioElement;

    if (cachedAudio && cachedAudio.paused) {
      audioToPlay = cachedAudio;
      audioToPlay.currentTime = 0;
    } else {
      audioToPlay = new Audio(audioSrc);
      audioToPlay.preload = 'auto';
    }

    audioToPlay.volume = Math.max(0, Math.min(1, volume));

    const playPromise = audioToPlay.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => resolve())
        .catch((err) => {
          console.warn(`[soundService] Reproducción de ${key} bloqueada por el navegador:`, err);
          resolve();
        });
    } else {
      resolve();
    }
  });
}

/**
 * Reproduce el sonido oficial de notificaciones internas (notisonido.mp3).
 */
export function playNotificationSound(): Promise<void> {
  return playSound('notification', SOUND_PATHS.notification, 0.75);
}

/**
 * Reproduce el sonido de calificación con estrellas (star1.mp3 a star5.mp3).
 */
export function playStarSound(stars: number): Promise<void> {
  const clampedStars = Math.max(1, Math.min(5, Math.round(stars)));
  const key = `star${clampedStars}`;
  const url = SOUND_PATHS[key as keyof typeof SOUND_PATHS] || SOUND_PATHS.star5;
  return playSound(key, url, 0.65);
}

// Iniciar pre-carga automática inmediatamente al importar
if (typeof window !== 'undefined') {
  preloadAllSounds();
}
