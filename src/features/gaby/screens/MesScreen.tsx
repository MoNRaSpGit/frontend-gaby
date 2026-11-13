import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { GraficoVentasMensuales } from "../components/GraficoVentasMensuales";
import { getMonthHistory, getMonthSummary } from "../gaby.api";
import type { GabyMonthHistoryItem, GabyMonthSummary } from "../gaby.types";

// Pestana "Mes" (misma idea que el Mes de El Joker): selector de mes, total y
// ganancia, semanas desplegables con sus dias y, abajo, el grafico por mes.
// Semana 1 = dias 1-7, 2 = 8-14, 3 = 15-21, 4 = 22 en adelante.
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function currentMonthInMontevideo() {
  // Mismo corte que el Panel: antes de la 01:00 todavia cuenta como el dia anterior.
  const shifted = new Date(Date.now() - 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit" }).format(shifted).split("-");
  return { year: Number(parts[0]), month: Number(parts[1]) };
}

export function MesScreen() {
  const today = currentMonthInMontevideo();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [summary, setSummary] = useState<GabyMonthSummary | null>(null);
  const [history, setHistory] = useState<GabyMonthHistoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    setIsLoading(true);
    setOpenWeeks(new Set([1]));
    getMonthSummary(year, month)
      .then((data) => {
        setSummary(data);
        setLoadError(null);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudo cargar el mes.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }, [year, month]);

  useEffect(() => {
    getMonthHistory(12)
      .then((data) => setHistory(data.items))
      .catch(() => setHistory(null));
  }, []);

  function toggleWeek(number: number) {
    setOpenWeeks((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  }

  // Total del anio en curso: suma de los meses del historial que son de este anio.
  const yearTotal = history ? history.filter((item) => item.anio === today.year).reduce((sum, item) => sum + item.total, 0) : null;
  const chartMonths = history ? history.slice(-6) : null;

  const profitPercent = summary ? Math.round(summary.profitMarginRatio * 100) : 30;
  const profitOf = (amount: number) => (summary ? amount * summary.profitMarginRatio : 0);

  return (
    <div className="gaby-mes">
      <div className="gaby-mes-header">
        <button type="button" className="gaby-mes-nav" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <h2 className="gaby-mes-title">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button type="button" className="gaby-mes-nav" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      {loadError ? <p className="gaby-scanner-status">{loadError}</p> : null}

      {isLoading ? (
        <p className="gaby-scanner-status">Cargando mes...</p>
      ) : summary ? (
        <>
          <div className="gaby-dashboard-stats">
            <div className="gaby-dashboard-stat">
              <span className="gaby-dashboard-stat__label">Total del mes</span>
              <strong className="gaby-dashboard-stat__value">{formatCurrency(summary.total)}</strong>
            </div>
            <div className="gaby-dashboard-stat gaby-dashboard-stat--profit">
              <span className="gaby-dashboard-stat__label">Ganancia ({profitPercent}%)</span>
              <strong className="gaby-dashboard-stat__value">{formatCurrency(profitOf(summary.total))}</strong>
            </div>
            <div className="gaby-dashboard-stat">
              <span className="gaby-dashboard-stat__label">Año {today.year}</span>
              <strong className="gaby-dashboard-stat__value">{yearTotal !== null ? formatCurrency(yearTotal) : "..."}</strong>
            </div>
          </div>

          {summary.semanas.map((week) => {
            const isOpen = openWeeks.has(week.numero);
            return (
              <div key={week.numero} className="gaby-mes-week">
                <button type="button" className="gaby-mes-week-head" onClick={() => toggleWeek(week.numero)} aria-expanded={isOpen}>
                  <span className="gaby-mes-week-arrow">{isOpen ? "▾" : "▸"}</span>
                  <h3>Semana {week.numero}</h3>
                  <span className="gaby-mes-week-totals">
                    <strong>{formatCurrency(week.total)}</strong>
                    <small>+{formatCurrency(profitOf(week.total))}</small>
                  </span>
                </button>

                {isOpen ? (
                  <table className="gaby-mes-table">
                    <thead>
                      <tr>
                        <th>Día</th>
                        <th>Fecha</th>
                        <th className="is-num">Total</th>
                        <th className="is-num">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {week.dias.map((day) => (
                        <tr key={day.fecha} className={day.total === 0 ? "is-empty" : ""}>
                          <td>{capitalize(day.diaSemana)}</td>
                          <td>{day.fecha.split("-").reverse().join("/")}</td>
                          <td className="is-num">{formatCurrency(day.total)}</td>
                          <td className="is-num is-profit">{day.total > 0 ? formatCurrency(profitOf(day.total)) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            );
          })}
        </>
      ) : null}

      {chartMonths && chartMonths.some((item) => item.total > 0) ? <GraficoVentasMensuales months={chartMonths} /> : null}
    </div>
  );
}
