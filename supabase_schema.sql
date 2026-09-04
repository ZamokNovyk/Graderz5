-- ==============================================================================
-- SCRIPT DE MIGRACIÓN Y REPARACIÓN DEFINITIVO PARA SUPABASE (GRADERZ / WIKISTARS)
-- Copia y pega TODO este código en el SQL Editor de Supabase y pulsa "RUN".
-- ==============================================================================

-- 1. TABLA: public.personajes (Asegurar tabla y todas las columnas biográficas)
CREATE TABLE IF NOT EXISTS public.personajes (
    id text PRIMARY KEY DEFAULT ('p-' || gen_random_uuid()::text),
    slug text UNIQUE NOT NULL,
    nombre text NOT NULL
);

ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS id text DEFAULT ('p-' || gen_random_uuid()::text);
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS creator_uid text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS creator_name text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS birth_date text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS death_date text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS birth_place text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS height text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS weight text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS occupations text[];
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS parents text[];
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS siblings text[];
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS extract text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS wikidata_id text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS wikipedia_url text;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS gender text DEFAULT 'no_especificado';
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'No especificada';
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS count_conozco integer DEFAULT 0;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS count_fan integer DEFAULT 0;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS count_simp integer DEFAULT 0;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS count_hater integer DEFAULT 0;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS votes_count integer DEFAULT 1;
ALTER TABLE public.personajes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();


-- 2. TABLA: public.personajes_actitud (Votos de actitudes)
CREATE TABLE IF NOT EXISTS public.personajes_actitud (
    id bigserial PRIMARY KEY
);

ALTER TABLE public.personajes_actitud ADD COLUMN IF NOT EXISTS personaje_slug text;
ALTER TABLE public.personajes_actitud ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE public.personajes_actitud ADD COLUMN IF NOT EXISTS actitud text;
ALTER TABLE public.personajes_actitud ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_actitud_slug ON public.personajes_actitud(personaje_slug);
CREATE INDEX IF NOT EXISTS idx_actitud_uid ON public.personajes_actitud(uid);


-- 3. TABLA: public.users (Perfiles y sesiones de usuarios de Google / Firebase)
CREATE TABLE IF NOT EXISTS public.users (
    uid text PRIMARY KEY
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS provider text DEFAULT 'google';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender text DEFAULT 'no_especificado';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'No especificada';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login timestamptz DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();


-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.personajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personajes_actitud ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


-- 5. POLÍTICAS DE ACCESO PÚBLICO TOTAL (Permitir lectura y escritura a clientes anónimos y autenticados)

-- Políticas para personajes
DROP POLICY IF EXISTS "Personajes son públicos" ON public.personajes;
CREATE POLICY "Personajes son públicos" ON public.personajes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cualquiera puede agregar personajes" ON public.personajes;
CREATE POLICY "Cualquiera puede agregar personajes" ON public.personajes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cualquiera puede actualizar personajes" ON public.personajes;
CREATE POLICY "Cualquiera puede actualizar personajes" ON public.personajes FOR UPDATE USING (true);

-- Políticas para actitudes
DROP POLICY IF EXISTS "Actitudes son públicas" ON public.personajes_actitud;
CREATE POLICY "Actitudes son públicas" ON public.personajes_actitud FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios pueden votar actitudes" ON public.personajes_actitud;
CREATE POLICY "Usuarios pueden votar actitudes" ON public.personajes_actitud FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios pueden cambiar su voto" ON public.personajes_actitud;
CREATE POLICY "Usuarios pueden cambiar su voto" ON public.personajes_actitud FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Usuarios pueden eliminar su voto" ON public.personajes_actitud;
CREATE POLICY "Usuarios pueden eliminar su voto" ON public.personajes_actitud FOR DELETE USING (true);

-- Políticas para users
DROP POLICY IF EXISTS "Usuarios son legibles por todos" ON public.users;
CREATE POLICY "Usuarios son legibles por todos" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cualquiera puede registrar su usuario" ON public.users;
CREATE POLICY "Cualquiera puede registrar su usuario" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cualquiera puede actualizar su usuario" ON public.users;
CREATE POLICY "Cualquiera puede actualizar su usuario" ON public.users FOR UPDATE USING (true);
