-- ==============================================================================
-- Supabase RPC Function: search_personajes
-- Permite búsqueda difusa (fuzzy search) y en milisegundos directamente en el servidor.
-- ==============================================================================

-- 1. Habilitar la extensión de coincidencia trigram si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Crear índice GIN trigram para búsquedas de alta velocidad
CREATE INDEX IF NOT EXISTS idx_personajes_nombre_trgm ON public.personajes USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_personajes_extract_trgm ON public.personajes USING gin (extract gin_trgm_ops);

-- 3. Crear función RPC invocable mediante: supabase.rpc('search_personajes', { search_query: '...', similarity_threshold: 0.25, max_results: 10 })
CREATE OR REPLACE FUNCTION public.search_personajes(
    search_query text,
    similarity_threshold float DEFAULT 0.25,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    id text,
    slug text,
    nombre text,
    creator_uid text,
    image_url text,
    birth_date text,
    extract text,
    rating numeric,
    votes_count integer,
    created_at timestamptz,
    similarity_score real
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.slug,
        p.nombre,
        p.creator_uid,
        p.image_url,
        p.birth_date,
        p.extract,
        p.rating,
        p.votes_count,
        p.created_at,
        GREATEST(
            similarity(p.nombre, search_query),
            similarity(p.slug, search_query),
            similarity(COALESCE(p.extract, ''), search_query) * 0.5
        ) AS similarity_score
    FROM public.personajes p
    WHERE 
        p.nombre ILIKE '%' || search_query || '%'
        OR p.slug ILIKE '%' || search_query || '%'
        OR p.extract ILIKE '%' || search_query || '%'
        OR similarity(p.nombre, search_query) >= similarity_threshold
    ORDER BY 
        (p.nombre ILIKE search_query || '%') DESC,
        similarity_score DESC,
        p.votes_count DESC
    LIMIT max_results;
END;
$$;

-- 4. Otorgar permisos de ejecución al rol anónimo y autenticado
GRANT EXECUTE ON FUNCTION public.search_personajes(text, float, integer) TO anon, authenticated, service_role;
