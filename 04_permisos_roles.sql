-- ============================================================
-- SANTIAGO CORAZÓN — Dashboard
-- 04_permisos_roles.sql
-- Crea la tabla de permisos por rol: qué módulos del menú
-- puede ver cada rol del Dashboard (admin, operador, consulta,
-- salas_ludicas). El Dashboard la lee/escribe con la misma
-- llave de servicio que ya usa para usuarios_dashboard.
-- ============================================================

CREATE TABLE IF NOT EXISTS permisos_roles (
  rol            text PRIMARY KEY,
  modulos        jsonb NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE permisos_roles IS 'Qué módulos del menú del Dashboard puede ver cada rol. El rol admin siempre tiene acceso completo (forzado desde el código, no depende de esta tabla).';
COMMENT ON COLUMN permisos_roles.modulos IS 'Objeto con un booleano por módulo, ej: {"pedidos": true, "usuarios": false, ...}';

-- Igual que usuarios_dashboard, esta tabla solo se consulta con la
-- llave de servicio (service_role) desde el Dashboard, así que se
-- bloquea el acceso directo con la llave pública (anon): se activa
-- RLS y no se crea ninguna política, dejando el acceso solo al
-- service_role (que siempre salta RLS).
ALTER TABLE permisos_roles ENABLE ROW LEVEL SECURITY;

-- Datos iniciales: reflejan el comportamiento que ya tenía el Dashboard
-- quemado en el código antes de este cambio, para que nada cambie de
-- golpe hasta que una administradora entre a
-- "Usuarios → Permisos por rol" y los ajuste a mano.
INSERT INTO permisos_roles (rol, modulos) VALUES
  ('admin', '{
    "pedidos": true, "terceros": true, "catalogo": true, "campanas": true,
    "bonos": true, "eventos": true, "temporada": true, "envios": true,
    "usuarios": true, "shopify": true, "salaludica": true
  }'::jsonb),
  ('operador', '{
    "pedidos": true, "terceros": true, "catalogo": true, "campanas": true,
    "bonos": true, "eventos": true, "temporada": true, "envios": false,
    "usuarios": false, "shopify": true, "salaludica": false
  }'::jsonb),
  ('consulta', '{
    "pedidos": true, "terceros": true, "catalogo": true, "campanas": true,
    "bonos": true, "eventos": true, "temporada": true, "envios": false,
    "usuarios": false, "shopify": true, "salaludica": false
  }'::jsonb),
  ('salas_ludicas', '{
    "pedidos": false, "terceros": false, "catalogo": false, "campanas": false,
    "bonos": false, "eventos": false, "temporada": false, "envios": false,
    "usuarios": false, "shopify": false, "salaludica": true
  }'::jsonb)
ON CONFLICT (rol) DO NOTHING;
