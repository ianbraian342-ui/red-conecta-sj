-- ============================================================
-- RED CONECTA SAN JUAN - SETUP DE SUPABASE
-- Ejecutar este script completo en el SQL Editor de Supabase.
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin errores.
--
-- Contenido:
--   1) Tabla "registros" (perfiles cargados desde el formulario)
--   2) Políticas RLS de "registros"
--   3) Bucket de Storage "archivos-perfil" + políticas
--   4) Permisos de tabla para PostgREST
--
-- NOTA: este script NO toca las tablas de proyectos anteriores
-- (noticias, comentarios, perfiles). Crea todo de cero y de forma
-- independiente.
-- ============================================================

-- ============================================================
-- 1) TABLA DE REGISTROS / PERFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS registros (
  id BIGSERIAL PRIMARY KEY,
  tipo_perfil TEXT NOT NULL,              -- Paso 1: tipo de perfil elegido
  nombre_apellido TEXT NOT NULL,          -- Paso 2: nombre y apellido
  localidad TEXT,                         -- Paso 2: localidad
  whatsapp TEXT,                          -- Paso 2: WhatsApp
  email TEXT NOT NULL,                    -- Paso 2: correo electrónico
  red_social TEXT,                        -- Paso 2: Instagram / LinkedIn (opcional)
  perfil_detalles JSONB,                  -- Paso 3: datos específicos del perfil
  archivo_url TEXT,                       -- Paso 4: URL pública del archivo subido
  archivo_nombre TEXT,                    -- Paso 4: nombre original del archivo
  preferencias JSONB,                     -- Paso 5: checkboxes de intereses
  autoriza_datos BOOLEAN DEFAULT FALSE,   -- Paso 5: autorización de uso de datos
  autoriza_contacto BOOLEAN DEFAULT FALSE,-- Paso 5: autorización de contacto
  estado TEXT DEFAULT 'nuevo',            -- Estado interno (nuevo, contactado, etc.)
  fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_registros_fecha;
CREATE INDEX idx_registros_fecha ON registros(fecha_registro DESC);

DROP INDEX IF EXISTS idx_registros_tipo;
CREATE INDEX idx_registros_tipo ON registros(tipo_perfil);

-- ============================================================
-- 2) POLÍTICAS RLS PARA "registros"
--    - Cualquiera puede INSERTAR (formulario público).
--    - Solo usuarios autenticados (admin) pueden LEER,
--      MODIFICAR y ELIMINAR registros.
--
--    IMPORTANTE: primero se eliminan TODAS las políticas existentes
--    de la tabla (incluidas las creadas desde el dashboard de
--    Supabase, p. ej. "Enable insert for authenticated users only").
--    Si queda una política de INSERT restrictiva, PostgreSQL combina
--    los WITH CHECK con AND y el registro anónimo se rechaza con el
--    error 42501 "new row violates row-level security policy".
-- ============================================================

ALTER TABLE registros ENABLE ROW LEVEL SECURITY;

-- Eliminar cualquier política existente sobre "registros"
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'registros'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.registros', pol.policyname);
    END LOOP;
END
$$;

-- INSERT público: cualquiera puede registrar su perfil
DROP POLICY IF EXISTS registros_insertar ON registros;
CREATE POLICY registros_insertar ON registros
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Lectura: solo usuarios autenticados (admin)
DROP POLICY IF EXISTS registros_leer_admin ON registros;
CREATE POLICY registros_leer_admin ON registros
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualización: solo usuarios autenticados (admin)
DROP POLICY IF EXISTS registros_actualizar_admin ON registros;
CREATE POLICY registros_actualizar_admin ON registros
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Eliminación: solo usuarios autenticados (admin)
DROP POLICY IF EXISTS registros_eliminar_admin ON registros;
CREATE POLICY registros_eliminar_admin ON registros
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 3) BUCKET DE STORAGE "archivos-perfil"
--    Público: las URLs de CV / flyers se pueden compartir.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('archivos-perfil', 'archivos-perfil', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS archivos_perfil_leer ON storage.objects;
CREATE POLICY archivos_perfil_leer
ON storage.objects FOR SELECT
USING (bucket_id = 'archivos-perfil');

DROP POLICY IF EXISTS archivos_perfil_subir ON storage.objects;
CREATE POLICY archivos_perfil_subir
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'archivos-perfil');

DROP POLICY IF EXISTS archivos_perfil_actualizar ON storage.objects;
CREATE POLICY archivos_perfil_actualizar
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'archivos-perfil')
WITH CHECK (bucket_id = 'archivos-perfil');

DROP POLICY IF EXISTS archivos_perfil_eliminar ON storage.objects;
CREATE POLICY archivos_perfil_eliminar
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'archivos-perfil');

-- ============================================================
-- 4) PERMISOS DE TABLA PARA PostgREST
-- ============================================================

REVOKE ALL ON registros FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON registros TO authenticated;
GRANT INSERT ON registros TO anon;
GRANT USAGE ON SEQUENCE registros_id_seq TO anon, authenticated;

-- ============================================================
-- 5) RECARGA DEL ESQUEMA EN PostgREST
--    Fuerza a PostgREST a detectar la nueva tabla de inmediato
--    (evita el error 404 PGRST205 justo después de crearla).
-- ============================================================

NOTIFY pgrst, 'reload schema';
