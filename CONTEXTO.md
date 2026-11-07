# frontend-gaby (Gaby Almacén) — contexto

Repo GH: https://github.com/MoNRaSpGit/frontend-gaby.git — deploy AUTOMÁTICO
(GitHub Actions → Pages, base `/frontend-gaby/`). NO tocar el README.

## Qué es (07/11/2026)
Versión BÁSICA de frontend-piloto para una clienta nueva: escáner de
productos + carrito + cobrar, "Producto Manual", "Fiar" a cuenta corriente
(pestaña Clientes). Sin cajas, sin modo Pro, sin tablet del fondo, sin
precios/tickets/panel ni impresión (QZ). "Después le ponemos algo de stock"
## Backend
Módulo propio `backend/src/modules/gaby/` (rutas `/api/v1/gaby/*`), tablas
`saas_gaby_*` (migración 119, `scripts/apply-119-gaby-core-migration.js`).
Se copió el catálogo de productos de Piloto (nombre/código/precio; stock en 0;
SIN imágenes, ventas ni clientes). Sin login (igual que Piloto): la API es
pública — pendiente definir si se le pone auth.

## Notas
- Misma actualización silenciosa que Piloto (sin cartel, solo cuando la app
  está quieta 45 s y sin productos cargados).

## Stock y Panel (07/11/2026)
Pestañas visibles: Productos, Clientes y Panel. La pestaña **Stock está OCULTA** (el código de screens/StockScreen.tsx sigue, se vuelve a mostrar agregando el botón en GabyHomePage). Stock OPCIONAL al editar un producto del carrito y en el alta rápida: si se carga, el producto queda marcado `stock_tracked=1` (migración 120) — esos son los productos "con stock registrado" para el futuro "stock bajo" (el catálogo copiado de Piloto NO cuenta). Cada venta descuenta stock (nunca <0). Panel: ventas del día, ganancia 30% y movimientos desplegables (GET /gaby/sales/summary), sin reimpresión. Ícono PWA: almacencito.
