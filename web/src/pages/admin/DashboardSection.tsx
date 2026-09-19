import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminStats } from '../../api/types';
import { Alert, Loading } from '../../components/ui';

const CHART_HEIGHT = 180;
const PRODUCT_COLOR = 'var(--primary-dark)';
const SERVICES_COLOR = '#e19125';

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function barHeight(value: number, max: number) {
  return Math.max(2, Math.round((value / max) * CHART_HEIGHT));
}

function ChartBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="bar-col">
      <span className="bar-value">{value}</span>
      <div className="chart-bar" style={{ height: `${barHeight(value, max)}px`, backgroundColor: color }} />
    </div>
  );
}

type CountRow = { name: string; count: number };

function BarChart({ title, rows, color }: { title: string; rows: CountRow[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="chart">
      <h3 className="chart-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="chart-empty">Sin datos todavía.</p>
      ) : (
        <div className="chart-scroll">
          <div className="chart-groups">
            {rows.map((row) => (
              <div key={row.name} className="chart-group">
                <ChartBar value={row.count} max={max} color={color} />
                <span className="chart-name">{row.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PerBusinessChart({ rows }: { rows: { name: string; products: number; services: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.products + r.services));
  return (
    <div className="chart">
      <h3 className="chart-title">Productos y servicios por negocio</h3>
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-dot legend-dot-products" /> Productos
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-dot-services" /> Servicios
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="chart-empty">Sin datos todavía.</p>
      ) : (
        <div className="chart-scroll">
          <div className="chart-groups">
            {rows.map((row) => (
              <div key={row.name} className="chart-group">
                <div className="chart-bars">
                  <ChartBar value={row.products} max={max} color={PRODUCT_COLOR} />
                  <ChartBar value={row.services} max={max} color={SERVICES_COLOR} />
                </div>
                <span className="chart-name">{row.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardSection() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<AdminStats>('/admin/stats', { auth: true });
      setStats(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading />;

  if (error) return <Alert kind="error">{error}</Alert>;

  if (!stats) return null;

  return (
    <section className="admin-card">
      <div className="admin-head">
        <div>
          <h2>Dashboard</h2>
          <p className="admin-sub">Datos generales de la plataforma.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>
          Actualizar
        </button>
      </div>

      <div className="stat-grid">
        <StatCard value={stats.totals.businesses} label="Negocios" />
        <StatCard value={stats.totals.products} label="Productos" />
        <StatCard value={stats.totals.services} label="Servicios" />
      </div>

      <PerBusinessChart rows={stats.byBusiness} />

      <BarChart title="Negocios por tipo de negocio" rows={stats.businessesByCategory} color="#0b7a4b" />

      <BarChart title="Productos por categoría de producto" rows={stats.productsByCategory} color="#2d6cdf" />
    </section>
  );
}