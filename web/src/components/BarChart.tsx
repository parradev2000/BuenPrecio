import { Tooltip } from 'antd';

export type BarSeries = {
  /** Stable id, used as React key. */
  key: string;
  /** Name shown in the legend and in the tooltip. */
  label: string;
  /** Bar fill color. */
  color: string;
  /** One value per label; a missing value renders as zero. */
  values: number[];
};

export type BarChartProps = {
  /** Categories on the X axis, in display order. */
  labels: string[];
  series: BarSeries[];
  /** Tailwind height class for the plot area. */
  heightClassName?: string;
  /** How a bar value is rendered (on the bar and in the tooltip). */
  formatValue?: (value: number) => string;
};

/**
 * Percentage of the plot height the tallest bar may occupy. The remaining
 * headroom is where the value labels sit.
 */
const MAX_BAR_PERCENT = 84;

/**
 * Vertical scale top: a little headroom so the tallest bar never clips its own
 * value label, always even so the midpoint tick stays a whole number.
 */
function axisTop(max: number): number {
  if (max <= 0) return 2;
  if (max <= 4) return max + (max % 2 === 0 ? 2 : 1);
  return Math.ceil((max * 1.15) / 2) * 2;
}

/** 1 → "1", 1.5 → "1.5" (keeps axis ticks tidy). */
function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function BarChart({
  labels,
  series,
  heightClassName = 'h-56',
  formatValue = String,
}: BarChartProps) {
  const max = series.reduce((acc, s) => Math.max(acc, ...s.values), 0);
  const top = axisTop(max);

  if (labels.length === 0) return null;

  const groupClass = series.length > 1 ? 'min-w-20' : 'min-w-14';

  return (
    <figure className="m-0 flex flex-col gap-3">
      {series.length > 1 && (
        <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-xs text-slate-500">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <div
          aria-hidden
          className={`flex ${heightClassName} shrink-0 flex-col justify-between text-right text-[11px] leading-none font-medium text-slate-400`}
        >
          <span>{trim(top)}</span>
          <span>{trim(top / 2)}</span>
          <span>0</span>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Grid lines stay fixed while the bars scroll horizontally. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 flex ${heightClassName} flex-col justify-between`}
          >
            <div className="border-t border-dashed border-slate-200" />
            <div className="border-t border-dashed border-slate-200" />
            <div className="border-t border-slate-200" />
          </div>

          <div className="relative overflow-x-auto">
            <div className="min-w-full">
              <div className={`flex items-end gap-2 ${heightClassName}`}>
                {labels.map((label, groupIndex) => (
                  <div
                    key={`${label}-${groupIndex}`}
                    className={`flex h-full flex-1 basis-0 items-end justify-center gap-1 ${groupClass}`}
                  >
                    {series.map((s, seriesIndex) => {
                      const value = s.values[groupIndex] ?? 0;
                      const filled = value > 0;
                      return (
                        <Tooltip
                          key={s.key}
                          title={`${label} · ${s.label}: ${formatValue(value)}`}
                        >
                          <div className="flex h-full min-w-0 max-w-12 flex-1 flex-col items-center justify-end gap-1">
                            <span className="shrink-0 text-[11px] font-semibold text-slate-700">
                              {formatValue(value)}
                            </span>
                            <div
                              className={`w-full shrink-0 origin-bottom animate-bar-grow rounded-t-md${
                                filled ? '' : ' bg-slate-200'
                              }`}
                              style={{
                                height: `${(value / top) * MAX_BAR_PERCENT}%`,
                                minHeight: filled ? 4 : 2,
                                backgroundColor: filled ? s.color : undefined,
                                animationDelay: `${groupIndex * 40 + seriesIndex * 70}ms`,
                              }}
                            />
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-start gap-2">
                {labels.map((label, groupIndex) => (
                  <Tooltip key={`${label}-label-${groupIndex}`} title={label}>
                    <span
                      className={`min-w-0 flex-1 basis-0 truncate text-center text-xs text-slate-500 ${groupClass}`}
                    >
                      {label}
                    </span>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
