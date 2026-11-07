import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { findProductByBarcode, listStock, normalizeBarcode, setProductStock } from "../gaby.api";
import type { GabyProduct } from "../gaby.types";

// Pestana Stock (07/11/2026, pedido explicito: "igual que en Clientes pero
// que diga Stock... que el stock vaya bajando"). Mismo molde de 3 columnas
// que Clientes: buscar / lista / detalle. El stock baja solo con cada venta
// (lo hace el backend); aca se carga y se corrige a mano. Arranca todo en 0.
function formatNumber(value: number) {
  return new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

type StockScreenProps = {
  onClose: () => void;
};

export function StockScreen({ onClose }: StockScreenProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<GabyProduct[] | null>(null);
  const [selected, setSelected] = useState<GabyProduct | null>(null);
  const [stockInput, setStockInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const stockInputRef = useRef<HTMLInputElement | null>(null);

  // Lista: sin texto, los que tienen stock; con texto, busca por nombre.
  useEffect(() => {
    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const items = await listStock(query);
        if (requestId === requestRef.current) {
          setProducts(items);
        }
      } catch (loadError) {
        if (requestId === requestRef.current) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el stock.");
        }
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  function select(product: GabyProduct) {
    setSelected(product);
    setStockInput(String(product.stock));
    window.setTimeout(() => stockInputRef.current?.select(), 0);
  }

  // Enter en el buscador: si es un codigo de barras (solo numeros, largo),
  // lo busca directo -- sirve para escanear y cargar el stock al toque.
  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeBarcode(query);
    if (!/^\d{6,}$/.test(code)) return;
    try {
      const { item } = await findProductByBarcode(code);
      select(item);
      setQuery("");
      setError("");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar el producto.");
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const value = Number(stockInput.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Poné un stock válido (0 o más).");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await setProductStock(selected.id, value);
      setSelected(updated);
      setStockInput(String(updated.stock));
      setProducts((current) => (current ? current.map((product) => (product.id === updated.id ? updated : product)) : current));
      toast.success("Stock guardado.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar el stock.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="gaby-clientes">
      <button type="button" className="gaby-clientes-back" onClick={onClose}>
        ← Volver a Productos
      </button>

      <div className="gaby-clientes-columns">
        <section className="gaby-clientes-col gaby-clientes-col--form">
          <h2 className="gaby-clientes-col-title">Buscar producto</h2>
          <form onSubmit={handleSearchSubmit} className="gaby-clientes-form">
            <label className="gaby-modal-field">
              <span>Nombre o código de barras</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej: mayonesa, o escaneá"
                autoFocus
              />
            </label>
            {error ? <p className="gaby-scanner-status gaby-scanner-status--error">{error}</p> : null}
            <p className="gaby-clientes-meta">Sin escribir nada, se ven los productos que tienen stock cargado.</p>
          </form>
        </section>

        <section className="gaby-clientes-col gaby-clientes-col--list">
          <h2 className="gaby-clientes-col-title">Stock</h2>
          {!products ? (
            <p className="gaby-scanner-status">Cargando...</p>
          ) : products.length === 0 ? (
            <section className="gaby-empty-state">
              <p>{query.trim() ? "No hay productos que coincidan." : "Todavía no hay stock cargado. Buscá un producto para cargarle."}</p>
            </section>
          ) : (
            <ul className="gaby-clientes-list">
              {products.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    className={product.id === selected?.id ? "gaby-clientes-row is-active" : "gaby-clientes-row"}
                    onClick={() => select(product)}
                  >
                    <span className="gaby-clientes-row__name">{product.name}</span>
                    <span className={product.stock > 0 ? "gaby-clientes-row__debt" : "gaby-clientes-row__debt gaby-clientes-row__debt--owes"}>
                      {formatNumber(product.stock)} u.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gaby-clientes-col gaby-clientes-col--detail">
          <h2 className="gaby-clientes-col-title">Detalle</h2>
          {!selected ? (
            <section className="gaby-empty-state">
              <p>Elegí un producto de la lista para ver y cargar su stock.</p>
            </section>
          ) : (
            <>
              <div className="gaby-clientes-detail-header">
                <h3>{selected.name}</h3>
                <p className="gaby-clientes-meta">
                  {formatCurrency(selected.price)} · {selected.barcode}
                </p>
              </div>

              <div className={selected.stock > 0 ? "gaby-clientes-saldo" : "gaby-clientes-saldo gaby-clientes-saldo--owes"}>
                <span>Stock actual</span>
                <strong>{formatNumber(selected.stock)}</strong>
              </div>

              <form onSubmit={handleSave} className="gaby-clientes-form">
                <label className="gaby-modal-field">
                  <span>Stock real (lo que hay ahora)</span>
                  <input
                    ref={stockInputRef}
                    type="text"
                    inputMode="decimal"
                    value={stockInput}
                    onChange={(event) => setStockInput(event.target.value)}
                    disabled={isSaving}
                  />
                </label>
                <button type="submit" className="gaby-button gaby-button--primary" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar stock"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
