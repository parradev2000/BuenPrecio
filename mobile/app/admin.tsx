import { useCallback, useEffect, useState } from 'react';
import { Alert as NativeAlert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { api, ApiError } from '../src/api/client';
import type {
  AdminApplication,
  AdminBusiness,
  ApplicationStatus,
  Category,
  ProductCategory,
  User,
  UserRole,
} from '../src/api/types';
import { Alert, Button, EmptyState, Loading, Screen, TextField } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/lib/format';

type TabId = 'applications' | 'users' | 'categories' | 'productCategories' | 'businesses';

const TABS: { id: TabId; label: string }[] = [
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

export default function AdminScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<TabId>('applications');

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
      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'productCategories' && <ProductCategoriesTab />}
      {tab === 'businesses' && <BusinessesTab />}
    </Screen>
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
              <Text style={styles.cardTitle}>{item.userName}</Text>
              <Text style={styles.muted}>{item.userEmail}</Text>
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
              ) : (
                <Text style={styles.muted}>Estado: {STATUS_LABEL[item.status]}</Text>
              )}
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
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.email} · {item.status === 'active' ? 'activo' : 'suspendido'}
              </Text>
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
          .map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <Text style={styles.muted}>Negocio</Text>
              </View>
              <Button title="Borrar" variant="danger" disabled={busy} onPress={() => void removeCategory(c.id)} />
            </View>
          ))
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
        items.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{c.name}</Text>
              <Text style={styles.muted}>Producto</Text>
            </View>
            <Button title="Borrar" variant="danger" disabled={busy} onPress={() => void removeCategory(c.id)} />
          </View>
        ))
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
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={item.active ? styles.activeBadge : styles.inactiveBadge}>
                  {item.active ? 'activo' : 'inactivo'}
                </Text>
              </View>
              {item.address ? <Text style={styles.muted}>{item.address}</Text> : null}
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
  activeBadge: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  inactiveBadge: {
    color: COLORS.dangerDark,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
});