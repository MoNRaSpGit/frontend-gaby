import type { GabyMonthHistoryItem } from "../gaby.types";

// Grafico de linea con puntos (mismo estilo que el de El Joker y la
// distribuidora): ventas de los ultimos meses.
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const WIDTH = 640;
const HEIGHT = 220;
const PAD_X = 28;
const PAD_TOP = 34;
const PAD_BOTTOM = 34;
const COLOR = "#6366f1";

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const midX = (a.x + b.x) / 2;
    path += ` C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
  }
  return path;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

export function GraficoVentasMensuales({ months }: { months: GabyMonthHistoryItem[] }) {
  const max = Math.max(...months.map((item) => item.total), 1);
  const usableWidth = WIDTH - PAD_X * 2;
  const usableHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = months.map((item, index) => ({
    ...item,
    x: months.length === 1 ? PAD_X + usableWidth / 2 : PAD_X + (index / (months.length - 1)) * usableWidth,
    y: PAD_TOP + usableHeight - (item.total / max) * usableHeight
  }));

  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} ${PAD_TOP + usableHeight} L ${points[0].x} ${PAD_TOP + usableHeight} Z`;

  return (
    <section className="gaby-mes-chart">
      <h2 className="gaby-dashboard-section-title">Ventas por mes</h2>
      <div className="gaby-mes-chart-card">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="gaby-mes-chart-svg" role="img" aria-label="Ventas en pesos por mes">
          <defs>
            <linearGradient id="gaby-mes-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR} stopOpacity="0.3" />
              <stop offset="100%" stopColor={COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = PAD_TOP + usableHeight * fraction;
            return <line key={fraction} x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y} className="gaby-mes-chart-grid" />;
          })}

          <path d={area} fill="url(#gaby-mes-fill)" stroke="none" />
          <path d={line} fill="none" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round" />

          {points.map((p) => (
            <g key={`${p.anio}-${p.mes}`}>
              {p.total > 0 ? (
                <text x={p.x} y={p.y - 12} textAnchor="middle" className="gaby-mes-chart-value">
                  {formatCurrency(p.total)}
                </text>
              ) : null}
              <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={COLOR} strokeWidth="2.5" />
              <title>
                {MONTH_SHORT[p.mes - 1]} {p.anio}: {formatCurrency(p.total)}
              </title>
              <text x={p.x} y={HEIGHT - 10} textAnchor="middle" className="gaby-mes-chart-label">
                {MONTH_SHORT[p.mes - 1]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
