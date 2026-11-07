# frontend-gaby (Gaby Almacén) — contexto

Repo GH: https://github.com/MoNRaSpGit/frontend-gaby.git — deploy AUTOMÁTICO
(GitHub Actions → Pages, base `/frontend-gaby/`). NO tocar el README.

## Qué es (07/11/2026)
Versión BÁSICA de frontend-piloto para una clienta nueva: escáner de
productos + carrito + cobrar, "Producto Manual", "Fiar" a cuenta corriente
(pestaña Clientes). Sin cajas, sin modo Pro, sin tablet del fondo, sin
precios/tickets/panel ni impresión (QZ). "Después le ponemos algo de stock"
(PENDIENTE: pantalla de stock; la columna `stock` ya existe en la tabla).

## Backend
Módulo propio `backend/src/modules/gaby/` (rutas `/api/v1/gaby/*`), tablas
`saas_gaby_*` (migración 119, `scripts/apply-119-gaby-core-migration.js`).
Se copió el catálogo de productos de Piloto (nombre/código/precio; stock en 0;
SIN imágenes, ventas ni clientes). Sin login (igual que Piloto): la API es
pública — pendiente definir si se le pone auth.

## Notas
- Misma actualización silenciosa que Piloto (sin cartel, solo cuando la app
  está quieta 45 s y sin productos cargados).
