-- ============================================================
-- CONECTA SAN JUAN - SETUP COMPLETO DE SUPABASE
-- Ejecutar este script completo en el SQL Editor de Supabase.
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin errores.
--
-- Contenido:
--   1) Bucket "noticias-imagenes" + políticas de Storage
--   2) Tabla "comentarios" + índices
--   3) Políticas RLS de comentarios
--   4) Función auxiliar public.rol_actual()
--   5) Políticas RLS de "noticias" (sin leer auth.users)
--   6) Permisos de tabla para PostgREST
--
-- REQUISITOS PREVIOS:
--   - Tabla "noticias" creada (id, titulo, subtitulo, contenido,
--     categoria, autor, imagen_url, destacado, fecha_publicacion).
--   - Tabla "perfiles" con columnas id (uuid, PK a auth.users),
--     nombre_completo (text) y rol (text, default 'redactor').
-- ============================================================

-- ============================================================
-- 1) BUCKET DE IMÁGENES "noticias-imagenes"
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('noticias-imagenes', 'noticias-imagenes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS noticias_imagenes_leer ON storage.objects;
CREATE POLICY noticias_imagenes_leer
ON storage.objects FOR SELECT
USING (bucket_id = 'noticias-imagenes');

DROP POLICY IF EXISTS noticias_imagenes_subir ON storage.objects;
CREATE POLICY noticias_imagenes_subir
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'noticias-imagenes');

DROP POLICY IF EXISTS noticias_imagenes_actualizar ON storage.objects;
CREATE POLICY noticias_imagenes_actualizar
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'noticias-imagenes')
WITH CHECK (bucket_id = 'noticias-imagenes');

DROP POLICY IF EXISTS noticias_imagenes_eliminar ON storage.objects;
CREATE POLICY noticias_imagenes_eliminar
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'noticias-imagenes');

-- ============================================================
-- 2) TABLA DE COMENTARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS comentarios (
  id BIGSERIAL PRIMARY KEY,
  noticia_id BIGINT NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  nombre_usuario VARCHAR(100) NOT NULL,
  email_usuario VARCHAR(255),
  comentario TEXT NOT NULL,
  fecha_comentario TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aprobado BOOLEAN DEFAULT FALSE
);

DROP INDEX IF EXISTS idx_comentarios_noticia;
CREATE INDEX idx_comentarios_noticia ON comentarios(noticia_id);

DROP INDEX IF EXISTS idx_comentarios_fecha;
CREATE INDEX idx_comentarios_fecha ON comentarios(fecha_comentario DESC);

-- ============================================================
-- 3) POLÍTICAS RLS PARA COMENTARIOS
-- ============================================================

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comentarios_ver_aprobados ON comentarios;
CREATE POLICY comentarios_ver_aprobados ON comentarios
  FOR SELECT
  USING (aprobado = true);

DROP POLICY IF EXISTS comentarios_admin_ver_todos ON comentarios;
CREATE POLICY comentarios_admin_ver_todos ON comentarios
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS comentarios_crear ON comentarios;
CREATE POLICY comentarios_crear ON comentarios
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS comentarios_moderar ON comentarios;
CREATE POLICY comentarios_moderar ON comentarios
  FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS comentarios_eliminar ON comentarios;
CREATE POLICY comentarios_eliminar ON comentarios
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- 4) FUNCIÓN AUXILIAR: ROL DEL USUARIO ACTUAL
--    Lee de "perfiles" usando SECURITY DEFINER (corre como el
--    dueño de la función, así que no choca con el RLS de perfiles).
--    Devuelve 'redactor' por defecto (menor privilegio).
-- ============================================================

CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.rol FROM public.perfiles p WHERE p.id = auth.uid()),
    'redactor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.rol_actual() TO anon, authenticated;

-- ============================================================
-- 5) POLÍTICAS RLS PARA "noticias" (sin leer auth.users)
-- ============================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'noticias'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.noticias', pol.policyname);
    END LOOP;
END
$$;

ALTER TABLE noticias ENABLE ROW LEVEL SECURITY;

-- Lectura pública: todos pueden ver las noticias activas
DROP POLICY IF EXISTS noticias_ver_publicadas ON noticias;
CREATE POLICY noticias_ver_publicadas ON noticias
  FOR SELECT
  TO anon, authenticated
  USING (activo = true);

-- Redactor: ve, edita y elimina SOLO sus propias noticias
-- (autor coincide con el email del JWT o con user_metadata.nombre)
DROP POLICY IF EXISTS noticias_redactor_gestionar ON noticias;
CREATE POLICY noticias_redactor_gestionar ON noticias
  FOR SELECT
  TO authenticated
  USING (
    public.rol_actual() = 'redactor'
    AND autor IN (
      (auth.jwt() ->> 'email'),
      (auth.jwt() -> 'user_metadata' ->> 'nombre')
    )
  );

DROP POLICY IF EXISTS noticias_redactor_actualizar ON noticias;
CREATE POLICY noticias_redactor_actualizar ON noticias
  FOR UPDATE
  TO authenticated
  USING (
    public.rol_actual() = 'redactor'
    AND autor IN (
      (auth.jwt() ->> 'email'),
      (auth.jwt() -> 'user_metadata' ->> 'nombre')
    )
  )
  WITH CHECK (
    public.rol_actual() = 'redactor'
    AND autor IN (
      (auth.jwt() ->> 'email'),
      (auth.jwt() -> 'user_metadata' ->> 'nombre')
    )
  );

DROP POLICY IF EXISTS noticias_redactor_eliminar ON noticias;
CREATE POLICY noticias_redactor_eliminar ON noticias
  FOR DELETE
  TO authenticated
  USING (
    public.rol_actual() = 'redactor'
    AND autor IN (
      (auth.jwt() ->> 'email'),
      (auth.jwt() -> 'user_metadata' ->> 'nombre')
    )
  );

-- Editor / Administrador: gestionan TODAS las noticias
DROP POLICY IF EXISTS noticias_editor_admin_gestionar ON noticias;
CREATE POLICY noticias_editor_admin_gestionar ON noticias
  FOR SELECT
  TO authenticated
  USING (public.rol_actual() IN ('editor', 'administrador'));

DROP POLICY IF EXISTS noticias_editor_admin_actualizar ON noticias;
CREATE POLICY noticias_editor_admin_actualizar ON noticias
  FOR UPDATE
  TO authenticated
  USING (public.rol_actual() IN ('editor', 'administrador'))
  WITH CHECK (public.rol_actual() IN ('editor', 'administrador'));

DROP POLICY IF EXISTS noticias_editor_admin_eliminar ON noticias;
CREATE POLICY noticias_editor_admin_eliminar ON noticias
  FOR DELETE
  TO authenticated
  USING (public.rol_actual() IN ('editor', 'administrador'));

-- Crear noticias: cualquier usuario con sesión (redactores por defecto)
DROP POLICY IF EXISTS noticias_crear ON noticias;
CREATE POLICY noticias_crear ON noticias
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 6) PERMISOS DE TABLA PARA PostgREST
-- ============================================================

GRANT SELECT ON noticias TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON noticias TO authenticated;

GRANT SELECT ON comentarios TO anon, authenticated;
GRANT INSERT ON comentarios TO anon, authenticated;
GRANT UPDATE, DELETE ON comentarios TO authenticated;
