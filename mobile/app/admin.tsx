import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert as NativeAlert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
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
import { Alert, Button, EmptyState, Loading, Screen, TextField } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { badgeColors, COLORS, type BadgeTone } from '../src/lib/format';

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

function formatDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const { bg, fg } = badgeColors(tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
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
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

const APPLICATION_TONE: Record<ApplicationStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

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
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
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
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  function ChartBar({ value, max, color }: { value: number; max: number; color: string }) {
    return (
      <View style={styles.barCol}>
        <Text style={styles.barValue}>{value}</Text>
        <View
          style={[
            styles.chartBar,
            { height: Math.max(2, Math.round((value / max) * 130)), backgroundColor: color },
          ]}
        />
      </View>
    );
  }

  function BarChart({
    title,
    rows,
    color,
  }: {
    title: string;
    rows: { name: string; count: number }[];
    color: string;
  }) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
      <View style={styles.chart}>
        <Text style={styles.chartTitle}>{title}</Text>
        {rows.length === 0 ? (
          <Text style={styles.chartEmpty}>Sin datos todavía.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartGroups}>
              {rows.map((row) => (
                <View key={row.name} style={styles.chartGroup}>
                  <ChartBar value={row.count} max={max} color={color} />
                  <Text style={styles.chartName} numberOfLines={1}>
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

  function PerBusinessChart({ rows }: { rows: { name: string; products: number; services: number }[] }) {
    const max = Math.max(1, ...rows.map((r) => r.products + r.services));
    return (
      <View style={styles.chart}>
        <Text style={styles.chartTitle}>Productos y servicios por negocio</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primaryDark }]} />
            <Text style={styles.legendText}>Productos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#e19125' }]} />
            <Text style={styles.legendText}>Servicios</Text>
          </View>
        </View>
        {rows.length === 0 ? (
          <Text style={styles.chartEmpty}>Sin datos todavía.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartGroups}>
              {rows.map((row) => (
                <View key={row.name} style={styles.chartGroup}>
                  <View style={styles.chartBars}>
                    <ChartBar value={row.products} max={max} color={COLORS.primaryDark} />
                    <ChartBar value={row.services} max={max} color="#e19125" />
                  </View>
                  <Text style={styles.chartName} numberOfLines={1}>
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
    <View style={styles.body}>
      <View style={styles.adminHead}>
        <View style={styles.userInfo}>
          <Text style={styles.cardTitle}>Dashboard</Text>
          <Text style={styles.muted}>Datos generales de la plataforma.</Text>
        </View>
        <Button title="Actualizar" variant="secondary" disabled={loading} onPress={() => void load()} />
      </View>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Loading />
      ) : stats ? (
        <ScrollView contentContainerStyle={styles.statContent}>
          <View style={styles.statGrid}>
            <StatCard value={stats.totals.businesses} label="Negocios" />
            <StatCard value={stats.totals.products} label="Productos" />
            <StatCard value={stats.totals.services} label="Servicios" />
          </View>

          <PerBusinessChart rows={stats.byBusiness} />

          <BarChart
            title="Negocios por tipo de negocio"
            rows={stats.businessesByCategory}
            color={COLORS.primary}
          />

          <BarChart
            title="Productos por categoría de producto"
            rows={stats.productsByCategory}
            color="#2d6cdf"
          />
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
    <View style={styles.body}>
      <View style={styles.chips}>
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, status === s && styles.chipActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{STATUS_LABEL[s]}</Text>
          </Pressable>
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
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.userRow}>
                <Avatar name={item.userName} />
                <View style={styles.userInfo}>
                  <Text style={styles.cardTitle}>{item.userName}</Text>
                  <Text style={styles.muted}>{item.userEmail}</Text>
                </View>
                <Badge tone={APPLICATION_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              </View>
              <Text style={styles.muted}>Solicitó el {formatDate(item.createdAt)}</Text>
              {item.status === 'pending' ? (
                <View style={styles.rowActions}>
                  <Button
                    title={busyId === item.id ? '…' : 'Aprobar'}
                    variant="primary"
                    disabled={busyId !== null}
                    onPress={() => void review(item.id, 'approve')}
                  />
                  <Button
                    title={busyId === item.id ? '…' : 'Rechazar'}
                    variant="danger"
                    disabled={busyId !== null}
                    onPress={() => void review(item.id, 'reject')}
                  />
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
    <View style={styles.body}>
      <View style={styles.rowActions}>
        <TextField
          label="Buscar por nombre"
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSearch(v);
          }}
          placeholder="Escribe…"
        />
      </View>
      <View style={styles.chips}>
        <Pressable style={[styles.chip, role === '' && styles.chipActive]} onPress={() => setRole('')}>
          <Text style={[styles.chipText, role === '' && styles.chipTextActive]}>Todos</Text>
        </Pressable>
        {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
          <Pressable key={r} style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
            <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{ROLE_LABEL[r]}</Text>
          </Pressable>
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
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.userRow}>
                <Avatar name={item.name} />
                <View style={styles.userInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.muted}>{item.email}</Text>
                </View>
                <Badge tone={item.status === 'active' ? 'success' : 'danger'}>
                  {item.status === 'active' ? 'Activo' : 'Suspendido'}
                </Badge>
              </View>
              <View style={styles.chips}>
                {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.chip, item.role === r && styles.chipActive]}
                    onPress={() => void patch(item.id, { role: r })}
                  >
                    <Text style={[styles.chipText, item.role === r && styles.chipTextActive]}>{ROLE_LABEL[r]}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.rowActions}>
                <Button
                  title={item.status === 'active' ? 'Suspender' : 'Activar'}
                  variant={item.status === 'active' ? 'danger' : 'secondary'}
                  disabled={busyId === item.id}
                  onPress={() => void patch(item.id, { status: item.status === 'active' ? 'suspended' : 'active' })}
                />
                <Button
                  title="Eliminar"
                  variant="ghost"
                  disabled={busyId === item.id}
                  onPress={() => void remove(item)}
                />
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
    <ScrollView style={styles.body} contentContainerStyle={styles.list}>
      <Text style={styles.sectionTitle}>Nuevo tipo de negocio</Text>
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Panadería" />
      <Button title={busy ? 'Guardando…' : 'Crear tipo de negocio'} onPress={() => void createCategory()} disabled={busy} />
      {error && <Alert kind="error">{error}</Alert>}
      <Text style={styles.sectionTitle}>Existentes</Text>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="Sin tipos de negocio." />
      ) : (
        items
          .filter((c) => c.kind === 'negocio')
          .map((c) =>
            editing?.id === c.id ? (
              <View key={c.id} style={styles.card}>
                <Text style={styles.sectionTitle}>Editar tipo de negocio</Text>
                <TextField label="Nombre" value={editName} onChangeText={setEditName} placeholder="Ej. Panadería" />
                <View style={styles.rowActions}>
                  <Button
                    title={busy ? 'Guardando…' : 'Guardar'}
                    variant="primary"
                    disabled={busy || !editName.trim()}
                    onPress={() => void saveEdit()}
                  />
                  <Button title="Cancelar" variant="ghost" disabled={busy} onPress={() => setEditing(null)} />
                </View>
              </View>
            ) : (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Badge tone="success">Negocio</Badge>
                </View>
                <View style={styles.rowActions}>
                  <Button
                    title="Editar"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      setEditing(c);
                      setEditName(c.name);
                    }}
                  />
                  <Button title="Borrar" variant="danger" disabled={busy} onPress={() => void removeCategory(c.id)} />
                </View>
              </View>
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
    <ScrollView style={styles.body} contentContainerStyle={styles.list}>
      <Text style={styles.sectionTitle}>Nueva categoría de producto</Text>
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Frutas y Verduras" />
      <Button title={busy ? 'Guardando…' : 'Crear categoría de producto'} onPress={() => void createCategory()} disabled={busy} />
      {error && <Alert kind="error">{error}</Alert>}
      <Text style={styles.sectionTitle}>Existentes</Text>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="Sin categorías de producto." />
      ) : (
        items.map((c) =>
          editing?.id === c.id ? (
            <View key={c.id} style={styles.card}>
              <Text style={styles.sectionTitle}>Editar categoría</Text>
              <TextField label="Nombre" value={editName} onChangeText={setEditName} placeholder="Ej. Frutas y Verduras" />
              <View style={styles.rowActions}>
                <Button
                  title={busy ? 'Guardando…' : 'Guardar'}
                  variant="primary"
                  disabled={busy || !editName.trim()}
                  onPress={() => void saveEdit()}
                />
                <Button title="Cancelar" variant="ghost" disabled={busy} onPress={() => setEditing(null)} />
              </View>
            </View>
          ) : (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <Badge tone="neutral">Producto</Badge>
              </View>
              <View style={styles.rowActions}>
                <Button
                  title="Editar"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    setEditing(c);
                    setEditName(c.name);
                  }}
                />
                <Button title="Borrar" variant="danger" disabled={busy} onPress={() => void removeCategory(c.id)} />
              </View>
            </View>
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

  return (
    <View style={styles.body}>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="No hay negocios." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.userRow}>
                <Avatar name={item.name} />
                <View style={styles.userInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.address ? <Text style={styles.muted}>{item.address}</Text> : null}
                </View>
                <Badge tone={item.active ? 'success' : 'neutral'}>
                  {item.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </View>
              <Text style={styles.muted}>
                {item.ownerName} ({item.ownerEmail})
              </Text>
              <Text style={styles.muted}>
                {item.itemsCount} producto{item.itemsCount === 1 ? '' : 's'}
              </Text>
              <Button
                title={item.active ? 'Desactivar' : 'Activar'}
                variant={item.active ? 'secondary' : 'primary'}
                disabled={busyId === item.id}
                onPress={() => void toggle(item)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.muted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  body: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  muted: {
    color: COLORS.muted,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  adminHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  statContent: {
    paddingBottom: 24,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  chart: {
    marginTop: 18,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: COLORS.muted,
  },
  chartEmpty: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 6,
  },
  chartGroups: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: 8,
  },
  chartGroup: {
    alignItems: 'center',
    gap: 6,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barCol: {
    alignItems: 'center',
    gap: 2,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  chartBar: {
    width: 24,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartName: {
    fontSize: 12,
    color: COLORS.muted,
    maxWidth: 76,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
});