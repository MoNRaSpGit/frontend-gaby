import { useEffect, useRef, useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import { sanitizePriceInput } from "../services/gaby.priceInput";

type ManualProductModalProps = {
  // Los 4 botones de categoria de Modo Pro (23/09/2026, pedido explicito)
  // reusan este mismo modal, solo cambiando el titulo -- para que se vea a
  // simple vista que precio se esta por cargar antes de escribirlo. El
  // boton original "Producto Manual" no pasa `title`, asi que se comporta
  // identico a como era antes.
  title?: string;
  // Tablet del fondo (03/11/2026, pedido explicito): ahi SI se quiere
  // teclado numerico (el mostrador no). inputMode="numeric" + type="text"
  // (nunca type="tel") abre el numerico simple de 0 a 9 -- "tel" abre el
  // de discado de telefono, con +/*/#, que es lo que se habia quejado de
  // que parecia "una calculadora cientifica".
  numericKeyboard?: boolean;
  onClose: () => void;
  onConfirm: (price: number) => void;
};

export function ManualProductModal({ title = "Producto Manual", numericKeyboard = false, onClose, onConfirm }: ManualProductModalProps) {
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState("");
  const priceInputRef = useRef<HTMLInputElement>(null);

  // ESC = Cancelar (pedido explicito, 22/09/2026).
  useEscapeToCancel(true, onClose);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedPrice = Number(priceInput.replace(",", "."));

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      return;
    }

    onConfirm(parsedPrice);
  }

  return (
    <div className="gaby-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="gaby-modal-card">
        <div className="gaby-modal-card__header">
          <h2>{title}</h2>
          <button type="button" className="gaby-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="gaby-modal-field">
            <span>Precio</span>
            <input
              ref={priceInputRef}
              value={priceInput}
              onChange={(event) => setPriceInput(sanitizePriceInput(event.target.value))}
              type="text"
              inputMode={numericKeyboard ? "numeric" : undefined}
              placeholder="Ej: 150"
            />
          </label>

          {error ? <p className="gaby-scanner-status gaby-scanner-status--error">{error}</p> : null}

          <div className="gaby-modal-card__actions">
            <button type="button" className="gaby-button gaby-button--danger" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="gaby-button gaby-button--primary">
              Agregar
            </button>
          </div>
          <p className="gaby-enter-hint">Tecla Enter = Agregar</p>
        </form>
      </div>
    </div>
  );
}
