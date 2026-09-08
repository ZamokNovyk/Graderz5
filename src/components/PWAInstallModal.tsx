import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Share, 
  PlusSquare, 
  Check, 
  Copy, 
  Smartphone, 
  Monitor, 
  Sparkles 
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  canInstallNative: boolean;
  isIOS: boolean;
  isInstalled: boolean;
  onInstallNative: () => Promise<'accepted' | 'dismissed' | 'manual'>;
  onShowToast: (msg: string) => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  canInstallNative,
  isIOS,
  isInstalled,
  onInstallNative,
  onShowToast
}) => {
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    onShowToast('¡Enlace de Graderz5 copiado al portapapeles!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const outcome = await onInstallNative();
      if (outcome === 'accepted') {
        onShowToast('¡Gracias por instalar Graderz5!');
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#0e0e13] border border-white/10 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fondo */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aplicación Web Progresiva</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logo de Graderz5 y Titular */}
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600/30 via-red-900/40 to-black p-1 shadow-xl shadow-red-950/60 border border-red-500/40 flex items-center justify-center">
            <img
              src="/imagenes/pwa192.png"
              alt="Graderz5 Logo"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                // Fallback a logograderz5 si es necesario
                (e.target as HTMLImageElement).src = '/imagenes/logograderz5.png';
              }}
            />
          </div>

          <div>
            <h3 className="text-xl font-black text-white font-display tracking-tight flex items-center justify-center gap-1">
              <span>Graderz</span>
              <span className="text-red-500">5</span>
              <span className="text-xs ml-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-sans font-bold">
                App
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              {isInstalled 
                ? '¡Graderz5 ya está instalada en tu dispositivo! Puedes abrirla desde tu pantalla de inicio o aplicaciones.'
                : 'Instala Graderz5 en tu móvil o PC para disfrutar de acceso instantáneo, pantalla completa y notificaciones en tiempo real.'}
            </p>
          </div>
        </div>

        {/* Contenido según dispositivo / estado */}
        <div className="bg-[#14141a] border border-white/5 rounded-2xl p-4 space-y-3">
          {isInstalled ? (
            <div className="flex items-center gap-3 text-emerald-400 text-xs font-semibold py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <p className="leading-snug text-zinc-200">
                Tu aplicación está lista para usar con rendimiento nativo y acceso directo.
              </p>
            </div>
          ) : canInstallNative ? (
            <div className="space-y-3">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-red-950/60 border border-red-400/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {installing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Instalar en este Dispositivo</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-zinc-400 text-center">
                Instalación automática y segura sin consumir espacio de tu tienda de apps.
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                <Smartphone className="w-4 h-4 text-red-400" />
                <span>Instalar en iPhone / iPad (Safari)</span>
              </div>
              <ol className="text-xs text-zinc-400 space-y-2 pl-1">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[10px] flex items-center justify-center shrink-0">1</span>
                  <span>Toca el botón <strong className="text-white">Compartir</strong> (<Share className="inline w-3.5 h-3.5 text-blue-400" />) en la barra de Safari.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[10px] flex items-center justify-center shrink-0">2</span>
                  <span>Baja y selecciona <strong className="text-white">"Añadir a la pantalla de inicio"</strong> (<PlusSquare className="inline w-3.5 h-3.5 text-emerald-400" />).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[10px] flex items-center justify-center shrink-0">3</span>
                  <span>Toca <strong className="text-white">"Añadir"</strong> en la esquina superior derecha.</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                <Monitor className="w-4 h-4 text-red-400" />
                <span>Instalación en Navegador (Chrome, Edge, Android)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Haz clic en el icono de <strong className="text-white">Instalar aplicación</strong> (<Download className="inline w-3 h-3 text-red-400" />) ubicado a la derecha en la barra de direcciones de tu navegador, o selecciona <strong className="text-white">"Instalar Graderz5"</strong> en el menú de opciones (⋮).
              </p>
            </div>
          )}
        </div>

        {/* Acciones del pie: Copiar enlace y Cerrar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-semibold py-2.5 px-3 rounded-xl border border-white/10 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Enlace de la App</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
