import React, { useState } from 'react';
import { Download, Flame, LogOut, User as UserIcon, LogIn } from 'lucide-react';
import { User } from 'firebase/auth';
import AutocompleteSearchBar from './AutocompleteSearchBar';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSearch: () => void;
  onSelectPersonaje?: (slug: string) => void;
  onDownloadApp?: () => void;
  currentUser: User | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  isLoggingIn?: boolean;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSearch,
  onSelectPersonaje,
  onDownloadApp,
  currentUser,
  onSignInGoogle,
  onSignOut,
  isLoggingIn,
  onGoHome,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">
      {/* Brand Logo */}
      <div 
        id="graderz5-logo"
        onClick={onGoHome}
        className="flex items-center gap-2.5 cursor-pointer select-none group"
      >
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-red-600 via-red-700 to-black p-0.5 shadow-lg shadow-red-950/50 flex items-center justify-center border border-red-500/30 group-hover:scale-105 transition-transform duration-200">
          <div className="w-full h-full rounded-full bg-[#0d0d12] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent"></div>
            <span className="font-extrabold text-xs tracking-tighter text-red-500 flex items-center gap-0.5">
              <Flame className="w-4 h-4 text-red-500 fill-red-500/30" />
            </span>
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="font-black text-xl tracking-tight text-white font-display">
            Graderz
          </span>
          <span className="font-black text-xl tracking-tight text-red-500 font-display">
            5
          </span>
        </div>
      </div>

      {/* Top Search Bar (desktop) */}
      <div className="hidden md:flex flex-1 max-w-xl mx-auto relative items-center">
        <AutocompleteSearchBar
          value={searchQuery}
          placeholder="Buscar personajes, cantantes, deportistas..."
          inputClassName="!py-2 !text-xs !bg-[#141419]"
          onSearch={(query) => {
            onSearchChange(query);
            onOpenSearch();
          }}
          onSelectPersonaje={(slug) => {
            if (onSelectPersonaje) {
              onSelectPersonaje(slug);
            }
          }}
        />
      </div>

      {/* Right Action Controls: Unirse Button & Download */}
      <div className="flex items-center gap-3 relative">
        {/* "Unirse" Button or User Profile pill */}
        {!currentUser ? (
          <button
            id="join-google-auth-button"
            onClick={onSignInGoogle}
            disabled={isLoggingIn}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 rounded-full shadow-lg shadow-red-950/70 border border-red-400/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#FFFFFF"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFFFFF"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FFFFFF"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#FFFFFF"/>
              </svg>
            )}
            <span>{isLoggingIn ? 'Conectando...' : 'Unirse'}</span>
          </button>
        ) : (
          <div className="relative">
            <button
              id="user-profile-menu-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 bg-[#141419] border border-red-500/40 hover:border-red-500 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all cursor-pointer"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Usuario'}
                  className="w-6 h-6 rounded-full object-cover border border-red-500/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="hidden sm:inline max-w-[100px] truncate">
                {currentUser.displayName || 'Mi Cuenta'}
              </span>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div 
                id="user-dropdown-popover"
                className="absolute right-0 mt-2 w-56 bg-[#121217] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 text-xs"
              >
                <div className="p-3 border-b border-white/5">
                  <div className="font-bold text-white truncate">{currentUser.displayName || 'Usuario Graderz5'}</div>
                  <div className="text-zinc-400 truncate text-[11px] mt-0.5">{currentUser.email}</div>
                  <div className="mt-2 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md inline-block font-mono">
                    UID: {currentUser.uid.substring(0, 10)}...
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-red-500/10 text-red-400 font-semibold transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download App Icon */}
        <button
          id="header-action-download"
          onClick={onDownloadApp}
          title="Descargar o Compartir App"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#141419] border border-white/10 hover:border-red-500/40 hover:bg-[#1c1c24] text-zinc-300 hover:text-red-400 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
