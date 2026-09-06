/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Read Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase Warning: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no fueron provistas durante el build.\n' +
    'Asegúrate de agregar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las "Environment variables" de tu proyecto en Cloudflare Pages y re-desplegar.'
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
 * 
 * -- 4. TABLA 'personajes_world' (Estadísticas mundiales agrupadas: 4 registros por personaje)
 * CREATE TABLE IF NOT EXISTS public.personajes_world (
 *   id TEXT PRIMARY KEY, -- Formato: 'slug_actitud', ej: 'lalisa.manobal_fan'
 *   personaje_slug TEXT NOT NULL,
 *   actitud TEXT NOT NULL CHECK (actitud IN ('fan', 'simp', 'hater', 'conozco')),
 *   paises JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"Peru": 15, "Chile": 34}
 *   total INTEGER NOT NULL DEFAULT 0,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * CREATE INDEX IF NOT EXISTS personajes_world_slug_idx ON public.personajes_world (personaje_slug);
 * ALTER TABLE public.personajes_world ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Permitir lectura y escritura de personajes_world" ON public.personajes_world FOR ALL USING (true) WITH CHECK (true);
 * 
 * -- 5. TABLA 'personajes_resenas' (Starposts)
 * -- Columnas acumuladoras para likes, dislikes y total de respuestas:
 * ALTER TABLE public.personajes_resenas ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
 * ALTER TABLE public.personajes_resenas ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;
 * ALTER TABLE public.personajes_resenas ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0;
 * 
 * -- 6. TABLA 'resenas_like_dislike' (Registro de reacciones a Starposts)
 * CREATE TABLE IF NOT EXISTS public.resenas_like_dislike (
 *   id BIGSERIAL PRIMARY KEY,
 *   resena_id TEXT NOT NULL,
 *   user_uid TEXT NOT NULL,
 *   reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
 *   CONSTRAINT resenas_like_dislike_unique UNIQUE (resena_id, user_uid)
 * );
 * CREATE INDEX IF NOT EXISTS resenas_like_dislike_resena_idx ON public.resenas_like_dislike (resena_id);
 * CREATE INDEX IF NOT EXISTS resenas_like_dislike_uid_idx ON public.resenas_like_dislike (user_uid);
 * ALTER TABLE public.resenas_like_dislike ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Permitir lectura y escritura de recciones" ON public.resenas_like_dislike FOR ALL USING (true) WITH CHECK (true);
 * 
 * -- 7. TABLA 'starposts_respuestas' (Sistema de respuestas anidadas de 2 niveles)
 * CREATE TABLE IF NOT EXISTS public.starposts_respuestas (
 *   id BIGSERIAL PRIMARY KEY,
 *   starpost_id TEXT NOT NULL,
 *   parent_id BIGINT DEFAULT NULL, -- NULL si es Nivel 1; ID de la respuesta si es Nivel 2
 *   user_uid TEXT NOT NULL,
 *   user_name TEXT NOT NULL,
 *   user_gender TEXT,
 *   user_nationality TEXT,
 *   is_anonymous BOOLEAN DEFAULT FALSE,
 *   registered_with TEXT DEFAULT 'anonymous',
 *   reply_to_user_name TEXT, -- Ej: '@user_y5PI5' cuando se responde a una respuesta previa
 *   comment_text TEXT NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * CREATE INDEX IF NOT EXISTS starposts_respuestas_starpost_idx ON public.starposts_respuestas (starpost_id);
 * CREATE INDEX IF NOT EXISTS starposts_respuestas_parent_idx ON public.starposts_respuestas (parent_id);
 * CREATE INDEX IF NOT EXISTS starposts_respuestas_user_idx ON public.starposts_respuestas (user_uid);
 * ALTER TABLE public.starposts_respuestas ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Permitir lectura publica de respuestas" ON public.starposts_respuestas FOR SELECT USING (true);
 * CREATE POLICY "Permitir gestion de respuestas" ON public.starposts_respuestas FOR ALL USING (true) WITH CHECK (true);
 */
