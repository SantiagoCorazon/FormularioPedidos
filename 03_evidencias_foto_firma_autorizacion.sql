-- ============================================================
-- SANTIAGO CORAZÓN — Módulo Salas Lúdicas
-- 03_evidencias_foto_firma_autorizacion.sql
-- Agrega: foto de evidencia, firma digital del acudiente/paciente
-- y checkbox de autorización de uso de imagen, por cada registro.
-- ============================================================

ALTER TABLE sl_registros
  ADD COLUMN IF NOT EXISTS foto_url           text,   -- URL pública en Supabase Storage
  ADD COLUMN IF NOT EXISTS firma_url           text,   -- URL pública de la firma (PNG transparente)
  ADD COLUMN IF NOT EXISTS firma_nombre        text,   -- nombre de quien firmó (paciente/acudiente)
  ADD COLUMN IF NOT EXISTS autorizacion_imagen  boolean DEFAULT false;

COMMENT ON COLUMN sl_registros.foto_url IS 'Evidencia fotográfica de la atención, subida desde el formulario';
COMMENT ON COLUMN sl_registros.firma_url IS 'Firma digital (imagen PNG) de quien recibió el acompañamiento';
COMMENT ON COLUMN sl_registros.autorizacion_imagen IS 'Check de autorización de uso de imagen, marcado por el acudiente en el momento del registro';

-- ============================================================
-- BUCKET DE STORAGE: salaludica-evidencias
-- ============================================================
-- Esto NO se ejecuta por SQL: se crea manualmente en
-- Supabase → Storage → "New bucket".
--   Nombre exacto:  salaludica-evidencias
--   Public bucket:  ✅ Sí (para que la foto/firma se pueda
--                    mostrar en el dashboard sin necesitar login)
--
-- Dentro del bucket se guardan dos carpetas, creadas automáticamente
-- por el formulario al subir el primer archivo:
--   /fotos/   → fotos de evidencia
--   /firmas/  → firmas digitales (PNG)
-- ============================================================

-- Si el bucket ya quedó creado como privado por error, esta política
-- permite lectura pública de sus archivos (ejecutar solo si aplica):
-- CREATE POLICY "Lectura pública evidencias salalúdica"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'salaludica-evidencias');
