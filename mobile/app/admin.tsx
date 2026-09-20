import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert as NativeAlert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { api, ApiError } from '../src/api/client';
import type {
  AdminApplication,
  AdminBusiness,
  AdminStats,
  ApplicationStatus,
  Category,
  ProductCategory,
  User,
  UserRole,
} from '../src/api/types';
import { Alert, Button, Card, EmptyState, Loading, Screen, TextField } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, type BadgeTone } from '../src/lib/format';

type TabId = 'dashboard' | 'applications' | 'users' | 'categories' | 'productCategories' | 'businesses';

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'applications', label: 'Solicitudes' },
  { id: 'users', label: 'Usuarios' },
  { id: 'categories', label: 'Tipos de negocio' },
  { id: 'productCategories', label: 'Cat. producto' },
  { id: 'businesses', label: 'Negocios' },
];

const ROLE_LABEL: Record<UserRole | string, string> = {
  consumidor: 'Consumidor',
  productor: 'Productor',
  administrador: 'Admin',
};

const STATUS_LABEL: Record<ApplicationStatus | string, string> = {
  pending: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const BADGE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-brand-50',
  warning: 'bg-amber-50',
  danger: 'bg-red-50',
  neutral: 'bg-slate-100',
};

const BADGE_TEXT_CLASSES: Record<BadgeTone, string> = {
  success: 'text-brand-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  neutral: 'text-slate-600',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${BADGE_CLASSES[tone]}`}>
      <Text className={`text-xs font-bold ${BADGE_TEXT_CLASSES[tone]}`}>{children}</Text>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-600">
      <Text className="text-sm font-bold text-white">{initials}</Text>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full border px-2.5 py-1.5 active:opacity-70 ${
        active ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
      }`}
      onPress={onPress}
    >
      <Text className={`text-[13px] ${active ? 'text-white' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

const APPLICATION_TONE: Record<ApplicationStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

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

const PIE_SIZE = 108;
const PIE_CENTER = PIE_SIZE / 2;
const PIE_RADIUS = 50;
/** Wedges below this share get no inline percentage label (it would not fit). */
const PIE_MIN_LABEL_SHARE = 0.1;

/** Point on the circle at `angle` radians, measured clockwise from 12 o'clock. */
function polar(angle: number, radius: number) {
  return {
    x: PIE_CENTER + radius * Math.sin(angle),
    y: PIE_CENTER - radius * Math.cos(angle),
  };
}

/** Path for the wedge spanning two angles, apex at the center. */
function wedgePath(start: number, end: number) {
  const from = polar(start, PIE_RADIUS);
  const to = polar(end, PIE_RADIUS);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${PIE_CENTER} ${PIE_CENTER} L ${from.x} ${from.y} A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y} Z`;
}

function PieChart({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  const data = rows.filter((row) => row.count > 0);
  const total = data.reduce((acc, row) => acc + row.count, 0);

  let angle = 0;
  const wedges = data.map((row, index) => {
    const share = row.count / total;
    const start = angle;
    angle += share * Math.PI * 2;
    return {
      row,
      share,
      start,
      end: angle,
      mid: (start + angle) / 2,
      color: PIE_COLORS[index % PIE_COLORS.length],
    };
  });

  return (
    <View className="flex-1 rounded-2xl border border-edge bg-white p-3">
      <Text className="text-[13px] font-bold uppercase tracking-wide text-muted">{title}</Text>
      {wedges.length === 0 ? (
        <Text className="mt-1.5 text-[13px] text-muted">Sin datos todavía.</Text>
      ) : (
        <>
          <View className="mt-2 items-center">
            <Svg width={PIE_SIZE} height={PIE_SIZE} viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}>
              {wedges.length === 1 ? (
                <Circle cx={PIE_CENTER} cy={PIE_CENTER} r={PIE_RADIUS} fill={wedges[0].color} />
              ) : (
                wedges.map((w) => (
                  <Path
                    key={w.row.name}
                    d={wedgePath(w.start, w.end)}
                    fill={w.color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                ))
              )}
              {wedges.map((w) =>
                w.share < PIE_MIN_LABEL_SHARE ? null : (
                  <SvgText
                    key={`${w.row.name}-share`}
                    x={polar(w.mid, PIE_RADIUS * 0.6).x}
                    y={polar(w.mid, PIE_RADIUS * 0.6).y + 3.5}
                    fill="#ffffff"
                    fontSize={9}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`${Math.round(w.share * 100)}%`}
                  </SvgText>
                ),
              )}
            </Svg>
          </View>
          <View className="mt-2 gap-1">
            {wedges.map((w) => (
              <View key={w.row.name} className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: w.color }} />
                <Text className="flex-1 text-[11px] text-muted" numberOfLines={1}>
                  {w.row.name}
                </Text>
                <Text className="text-[11px] font-bold text-ink">{w.row.count}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default function AdminScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<TabId>('dashboard');

  if (!session) {
    return <Redirect href="/login" />;
  }
  if (session.user.role !== 'administrador') {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            className={`rounded-lg border px-3 py-2 active:opacity-70 ${
              tab === t.id ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
            }`}
            onPress={() => setTab(t.id)}
          >
            <Text className={`font-semibold ${tab === t.id ? 'text-white' : 'text-muted'}`}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'productCategories' && <ProductCategoriesTab />}
      {tab === 'businesses' && <BusinessesTab />}
    </Screen>
  );
}

function DashboardTab() {
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
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudieron cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function StatCard({ value, label }: { value: number; label: string }) {
    return (
      <View className="min-w-[30%] flex-1 gap-0.5 rounded-2xl border border-edge bg-white p-3">
        <Text className="text-[22px] font-bold text-ink">{value}</Text>
        <Text className="text-xs text-muted">{label}</Text>
      </View>
    );
  }

  function ChartBar({ value, max, color }: { value: number; max: number; color: string }) {
    return (
      <View className="items-center gap-0.5">
        <Text className="text-xs font-bold text-ink">{value}</Text>
        <View
          className="w-6 rounded-t"
          style={{ height: Math.max(2, Math.round((value / max) * 130)), backgroundColor: color }}
        />
      </View>
    );
  }

  function PerBusinessChart({ rows }: { rows: { name: string; products: number; services: number }[] }) {
    const max = Math.max(1, ...rows.map((r) => r.products + r.services));
    return (
      <View className="mt-5">
        <Text className="text-[13px] font-bold uppercase tracking-wide text-muted">
          Productos y servicios por negocio
        </Text>
        <View className="mt-1.5 flex-row gap-3.5">
          <View className="flex-row items-center gap-1">
            <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.primaryDark }} />
            <Text className="text-xs text-muted">Productos</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#d97706' }} />
            <Text className="text-xs text-muted">Servicios</Text>
          </View>
        </View>
        {rows.length === 0 ? (
          <Text className="mt-1.5 text-[13px] text-muted">Sin datos todavía.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="mt-2 flex-row items-end gap-3.5">
              {rows.map((row) => (
                <View key={row.name} className="items-center gap-1.5">
                  <View className="flex-row items-end gap-1">
                    <ChartBar value={row.products} max={max} color={COLORS.primaryDark} />
                    <ChartBar value={row.services} max={max} color="#d97706" />
                  </View>
                  <Text className="max-w-[76px] text-xs text-muted" numberOfLines={1}>
                    {row.name}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="mb-2 flex-row items-center justify-between gap-2.5">
        <View className="flex-1">
          <Text className="text-base font-bold text-ink">Dashboard</Text>
          <Text className="text-muted">Datos generales de la plataforma.</Text>
        </View>
        <Button title="Actualizar" variant="secondary" disabled={loading} onPress={() => void load()} />
      </View>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Loading />
      ) : stats ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="flex-row flex-wrap gap-2">
            <StatCard value={stats.totals.businesses} label="Negocios" />
            <StatCard value={stats.totals.products} label="Productos" />
            <StatCard value={stats.totals.services} label="Servicios" />
          </View>

          <PerBusinessChart rows={stats.byBusiness} />

          <View className="mt-5 flex-row items-stretch gap-2.5">
            <PieChart title="Negocios por tipo" rows={stats.businessesByCategory} />
            <PieChart title="Productos por categoría" rows={stats.productsByCategory} />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function ApplicationsTab() {
  const [status, setStatus] = useState<ApplicationStatus>('pending');
  const [items, setItems] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: AdminApplication[] }>(`/admin/applications?status=${status}`, { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    setError(null);
    try {
      await api(`/admin/applications/${id}/${action}`, { method: 'POST', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View className="flex-1">
      <View className="my-2 flex-row flex-wrap gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <Chip key={s} label={STATUS_LABEL[s]} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="No hay solicitudes en este estado." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="mb-2.5 gap-1.5 rounded-2xl border border-edge bg-white p-3.5">
              <View className="flex-row items-center gap-2.5">
                <Avatar name={item.userName} />
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink">{item.userName}</Text>
                  <Text className="text-muted">{item.userEmail}</Text>
                </View>
                <Badge tone={APPLICATION_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              </View>
              <Text className="text-muted">Solicitó el {formatDate(item.createdAt)}</Text>
              {item.status === 'pending' ? (
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      title={busyId === item.id ? '…' : 'Aprobar'}
                      variant="primary"
                      disabled={busyId !== null}
                      onPress={() => void review(item.id, 'approve')}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title={busyId === item.id ? '…' : 'Rechazar'}
                      variant="danger"
                      disabled={busyId !== null}
                      onPress={() => void review(item.id, 'reject')}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

function UsersTab() {
  const [role, setRole] = useState<UserRole | ''>('');
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      let url = '/admin/users';
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      if (role) {
        url += url.includes('?') ? `&role=${role}` : `?role=${role}`;
      }
      const res = await api<{ items: User[] }>(url, { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body, auth: true });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: User) {
    NativeAlert.alert('Eliminar usuario', `¿Eliminar a ${user.name} (${user.email})? Se borrarán sus negocios y productos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void doRemove(user) },
    ]);
  }

  async function doRemove(user: User) {
    setBusyId(user.id);
    setError(null);
    try {
      await api(`/admin/users/${user.id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View className="flex-1">
      <TextField
        label="Buscar por nombre"
        value={text}
        onChangeText={(v) => {
          setText(v);
          setSearch(v);
        }}
        placeholder="Escribe…"
      />
      <View className="my-2 flex-row flex-wrap gap-2">
        <Chip label="Todos" active={role === ''} onPress={() => setRole('')} />
        {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
          <Chip key={r} label={ROLE_LABEL[r]} active={role === r} onPress={() => setRole(r)} />
        ))}
      </View>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="No hay usuarios que coincidan." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="mb-2.5 gap-1.5 rounded-2xl border border-edge bg-white p-3.5">
              <View className="flex-row items-center gap-2.5">
                <Avatar name={item.name} />
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink">{item.name}</Text>
                  <Text className="text-muted">{item.email}</Text>
                </View>
                <Badge tone={item.status === 'active' ? 'success' : 'danger'}>
                  {item.status === 'active' ? 'Activo' : 'Suspendido'}
                </Badge>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                  <Chip
                    key={r}
                    label={ROLE_LABEL[r]}
                    active={item.role === r}
                    onPress={() => void patch(item.id, { role: r })}
                  />
                ))}
              </View>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <View className="flex-1">
                  <Button
                    title={item.status === 'active' ? 'Suspender' : 'Activar'}
                    variant={item.status === 'active' ? 'danger' : 'secondary'}
                    disabled={busyId === item.id}
                    onPress={() => void patch(item.id, { status: item.status === 'active' ? 'suspended' : 'active' })}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Eliminar"
                    variant="ghost"
                    disabled={busyId === item.id}
                    onPress={() => void remove(item)}
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: Category[] }>('/categories');
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCategory() {
    if (!name.trim()) {
      setError('Escribe un nombre');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/categories', { method: 'POST', body: { name: name.trim(), kind: 'negocio' }, auth: true });
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing || !editName.trim()) {
      setError('Escribe un nombre');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/categories/${editing.id}`, { method: 'PATCH', body: { name: editName.trim() }, auth: true });
      setEditing(null);
      setEditName('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/categories/${id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Text className="mb-1 mt-2 text-[15px] font-bold text-ink">Nuevo tipo de negocio</Text>
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Panadería" />
      <Button title={busy ? 'Guardando…' : 'Crear tipo de negocio'} onPress={() => void createCategory()} disabled={busy} />
      {error && <Alert kind="error">{error}</Alert>}
      <Text className="mb-1 mt-2 text-[15px] font-bold text-ink">Existentes</Text>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="Sin tipos de negocio." />
      ) : (
        items
          .filter((c) => c.kind === 'negocio')
          .map((c) =>
            editing?.id === c.id ? (
              <Card key={c.id} className="mt-2.5">
                <Text className="mb-1 mt-2 text-[15px] font-bold text-ink">Editar tipo de negocio</Text>
                <TextField label="Nombre" value={editName} onChangeText={setEditName} placeholder="Ej. Panadería" />
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      title={busy ? 'Guardando…' : 'Guardar'}
                      variant="primary"
                      disabled={busy || !editName.trim()}
                      onPress={() => void saveEdit()}
                    />
                  </View>
                  <View className="flex-1">
                    <Button title="Cancelar" variant="ghost" disabled={busy} onPress={() => setEditing(null)} />
                  </View>
                </View>
              </Card>
            ) : (
              <Card key={c.id} className="mt-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-ink">{c.name}</Text>
                  <Badge tone="success">Negocio</Badge>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      title="Editar"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => {
                        setEditing(c);
                        setEditName(c.name);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Button title="Borrar" variant="danger" disabled={busy} onPress={() => void removeCategory(c.id)} />
                  </View>
                </View>
              </Card>
            ),
          )
      )}
    </ScrollView>
  );
}

function ProductCategoriesTab() {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: ProductCategory[] }>('/product-categories');
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCategory() {
    if (!name.trim()) {
      setError('Escribe un nombre');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/product-categories', { method: 'POST', body: { name: name.trim() }, auth: true });
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing || !editName.trim()) {
      setError('Escribe un nombre');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/product-categories/${editing.id}`, { method: 'PATCH', body: { name: editName.trim() }, auth: true });
      setEditing(null);
      setEditName('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/product-categories/${id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Text className="mb-1 mt-2 text-[15px] font-bold text-ink">Nueva categoría de producto</Text>
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Frutas y Verduras" />
      <Button title={busy ? 'Guardando…' : 'Crear categoría de producto'} onPress={() => void createCategory()} disabled={busy} />
      {error && <Alert kind="error">{error}</Alert>}
      <Text className="mb-1 mt-2 text-[15px] font-bold text-ink">Existentes</Text>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="Sin categorías de producto." />
      ) : (
        items.map((c) =>
          editing?.id === c.id ? (
            <Card key={c.id} className="mt-2.5">
              <Text className="mb-1 mt-2 text-[15px] font-bold text-ink">Editar categoría</Text>
              <TextField label="Nombre" value={editName} onChangeText={setEditName} placeholder="Ej. Frutas y Verduras" />
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    title={busy ? 'Guardando…' : 'Guardar'}
                    variant="primary"
                    disabled={busy || !editName.trim()}
                    onPress={() => void saveEdit()}
                  />
                </View>
                <View className="flex-1">
                  <Button title="Cancelar" variant="ghost" disabled={busy} onPress={() => setEditing(null)} />
                </View>
              </View>
            </Card>
          ) : (
            <Card key={c.id} className="mt-2.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-ink">{c.name}</Text>
                <Badge tone="neutral">Producto</Badge>
              </View>
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    title="Editar"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      setEditing(c);
                      setEditName(c.name);
                    }}
                  />
                </View>
                <View className="flex-1">
                  <Button title="Borrar" variant="danger" disabled={busy} onPress={() => void removeCategory(c.id)} />
                </View>
              </View>
            </Card>
          ),
        )
      )}
    </ScrollView>
  );
}

function BusinessesTab() {
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: AdminBusiness[] }>('/admin/businesses', { auth: true });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(b: AdminBusiness) {
    setBusyId(b.id);
    setError(null);
    try {
      await api(`/businesses/${b.id}`, {
        method: b.active ? 'DELETE' : 'PATCH',
        body: b.active ? undefined : { active: true },
        auth: true,
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  }

  async function doRemove(b: AdminBusiness) {
    setBusyId(b.id);
    setError(null);
    try {
      await api(`/admin/businesses/${b.id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  }

  function remove(b: AdminBusiness) {
    NativeAlert.alert(
      'Eliminar negocio',
      `¿Eliminar "${b.name}"? Se borrarán también sus productos y servicios. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void doRemove(b) },
      ],
    );
  }

  return (
    <View className="flex-1">
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="No hay negocios." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="mb-2.5 gap-1.5 rounded-2xl border border-edge bg-white p-3.5">
              <View className="flex-row items-center gap-2.5">
                <Avatar name={item.name} />
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink">{item.name}</Text>
                  {item.address ? <Text className="text-muted">{item.address}</Text> : null}
                </View>
                <Badge tone={item.active ? 'success' : 'neutral'}>
                  {item.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </View>
              <Text className="text-muted">
                {item.ownerName} ({item.ownerEmail})
              </Text>
              <Text className="text-muted">
                {item.itemsCount} producto{item.itemsCount === 1 ? '' : 's'}
              </Text>
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    title={item.active ? 'Desactivar' : 'Activar'}
                    variant={item.active ? 'secondary' : 'primary'}
                    disabled={busyId === item.id}
                    onPress={() => void toggle(item)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Eliminar"
                    variant="danger"
                    disabled={busyId === item.id}
                    onPress={() => void remove(item)}
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
