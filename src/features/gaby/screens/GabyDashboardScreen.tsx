import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getSalesSummary } from "../gaby.api";
import type { GabySalesSummary } from "../gaby.types";

// "Panel de control" basico (07/11/2026, pedido explicito): lo vendido en el
// dia, la ganancia (30% de lo vendido) y la lista de movimientos -- cada
// venta se abre con un clic y muestra sus productos con el precio. Mismo
// panel que Piloto Pro, sin la reimpresion (Gaby no imprime).
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("es-UY", {
    timeZone: "America/Montevideo",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Solo las primeras 5 y el resto detras de un boton "Ver todos".
const MOVEMENTS_PREVIEW_COUNT = 5;

export function GabyDashboardScreen() {
  const [summary, setSummary] = useState<GabySalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllMovements, setShowAllMovements] = useState(false);
  // Cada venta se abre/cierra independiente de las demas.
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<number>>(new Set());

  function toggleSaleDetail(saleId: number) {
    setExpandedSaleIds((current) => {
      const next = new Set(current);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  }

  function loadSummary() {
    setIsLoading(true);
    setLoadError(null);
    return getSalesSummary()
      .then(setSummary)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudo cargar el panel.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  if (isLoading) {
    return <p className="gaby-scanner-status">Cargando panel...</p>;
  }

  if (loadError || !summary) {
    return (
      <section className="gaby-empty-state">
        <p>No se pudo cargar el panel: {loadError}</p>
        <button type="button" className="gaby-manual-btn" onClick={loadSummary}>
          Reintentar
        </button>
      </section>
    );
  }

  // Numeracion "Venta #1, #2..." en orden cronologico (la que trae
  // summary.sales), pero se MUESTRA la mas reciente primero.
  const recentFirst = [...summary.sales].reverse();
  const hasHiddenMovements = recentFirst.length > MOVEMENTS_PREVIEW_COUNT;
  const visibleSales = showAllMovements ? recentFirst : recentFirst.slice(0, MOVEMENTS_PREVIEW_COUNT);

  return (
    <div className="gaby-dashboard">
      <p className="gaby-dashboard-date">Hoy, {summary.date}</p>

      <div className="gaby-dashboard-stats">
        <div className="gaby-dashboard-stat">
          <span className="gaby-dashboard-stat__label">Ventas</span>
          <strong className="gaby-dashboard-stat__value">{formatCurrency(summary.totalAmount)}</strong>
          <span className="gaby-dashboard-stat__hint">{summary.salesCount} venta(s)</span>
        </div>
        <div className="gaby-dashboard-stat gaby-dashboard-stat--profit">
          <span className="gaby-dashboard-stat__label">Ganancia ({Math.round(summary.profitMarginRatio * 100)}%)</span>
          <strong className="gaby-dashboard-stat__value">{formatCurrency(summary.profitAmount)}</strong>
          <span className="gaby-dashboard-stat__hint">Estimada sobre las ventas</span>
        </div>
      </div>

      <div className="gaby-dashboard-section-header">
        <h2 className="gaby-dashboard-section-title">Movimientos</h2>
        {hasHiddenMovements ? (
          <button type="button" className="gaby-dashboard-toggle-btn" onClick={() => setShowAllMovements((current) => !current)}>
            {showAllMovements ? "Ver menos" : "Ver todos"}
          </button>
        ) : null}
      </div>

      {visibleSales.length ? (
        <ul className="gaby-dashboard-movements">
          {visibleSales.map((sale) => {
            const isExpanded = expandedSaleIds.has(sale.id);
            return (
              <li
                key={sale.id}
                className={isExpanded ? "gaby-dashboard-movement is-expanded" : "gaby-dashboard-movement"}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleSaleDetail(sale.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleSaleDetail(sale.id);
                  }
                }}
              >
                <div className="gaby-dashboard-movement__header">
                  <span className={isExpanded ? "gaby-dashboard-movement__chevron is-open" : "gaby-dashboard-movement__chevron"}>›</span>
                  <span className="gaby-dashboard-movement__badge">#{sale.displayNumber}</span>
                  <span className="gaby-dashboard-movement__time">{formatTime(sale.createdAt)}</span>
                  <strong className="gaby-dashboard-movement__total">{formatCurrency(sale.totalAmount)}</strong>
                </div>

                {isExpanded ? (
                  <div className="gaby-dashboard-receipt">
                    <ul className="gaby-dashboard-movement__detail">
                      {sale.items.map((item, index) => (
                        <li key={index}>
                          <span className="gaby-dashboard-movement__item-name">
                            {item.quantity > 1 ? <span className="gaby-dashboard-movement__qty">{item.quantity}×</span> : null}
                            {item.name}
                          </span>
                          <span className="gaby-dashboard-movement__item-price">{formatCurrency(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="gaby-dashboard-receipt__total">
                      <span>Total</span>
                      <strong>{formatCurrency(sale.totalAmount)}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="gaby-dashboard-movement__items">
                    {sale.items.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name)).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="gaby-empty-state">
          <p>Todavia no hay ventas hoy.</p>
        </section>
      )}
    </div>
  );
}
