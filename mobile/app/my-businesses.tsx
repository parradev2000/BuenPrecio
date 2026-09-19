import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api } from '../src/api/client';
import type { Business, Category } from '../src/api/types';
import { Alert, Button, EmptyState, Loading, Screen, TextField } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/lib/format';

export default function MyBusinessesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [my, cats] = await Promise.all([
        api<{ items: Business[] }>('/my/businesses', { auth: true }),
        api<{ items: Category[] }>('/categories'),
      ]);
      setItems(my.items);
      setCategories(cats.items.filter((c) => c.kind === 'negocio'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setName('');
    setAddress('');
    setCategoryId('');
    setCoords({});
    setShowNewCat(false);
    setNewCatName('');
    setEditing(null);
  }

  function toggleForm() {
    if (showForm) {
      resetForm();
      setShowForm(false);
      setError(null);
    } else {
      resetForm();
      setShowForm(true);
    }
  }

  function startEdit(b: Business) {
    setEditing(b);
    setName(b.name);
    setAddress(b.address ?? '');
    setCategoryId(b.categoryId ?? '');
    setCoords({ latitude: b.latitude ?? undefined, longitude: b.longitude ?? undefined });
    setShowNewCat(false);
    setError(null);
    setShowForm(true);
  }

  async function saveBusiness() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string | number> = { name };
      if (address || editing) body.address = address;
      if (categoryId) body.categoryId = categoryId;
      if (coords.latitude !== undefined) body.latitude = coords.latitude;
      if (coords.longitude !== undefined) body.longitude = coords.longitude;
      if (editing) {
        await api(`/businesses/${editing.id}`, { method: 'PATCH', body, auth: true });
        resetForm();
        setShowForm(false);
        await load();
      } else {
        const res = await api<{ business: Business }>('/businesses', { method: 'POST', body, auth: true });
        resetForm();
        setShowForm(false);
        router.push(`/my-businesses/${res.business.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : editing ? 'No se pudo guardar' : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  }

  async function locateMe() {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('No se concedió permiso de ubicación');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const [match] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (match) {
        const parts = [match.street, match.city, match.region, match.country].filter(Boolean);
        setAddress(parts.join(', ') || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      } else {
        setAddress(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      }
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener la ubicación');
    }
  }

  async function createCategory() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ category: Category }>('/categories', {
        method: 'POST',
        auth: true,
        body: { name: newCatName.trim(), kind: 'negocio' },
      });
      setCategories((prev) => [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(res.category.id);
      setShowNewCat(false);
      setNewCatName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el tipo de negocio');
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return <Redirect href="/login" />;
  }
  if (session.user.role !== 'productor') {
    return <Redirect href="/" />;
  }

  async function toggleActive(b: Business) {
    await api(`/businesses/${b.id}`, {
      method: b.active ? 'DELETE' : 'PATCH',
      body: b.active ? undefined : { active: true },
      auth: true,
    });
    await load();
  }

  return (
    <Screen>
      {error && <Alert kind="error">{error}</Alert>}
      <Button
        title={showForm ? 'Cancelar' : '+ Nuevo negocio'}
        variant={showForm ? 'ghost' : 'primary'}
        onPress={toggleForm}
      />

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editing ? 'Editar negocio' : 'Nuevo negocio'}</Text>
          <TextField label="Nombre *" value={name} onChangeText={setName} />
          <TextField label="Dirección" value={address} onChangeText={setAddress} />
          <Button title="Usar mi ubicación (GPS)" variant="secondary" onPress={() => void locateMe()} />
          {(coords.latitude !== undefined || coords.longitude !== undefined) && (
            <Text style={styles.muted}>
              Ubicación fijada ({coords.latitude?.toFixed(4)}, {coords.longitude?.toFixed(4)})
            </Text>
          )}
          <Text style={styles.label}>Tipo de negocio</Text>
          <View style={styles.chips}>
            <Pressable
              style={[styles.chip, categoryId === '' && styles.chipActive]}
              onPress={() => setCategoryId('')}
            >
              <Text style={[styles.chipText, categoryId === '' && styles.chipTextActive]}>Sin tipo de negocio</Text>
            </Pressable>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.chip, showNewCat && styles.chipActive]}
              onPress={() => {
                setShowNewCat((v) => !v);
                setNewCatName('');
              }}
            >
              <Text style={[styles.chipText, showNewCat && styles.chipTextActive]}>+ Nueva</Text>
            </Pressable>
          </View>
          {showNewCat && (
            <>
              <TextField
                label="Nuevo tipo de negocio"
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Ej. Panadería"
              />
              <Button
                title={busy ? 'Creando…' : 'Crear tipo de negocio'}
                variant="secondary"
                onPress={() => void createCategory()}
                disabled={busy || !newCatName.trim()}
              />
            </>
          )}
          <Button
            title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear negocio'}
            onPress={() => void saveBusiness()}
            disabled={busy || !name.trim()}
          />
        </View>
      )}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="Aún no tienes negocios. ¡Crea el primero!" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={item.active ? styles.chipOn : styles.chipOff}>
                  {item.active ? 'activo' : 'inactivo'}
                </Text>
              </View>
              {item.address ? <Text style={styles.muted}>{item.address}</Text> : null}
              <Text style={styles.muted}>
                {item.itemsCount ?? 0} producto{item.itemsCount === 1 ? '' : 's'}
              </Text>
              <View style={styles.rowActions}>
                <Pressable style={styles.smallBtn} onPress={() => router.push(`/my-businesses/${item.id}`)}>
                  <Text style={styles.smallBtnText}>Gestionar</Text>
                </Pressable>
                <Pressable style={[styles.smallBtn, styles.smallBtnGhost]} onPress={() => startEdit(item)}>
                  <Text style={styles.smallBtnGhostText}>Editar</Text>
                </Pressable>
                <Pressable style={[styles.smallBtn, styles.smallBtnGhost]} onPress={() => void toggleActive(item)}>
                  <Text style={styles.smallBtnGhostText}>{item.active ? 'Desactivar' : 'Activar'}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  muted: {
    color: COLORS.muted,
  },
  chipOn: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chipOff: {
    color: COLORS.dangerDark,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  smallBtnGhost: {
    backgroundColor: 'transparent',
  },
  smallBtnGhostText: {
    color: COLORS.muted,
    fontWeight: '600',
  },
});