# Pendientes — DataHert / FormularioPedidos
## Santiago Corazón

---

## 🔴 CRÍTICO

- [ ] **Migrar imágenes a Supabase Storage** — Las URLs de Shopify funcionan hoy pero si desaparece Shopify se rompen. Subir todas las imágenes al Storage de Supabase y actualizar las URLs en la tabla `catalogo`.

---

## 🟡 IMPORTANTE

- [ ] **Actualizar tercero existente** — Cuando el usuario corrige un dato en el formulario, ese cambio debe guardarse en Supabase con un PATCH.
- [ ] **Dashboard de administración** — Panel para que ellos agreguen nuevos productos al catálogo sin tocar código. Incluye subir imágenes a Supabase Storage.
- [ ] **Exportar Supabase a Access** — Script que descarga pedidos y terceros en el formato exacto que espera Access.

---

## 🟢 MEJORAS

- [ ] **Empaques de Toda Ocasión** — Verificar que los empaques correctos aparezcan para cada tipo de bono.
- [ ] **Limpiar pedidos de prueba** — Borrar los pedidos de prueba antes de entregar a producción.
- [ ] **Actualización de tercero desde formulario** — PATCH automático cuando el usuario corrige datos de un tercero existente.

---

## ✅ COMPLETADO

- [x] Supabase creado en cuenta de Santiago Corazón
- [x] 3 tablas creadas: terceros, pedidos, pedido_detalle
- [x] 14.839 terceros cargados
- [x] Formulario en GitHub Pages funcionando
- [x] Búsqueda de terceros instantánea desde Supabase
- [x] Pedidos guardándose correctamente
- [x] Tabla catálogo creada con 55 productos
- [x] Imágenes subidas a Google Drive
- [x] Catálogo cargado en Supabase
- [x] Formulario rediseñado con 5 flujos independientes
- [x] Favicon ❤️ en la pestaña del navegador
