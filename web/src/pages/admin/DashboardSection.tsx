import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Row, Skeleton, Statistic } from 'antd';
import { ReloadOutlined, ShopOutlined, ShoppingOutlined, ToolOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import type { AdminStats } from '../../api/types';
import { Alert } from '../../components/ui';
import { BarChart } from '../../components/BarChart';
import { PieChart } from '../../components/PieChart';

const PRODUCT_COLOR = '#059669';
const SERVICE_COLOR = '#d97706';

/** Categorical palette for pie slices, cycled when there are more slices than colors. */
const PIE_COLORS = [
  '#059669',
  '#2563eb',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#e11d48',
  '#0f766e',
  '#f59e0b',
];

const EMPTY_TEXT = 'Sin datos todavía.';

type CountRow = { name: string; count: number };

function toSlices(rows: CountRow[]) {
  return rows.map((row, index) => ({
    key: `${index}-${row.name}`,
    label: row.name,
    color: PIE_COLORS[index % PIE_COLORS.length],
    value: row.count,
  }));
}

function StatBlock({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <Statistic title={title} value={value} prefix={icon} styles={{ content: { color } }} />
    </Card>
  );
}

function ChartCard({
  title,
  labels,
  series,
}: {
  title: string;
  labels: string[];
  series: { key: string; label: string; color: string; values: number[] }[];
}) {
  return (
    <Card title={title} className="h-full">
      {labels.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={EMPTY_TEXT} />
      ) : (
        <BarChart labels={labels} series={series} />
      )}
    </Card>
  );
}

function PieCard({ title, rows }: { title: string; rows: CountRow[] }) {
  const hasData = rows.some((row) => row.count > 0);
  return (
    <Card title={title} className="h-full">
      {hasData ? (
        <PieChart slices={toSlices(rows)} />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={EMPTY_TEXT} />
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <Row gutter={[16, 16]}>
      {[0, 1, 2].map((i) => (
        <Col key={i} xs={24} sm={12} lg={8}>
          <Card>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
      ))}
      <Col span={24}>
        <Card>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </Col>
    </Row>
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

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Datos generales de la plataforma.</p>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {loading && !stats ? (
        <DashboardSkeleton />
      ) : !stats ? null : (
        <div className="flex flex-col gap-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <StatBlock
                title="Negocios"
                value={stats.totals.businesses}
                color={PRODUCT_COLOR}
                icon={<ShopOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <StatBlock
                title="Productos"
                value={stats.totals.products}
                color="var(--color-ink)"
                icon={<ShoppingOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <StatBlock
                title="Servicios"
                value={stats.totals.services}
                color={SERVICE_COLOR}
                icon={<ToolOutlined />}
              />
            </Col>
          </Row>

          <ChartCard
            title="Productos y servicios por negocio"
            labels={stats.byBusiness.map((b) => b.name)}
            series={[
              {
                key: 'products',
                label: 'Productos',
                color: PRODUCT_COLOR,
                values: stats.byBusiness.map((b) => b.products),
              },
              {
                key: 'services',
                label: 'Servicios',
                color: SERVICE_COLOR,
                values: stats.byBusiness.map((b) => b.services),
              },
            ]}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <PieCard
                title="Negocios por tipo de negocio"
                rows={stats.businessesByCategory}
              />
            </Col>
            <Col xs={24} md={12}>
              <PieCard
                title="Productos por categoría de producto"
                rows={stats.productsByCategory}
              />
            </Col>
          </Row>
        </div>
      )}
    </section>
  );
}
