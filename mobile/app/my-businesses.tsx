import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api } from '../src/api/client';
import type { Business, Category } from '../src/api/types';
import { Alert, Button, Card, EmptyState, Loading, Screen, TextField } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';

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

  const chipOptions = [
    { id: '', label: 'Sin tipo de negocio' },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <Screen>
      {error && <Alert kind="error">{error}</Alert>}
      <Button
        title={showForm ? 'Cancelar' : '+ Nuevo negocio'}
        variant={showForm ? 'ghost' : 'primary'}
        onPress={toggleForm}
      />

      {showForm && (
        <Card className="mt-3">
          <Text className="text-base font-bold text-ink">
            {editing ? 'Editar negocio' : 'Nuevo negocio'}
          </Text>
          <TextField label="Nombre *" value={name} onChangeText={setName} />
          <TextField label="Dirección" value={address} onChangeText={setAddress} />
          <Button title="Usar mi ubicación (GPS)" variant="secondary" onPress={() => void locateMe()} />
          {(coords.latitude !== undefined || coords.longitude !== undefined) && (
            <Text className="text-sm text-muted">
              Ubicación fijada ({coords.latitude?.toFixed(4)}, {coords.longitude?.toFixed(4)})
            </Text>
          )}
          <Text className="mt-1 text-[13px] font-semibold text-muted">Tipo de negocio</Text>
          <View className="flex-row flex-wrap gap-2">
            {chipOptions.map((option) => {
              const active = categoryId === option.id;
              return (
                <Pressable
                  key={option.id || 'none'}
                  className={`rounded-full border px-2.5 py-1.5 active:opacity-70 ${
                    active ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
                  }`}
                  onPress={() => setCategoryId(option.id)}
                >
                  <Text className={`text-[13px] ${active ? 'text-white' : 'text-muted'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              className={`rounded-full border px-2.5 py-1.5 active:opacity-70 ${
                showNewCat ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
              }`}
              onPress={() => {
                setShowNewCat((v) => !v);
                setNewCatName('');
              }}
            >
              <Text className={`text-[13px] ${showNewCat ? 'text-white' : 'text-muted'}`}>+ Nueva</Text>
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
        </Card>
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
            <View className="mb-2.5 gap-1 rounded-2xl border border-edge bg-white p-3.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-[17px] font-bold text-ink">{item.name}</Text>
                <View
                  className={`rounded-full px-2.5 py-0.5 ${
                    item.active ? 'bg-brand-50' : 'bg-red-50'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      item.active ? 'text-brand-700' : 'text-red-700'
                    }`}
                  >
                    {item.active ? 'activo' : 'inactivo'}
                  </Text>
                </View>
              </View>
              {item.address ? <Text className="text-muted">{item.address}</Text> : null}
              <Text className="text-muted">
                {item.itemsCount ?? 0} producto{item.itemsCount === 1 ? '' : 's'}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <Pressable
                  className="rounded-lg bg-brand-600 px-3 py-2 active:opacity-70"
                  onPress={() => router.push(`/my-businesses/${item.id}`)}
                >
                  <Text className="font-semibold text-white">Gestionar</Text>
                </Pressable>
                <Pressable
                  className="rounded-lg px-3 py-2 active:opacity-70"
                  onPress={() => startEdit(item)}
                >
                  <Text className="font-semibold text-muted">Editar</Text>
                </Pressable>
                <Pressable
                  className="rounded-lg px-3 py-2 active:opacity-70"
                  onPress={() => void toggleActive(item)}
                >
                  <Text className="font-semibold text-muted">
                    {item.active ? 'Desactivar' : 'Activar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
