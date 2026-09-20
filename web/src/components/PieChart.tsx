import { Tooltip } from 'antd';

export type PieSlice = {
  /** Stable id, used as React key. */
  key: string;
  /** Name shown in the legend. */
  label: string;
  /** Wedge fill color. */
  color: string;
  /** Wedge magnitude; slices at zero are dropped. */
  value: number;
};

export type PieChartProps = {
  slices: PieSlice[];
  /** How a slice value is rendered in the legend. */
  formatValue?: (value: number) => string;
  /** Tailwind width class for the chart diameter. */
  sizeClassName?: string;
};

const VIEW_BOX = 120;
const CENTER = VIEW_BOX / 2;
const RADIUS = 58;
/** Wedges below this share get no inline percentage label (it would not fit). */
const MIN_LABEL_SHARE = 0.07;

/** Point on the circle at `angle` radians, measured clockwise from 12 o'clock. */
function polar(angle: number, radius: number) {
  return {
    x: CENTER + radius * Math.sin(angle),
    y: CENTER - radius * Math.cos(angle),
  };
}

/** Path for the wedge spanning two angles, apex at the center. */
function wedgePath(start: number, end: number) {
  const from = polar(start, RADIUS);
  const to = polar(end, RADIUS);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return [
    `M ${CENTER} ${CENTER}`,
    `L ${from.x} ${from.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y}`,
    'Z',
  ].join(' ');
}

function percent(share: number) {
  return `${Math.round(share * 100)}%`;
}

export function PieChart({ slices, formatValue = String, sizeClassName = 'w-40' }: PieChartProps) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((acc, s) => acc + s.value, 0);

  if (total <= 0) return null;

  let angle = 0;
  const wedges = data.map((slice) => {
    const share = slice.value / total;
    const start = angle;
    angle += share * Math.PI * 2;
    return { slice, share, start, end: angle, mid: (start + angle) / 2 };
  });

  const whole = wedges.length === 1 ? wedges[0] : null;

  return (
    <figure className="m-0 flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
        className={`${sizeClassName} h-auto shrink-0 animate-pie-grow origin-center`}
        role="img"
        aria-label={data.map((s) => `${s.label}: ${formatValue(s.value)}`).join(', ')}
      >
        {whole ? (
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={whole.slice.color} />
        ) : (
          wedges.map((w) => (
            <path
              key={w.slice.key}
              d={wedgePath(w.start, w.end)}
              fill={w.slice.color}
              stroke="#ffffff"
              strokeWidth={1.5}
              strokeLinejoin="round"
            >
              <title>{`${w.slice.label}: ${formatValue(w.slice.value)} (${percent(w.share)})`}</title>
            </path>
          ))
        )}

        {wedges.map((w) =>
          w.share < MIN_LABEL_SHARE ? null : (
            <text
              key={`${w.slice.key}-share`}
              x={polar(w.mid, RADIUS * 0.62).x}
              y={polar(w.mid, RADIUS * 0.62).y}
              textAnchor="middle"
              dy="0.35em"
              fontSize={10}
              fontWeight={700}
              fill="#ffffff"
              pointerEvents="none"
            >
              {percent(w.share)}
            </text>
          ),
        )}
      </svg>

      <ul className="m-0 flex max-h-60 w-full min-w-0 list-none flex-col gap-1.5 overflow-y-auto p-0">
        {wedges.map((w) => (
          <li key={w.slice.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: w.slice.color }}
            />
            <Tooltip title={w.slice.label}>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{w.slice.label}</span>
            </Tooltip>
            <span className="shrink-0 text-xs font-semibold text-slate-700">
              {formatValue(w.slice.value)}
            </span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-400">
              {percent(w.share)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
