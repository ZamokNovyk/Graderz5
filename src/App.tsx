/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavTab, SearchCategory, SearchResultItem } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ProfileView } from './components/ProfileView';
import { BottomNav } from './components/BottomNav';
import { ItemDetailModal } from './components/ItemDetailModal';
import { AddPersonajeModal } from './components/AddPersonajeModal';
import { PersonajeProfileView } from './components/PersonajeProfileView';
import { SearchResultsView } from './components/SearchResultsView';
import { Check, Plus } from 'lucide-react';

import { auth, onAuthStateChanged, signInWithGoogle, logoutUser, User } from './lib/firebase';
import { saveUserToSupabase } from './users/userService';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('todos');
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Character Profile route state (/personajes/:slug)
  const [activePersonajeSlug, setActivePersonajeSlug] = useState<string | null>(null);
  const [searchQueryParam, setSearchQueryParam] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // URL Path router listener for /personajes/:slug and /search
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const query = searchParams.get('q');

      if (path.startsWith('/search')) {
        setSearchQueryParam(query || '');
        setActivePersonajeSlug(null);
      } else {
        setSearchQueryParam(null);
        const match = path.match(/^\/personajes\/([a-zA-Z0-9._-]+)/);
        if (match && match[1]) {
          setActivePersonajeSlug(match[1]);
        } else {
          setActivePersonajeSlug(null);
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Save user UID and info to Supabase users table / local storage
        const result = await saveUserToSupabase(user);
        if (result.success) {
          showToast(`¡Bienvenido ${user.displayName || ''}! UID sincronizado.`);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignInGoogle = async () => {
    setIsLoggingIn(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        showToast(`¡Sesión iniciada como ${user.displayName || user.email}!`);
      }
    } catch (err: unknown) {
      console.error('Error al iniciar sesión:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('popup-closed-by-user')) {
        showToast('No se pudo completar el inicio de sesión.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      showToast('Sesión cerrada correctamente.');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const handleDownloadApp = () => {
    showToast('Enlace de Graderz5 copiado para compartir');
  };

  const handleOpenPersonaje = (slug: string) => {
    setActivePersonajeSlug(slug);
    setSearchQueryParam(null);
    window.history.pushState(null, '', `/personajes/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (q: string) => {
    setSearchQuery(q);
    window.history.pushState(null, '', `/search?q=${encodeURIComponent(q)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleBackFromPersonaje = () => {
    setActivePersonajeSlug(null);
    setSearchQueryParam(null);
    setActiveTab('home');
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromSearch = () => {
    setSearchQueryParam(null);
    setActiveTab('home');
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100 flex flex-col relative overflow-x-hidden font-sans bg-dot-pattern">
      {/* Top red illumination */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-48 bg-gradient-to-b from-red-950/20 via-transparent to-transparent pointer-events-none -z-10"></div>

      {/* Header with "Unirse" button */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchSubmit}
        onOpenSearch={() => {}}
        onSelectPersonaje={handleOpenPersonaje}
        onDownloadApp={handleDownloadApp}
        currentUser={currentUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
        isLoggingIn={isLoggingIn}
        onGoHome={handleBackFromPersonaje}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* If viewing a specific Personaje Profile (/personajes/:slug) */}
        {activePersonajeSlug ? (
          <PersonajeProfileView 
            slug={activePersonajeSlug} 
            onBack={handleBackFromPersonaje} 
            currentUser={currentUser}
          />
        ) : searchQueryParam !== null ? (
          <SearchResultsView
            query={searchQueryParam}
            onBack={handleBackFromSearch}
            onSelectPersonaje={handleOpenPersonaje}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HeroSection
                searchQuery={searchQuery}
                onSearchChange={handleSearchSubmit}
                onSelectPersonaje={handleOpenPersonaje}
                onOpenAddPersonaje={() => setIsAddModalOpen(true)}
              />
            )}

            {activeTab === 'perfil' && (
              <ProfileView 
                currentUser={currentUser}
                onSignInGoogle={handleSignInGoogle}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Dock Navigation */}
      <BottomNav
        activeTab={activePersonajeSlug || searchQueryParam !== null ? ('none' as any) : activeTab}
        onSelectTab={(tab) => {
          if (activePersonajeSlug || searchQueryParam !== null) {
            handleBackFromPersonaje();
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Floating Square Button to Add Personaje in Bottom Right Corner */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40">
        <button
          id="btn-floating-add-personaje"
          onClick={() => setIsAddModalOpen(true)}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white shadow-[0_0_30px_rgba(239,68,68,0.55)] border-2 border-red-400/40 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer group"
          title="Agregar personaje"
          aria-label="Agregar personaje"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
          <span className="sr-only">Agregar personaje</span>
        </button>
      </div>

      {/* Add Personaje Floating Window (Modal) with Wikipedia & Wikidata Logic */}
      <AddPersonajeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentUser={currentUser}
        onPersonajeCreated={(slug) => {
          showToast('¡Personaje verificado y guardado en la base de datos!');
          handleOpenPersonaje(slug);
        }}
      />

      {/* Item Detail Modal for campus entries */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Toast feedback */}
      {toastMessage && (
        <div 
          id="global-toast"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#16161d] border border-red-500/50 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-bounce"
        >
          <Check className="w-4 h-4 text-red-500" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
