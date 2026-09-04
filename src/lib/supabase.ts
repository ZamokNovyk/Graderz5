/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Read Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase Warning: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están configurados en .env.\n' +
    'Para conectar con tu base de datos de Supabase, agrega las credenciales en tu archivo .env o en el panel de Secrets.'
  );
}

// Create Supabase client instance (or null if credentials missing)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * INSTRUCCIONES PARA CREAR LAS TABLAS EN SUPABASE SQL EDITOR:
 * 
 * -- 1. TABLA 'users'
 * CREATE TABLE IF NOT EXISTS public.users (
 *   uid TEXT PRIMARY KEY,
 *   email TEXT,
 *   display_name TEXT,
 *   photo_url TEXT,
 *   provider TEXT DEFAULT 'google',
 *   gender TEXT DEFAULT 'masculino',
 *   nationality TEXT DEFAULT 'España',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
 *   last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 * );
 * CREATE UNIQUE INDEX IF NOT EXISTS users_display_name_lower_idx ON public.users (LOWER(display_name));
 * ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Permitir lectura y escritura de usuarios" ON public.users FOR ALL USING (true) WITH CHECK (true);
 * 
 * -- 2. TABLA 'personajes'
 * CREATE TABLE IF NOT EXISTS public.personajes (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   slug TEXT UNIQUE NOT NULL,
 *   nombre TEXT NOT NULL,
 *   creator_uid TEXT NOT NULL,
 *   creator_name TEXT,
 *   image_url TEXT,
 *   birth_date TEXT,
 *   death_date TEXT,
 *   birth_place TEXT,
 *   height TEXT,
 *   weight TEXT,
 *   extract TEXT,
 *   wikidata_id TEXT,
 *   wikipedia_url TEXT,
 *   gender TEXT,
 *   nationality TEXT,
 *   count_conozco INTEGER DEFAULT 0,
 *   count_fan INTEGER DEFAULT 0,
 *   count_simp INTEGER DEFAULT 0,
 *   count_hater INTEGER DEFAULT 0,
 *   rating NUMERIC DEFAULT 5.0,
 *   votes_count INTEGER DEFAULT 1,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * -- Para bases de datos existentes, puedes ejecutar:
 * -- ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS death_date TEXT;
 * -- ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS birth_place TEXT;
 * -- ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS height TEXT;
 * -- ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS weight TEXT;
 * CREATE INDEX IF NOT EXISTS personajes_slug_idx ON public.personajes (slug);
 * CREATE INDEX IF NOT EXISTS personajes_nombre_idx ON public.personajes (nombre);
 * ALTER TABLE public.personajes ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Permitir lectura y escritura de personajes" ON public.personajes FOR ALL USING (true) WITH CHECK (true);
 * 
 * -- 3. TABLA 'personajes_actitud'
 * CREATE TABLE IF NOT EXISTS public.personajes_actitud (
 *   id TEXT PRIMARY KEY,
 *   personaje_slug TEXT NOT NULL,
 *   user_uid TEXT NOT NULL,
 *   user_name TEXT,
 *   actitud TEXT NOT NULL CHECK (actitud IN ('conozco', 'fan', 'simp', 'hater')),
 *   fecha DATE NOT NULL,
 *   hora TIME NOT NULL,
 *   is_anonymous BOOLEAN DEFAULT false,
 *   user_gender TEXT,
 *   user_nationality TEXT,
 *   personaje_gender TEXT,
 *   personaje_nationality TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
 *   CONSTRAINT personajes_actitud_user_slug_key UNIQUE (personaje_slug, user_uid)
 * );
 * CREATE INDEX IF NOT EXISTS personajes_actitud_slug_idx ON public.personajes_actitud (personaje_slug);
 * CREATE INDEX IF NOT EXISTS personajes_actitud_uid_idx ON public.personajes_actitud (user_uid);
 * ALTER TABLE public.personajes_actitud ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Permitir lectura y escritura de actitudes" ON public.personajes_actitud FOR ALL USING (true) WITH CHECK (true);
 */
