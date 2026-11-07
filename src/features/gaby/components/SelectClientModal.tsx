import { useState } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import type { GabyClient } from "../gaby.types";

type SelectClientModalProps = {
  clients: GabyClient[];
  total: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (clientId: number) => void;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

// "Fiar" (06/10/2026, pedido explicito): elegir a que cliente se le carga
// la venta a cuenta en vez de cobrarla. Mismo espiritu que el selector de
// cliente de Joker, pero aca es su propio modal (en Gaby no hay
// selector de metodo de pago en el checkout).
export function SelectClientModal({ clients, total, isSubmitting, onClose, onConfirm }: SelectClientModalProps) {
  const [clientId, setClientId] = useState<string>("");

  useEscapeToCancel(!isSubmitting, onClose);

  function handleConfirm() {
    if (!clientId) return;
    onConfirm(Number(clientId));
  }

  return (
    <div className="gaby-modal-overlay" role="dialog" aria-modal="true" aria-label="Venta a credito">
      <div className="gaby-modal-card">
        <div className="gaby-modal-card__header">
          <h2>Venta a credito</h2>
          <button type="button" className="gaby-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="gaby-modal-card__total-label">Total a credito</p>
        <p className="gaby-modal-card__total">{formatCurrency(total)}</p>

        {clients.length === 0 ? (
          <p className="gaby-scanner-status gaby-scanner-status--error">
            No hay clientes creados todavia. Anda a "Clientes" y agrega uno primero.
          </p>
        ) : (
          <label className="gaby-modal-field">
            <span>Cliente</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={isSubmitting}>
              <option value="">Elegir cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="gaby-modal-card__actions">
          <button type="button" className="gaby-button gaby-button--danger" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="gaby-button gaby-button--primary"
            onClick={handleConfirm}
            disabled={isSubmitting || !clientId}
          >
            {isSubmitting ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
