import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Sparkles, MessageSquare, Volume2, ShieldCheck, ArrowRight } from 'lucide-react';
import { AppNotification } from '../types';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  initForegroundMessaging,
  playNotificationSound
} from '../lib/notificationsService';
import { User } from 'firebase/auth';

interface NotificationBellProps {
  currentUser: User | null;
  onSelectNotification: (notification: AppNotification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onSelectNotification
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermissionStatus()
  );
  const [isActivatingPush, setIsActivatingPush] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const effectiveUid = currentUser?.uid || '';

  // Cargar notificaciones
  const loadNotifications = async () => {
    if (!effectiveUid) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const list = await getNotifications(effectiveUid);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch (e) {
      console.warn('Error al cargar notificaciones:', e);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Escuchar eventos de actualización locales
    const handleUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ userUid?: string; isNewNotification?: boolean }>;
      loadNotifications();
      // Reproducir sonido si la notificación es para este usuario y es nueva
      if (customEvt.detail?.isNewNotification && (!customEvt.detail.userUid || customEvt.detail.userUid === effectiveUid)) {
        playNotificationSound();
      }
    };

    window.addEventListener('graderz5_notification_update', handleUpdate);

    // Inicializar listener de Firebase Messaging
    let unsubscribeFCM: (() => void) | null = null;
    initForegroundMessaging(() => {
      loadNotifications();
      playNotificationSound();
    }).then((unsub) => {
      unsubscribeFCM = unsub;
    });

    return () => {
      window.removeEventListener('graderz5_notification_update', handleUpdate);
      if (unsubscribeFCM) unsubscribeFCM();
    };
  }, [effectiveUid]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
      setPermissionStatus(getNotificationPermissionStatus());
    }
    setIsOpen(!isOpen);
  };

  const handleActivateNotifications = async () => {
    setIsActivatingPush(true);
    try {
      const res = await requestNotificationPermission(effectiveUid);
      setPermissionStatus(getNotificationPermissionStatus());
      if (res.granted) {
        loadNotifications();
      }
    } finally {
      setIsActivatingPush(false);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read && effectiveUid) {
      await markNotificationAsRead(notif.id, effectiveUid);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    onSelectNotification(notif);
  };

  const handleMarkAllRead = async () => {
    if (!effectiveUid) return;
    await markAllNotificationsAsRead(effectiveUid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSecs < 60) return 'Hace un momento';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} d`;
    } catch {
      return '';
    }
  };

  // Solo mostrar la campana si hay usuario registrado o si se desea permitir notificaciones
  if (!currentUser) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la Campana */}
      <button
        id="notification-bell-button"
        onClick={handleToggle}
        className={`relative w-9 h-9 flex items-center justify-center rounded-full border transition-all cursor-pointer ${
          isOpen
            ? 'bg-red-500/20 border-red-500 text-white'
            : 'bg-[#141419] border-white/10 hover:border-red-500/50 text-zinc-300 hover:text-white'
        }`}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell className="w-4 h-4" />

        {/* Insignia de no leídas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 border-2 border-[#0f0f13] text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse shadow-md shadow-red-950/60">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Desplegable */}
      {isOpen && (
        <div
          id="notification-bell-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#121217] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Cabecera del desplegable */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#17171e]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white uppercase tracking-wider text-xs">
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playNotificationSound();
                }}
                className="text-[11px] text-zinc-400 hover:text-red-400 transition flex items-center gap-1 cursor-pointer"
                title="Probar sonido de notificación (notisonido.mp3)"
                aria-label="Probar sonido"
              >
                <Volume2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                <span className="hidden sm:inline">Sonido</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3 text-red-400" />
                  <span>Marcar leídas</span>
                </button>
              )}
            </div>
          </div>

          {/* Banner de Permisos Push si aún no están activados */}
          {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
            <div className="p-3 bg-gradient-to-r from-red-950/40 via-red-900/20 to-black/50 border-b border-red-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
                <p className="text-[11px] text-zinc-300 leading-tight">
                  Activa las notificaciones en vivo para recibir respuestas.
                </p>
              </div>
              <button
                onClick={handleActivateNotifications}
                disabled={isActivatingPush}
                className="shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isActivatingPush ? 'Activando...' : 'Activar'}
              </button>
            </div>
          )}

          {/* Lista de Notificaciones */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-400">
                  No tienes notificaciones todavía
                </p>
                <p className="text-[11px] text-zinc-500 max-w-[220px]">
                  Cuando otros usuarios respondan a tus Starposts o comentarios, te avisaremos aquí.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 sm:p-3.5 flex items-start gap-3 hover:bg-white/5 transition cursor-pointer relative ${
                    !item.read ? 'bg-red-500/5' : ''
                  }`}
                >
                  {/* Punto indicador de no leída */}
                  {!item.read && (
                    <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  )}

                  {/* Avatar del emisor */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-zinc-800 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-white/10 shadow-sm mt-0.5">
                    {item.sender_photo ? (
                      <img
                        src={item.sender_photo}
                        alt={item.sender_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      item.sender_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xs text-zinc-200 leading-snug">
                      <span className="font-bold text-white mr-1">{item.sender_name}</span>
                      {item.type === 'reply_to_review'
                        ? 'te ha respondido en'
                        : 'respondió a tu comentario en'}{' '}
                      <span className="font-semibold text-red-400">
                        {item.personaje_nombre || item.personaje_slug}
                      </span>
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
