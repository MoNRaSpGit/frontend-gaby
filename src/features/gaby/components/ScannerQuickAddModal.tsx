import { useEffect, useRef, useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import { sanitizePriceInput } from "../services/gaby.priceInput";

type ScannerQuickAddModalProps = {
  barcode: string;
  onClose: () => void;
  onConfirm: (name: string, price: number, stock?: number) => Promise<boolean>;
};

export function ScannerQuickAddModal({ barcode, onClose, onConfirm }: ScannerQuickAddModalProps) {
  const [name, setName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  // Stock OPCIONAL (07/11/2026): vacio = el producto queda sin stock cargado.
  const [stockInput, setStockInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ESC = Cancelar (pedido explicito, 22/09/2026) -- no cancela mientras
  // se esta guardando, igual que el boton Cancelar (ver disabled mas abajo).
  useEscapeToCancel(!isSubmitting, onClose);

  // El cursor va directo al precio: es el unico dato obligatorio para dar de alta rapido.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    // Enter desde el Nombre con el Precio todavia vacio: el siguiente paso
    // logico es ir al Precio (no mostrar un error) -- pedido explicito
    // (20/09/2026): Enter siempre lleva al siguiente paso.
    if (!priceInput.trim() && document.activeElement === nameInputRef.current) {
      priceInputRef.current?.focus();
      return;
    }

    const parsedPrice = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
      return;
    }

    const trimmedStock = stockInput.trim();
    let parsedStock: number | undefined;
    if (trimmedStock !== "") {
      parsedStock = Number(trimmedStock.replace(",", "."));
      if (!Number.isFinite(parsedStock) || parsedStock < 0) {
        setError("El stock tiene que ser 0 o mas (o dejalo vacio).");
        return;
      }
    }

    setError("");
    setIsSubmitting(true);
    const ok = await onConfirm(name.trim() || "S/N", parsedPrice, parsedStock);
    setIsSubmitting(false);

    if (!ok) {
      setError("No se pudo guardar el producto. Intenta de nuevo.");
    }
  }

  return (
    <div className="gaby-modal-overlay" role="dialog" aria-modal="true" aria-label="Producto no encontrado">
      <div className="gaby-modal-card">
        <div className="gaby-modal-card__header">
          <h2>Producto no encontrado</h2>
          <button type="button" className="gaby-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="gaby-modal-card__label">Codigo escaneado: {barcode}</p>

        <form onSubmit={handleSubmit}>
          <label className="gaby-modal-field">
            <span>Nombre (opcional)</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="S/N"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </label>

          <label className="gaby-modal-field">
            <span>Precio</span>
            <input
              ref={priceInputRef}
              value={priceInput}
              onChange={(event) => setPriceInput(sanitizePriceInput(event.target.value))}
              inputMode="decimal"
              placeholder="Ej: 150"
              disabled={isSubmitting}
            />
          </label>

          <label className="gaby-modal-field">
            <span>Stock (opcional)</span>
            <input
              value={stockInput}
              onChange={(event) => setStockInput(event.target.value)}
              inputMode="decimal"
              placeholder="Sin cargar"
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="gaby-scanner-status gaby-scanner-status--error">{error}</p> : null}

          <div className="gaby-modal-card__actions">
            <button type="button" className="gaby-button gaby-button--danger" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="gaby-button gaby-button--primary" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Agregar"}
            </button>
          </div>
          <p className="gaby-enter-hint">Tecla Enter = Guardar y agregar</p>
        </form>
      </div>
    </div>
  );
}
