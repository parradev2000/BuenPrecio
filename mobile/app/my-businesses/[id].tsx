import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Platform, Pressable, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/api/client';
import type { Business, BusinessItem, ItemType, ProductCategory } from '../../src/api/types';
import { Alert, Button, Card, EmptyState, Loading, Screen, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { formatPrice, mediaUrl } from '../../src/lib/format';

const ITEM_UNITS = ['unidad', 'kg', 'litro', 'paquete'] as const;

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

export default function BusinessItemsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessItem | null>(null);
  const [type, setType] = useState<ItemType>('producto');
  const [unit, setUnit] = useState<string>('unidad');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, cats] = await Promise.all([
        api<{ business: Business & { items: BusinessItem[] } }>(`/businesses/${id}`, { auth: true }),
        api<{ items: ProductCategory[] }>('/product-categories'),
      ]);
      setBusiness(res.business);
      setItems(res.business.items ?? []);
      setProductCategories(cats.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) {
    return <Redirect href="/login" />;
  }
  if (session.user.role !== 'productor') {
    return <Redirect href="/" />;
  }

  async function addItem() {
    const parsedPrice = Number(price);
    if (!name.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Escribe nombre y un precio mayor a 0');
      return;
    }
    if (!categoryId && !(newCategoryOpen && newCategoryName.trim())) {
      setError('Selecciona una categoría o crea una nueva');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { type, name: name.trim(), price: parsedPrice };
      if (newCategoryOpen && newCategoryName.trim()) body.newCategoryName = newCategoryName.trim();
      else body.categoryId = categoryId;
      if (type === 'producto') {
        body.unit = unit || 'unidad';
      } else {
        body.unit = null;
      }
      if (photoUrl.trim()) body.photoUrl = photoUrl.trim();
      else if (editing) body.photoUrl = null;
      if (editing) {
        await api(`/items/${editing.id}`, { method: 'PATCH', body, auth: true });
      } else {
        await api(`/businesses/${id}/items`, { method: 'POST', body, auth: true });
      }
      setName('');
      setPrice('');
      setPhotoUrl('');
      setPhotoPreview(null);
      setCategoryId('');
      setNewCategoryOpen(false);
      setNewCategoryName('');
      setEditing(null);
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el producto');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: BusinessItem) {
    setEditing(item);
    setType(item.type);
    setUnit(item.unit ?? 'unidad');
    setName(item.name);
    setPrice(String(item.price));
    setPhotoUrl(item.photoUrl ?? '');
    setPhotoPreview(null);
    setCategoryId(item.categoryId ?? '');
    setNewCategoryOpen(false);
    setNewCategoryName('');
    setFormOpen(true);
    setError(null);
  }

  async function pickPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Necesitas permitir el acceso a la galería para subir fotos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (asset.fileSize != null && asset.fileSize > 5 * 1024 * 1024) {
        setError('El archivo es demasiado grande (máximo 5 MB)');
        return;
      }
      setPhotoPreview(asset.uri);
      setPhotoUploading(true);
      setError(null);
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        form.append('file', blob, asset.fileName ?? 'producto.jpg');
      } else {
        form.append('file', {
          uri: asset.uri,
          name: asset.fileName ?? 'producto.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      }
      const res = await api<{ url: string }>('/uploads', { method: 'POST', body: form, auth: true });
      setPhotoUrl(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function toggleAvailable(item: BusinessItem) {
    await api(`/items/${item.id}`, { method: 'PATCH', body: { available: !item.available }, auth: true });
    await load();
  }

  async function removeItem(item: BusinessItem) {
    await api(`/items/${item.id}`, { method: 'DELETE', auth: true });
    await load();
  }

  return (
    <Screen>
      {error && <Alert kind="error">{error}</Alert>}
      {business && (
        <Text className="mb-3 text-muted">
          {business.name} · {business.active ? 'activo' : 'inactivo'}
        </Text>
      )}
      <Button
        title={formOpen ? 'Cancelar' : '+ Nuevo producto'}
        variant={formOpen ? 'ghost' : 'primary'}
        onPress={() => {
          setFormOpen((v) => !v);
          setEditing(null);
          setPhotoPreview(null);
        }}
      />

      {formOpen && (
        <Card className="mt-3">
          <View className="flex-row gap-2">
            <Pressable
              className={`flex-1 rounded-lg border py-2 active:opacity-70 ${
                type === 'producto' ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
              }`}
              onPress={() => setType('producto')}
            >
              <Text className={`text-center font-semibold ${type === 'producto' ? 'text-white' : 'text-muted'}`}>
                Producto
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 rounded-lg border py-2 active:opacity-70 ${
                type === 'servicio' ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
              }`}
              onPress={() => setType('servicio')}
            >
              <Text className={`text-center font-semibold ${type === 'servicio' ? 'text-white' : 'text-muted'}`}>
                Servicio
              </Text>
            </Pressable>
          </View>
          {type === 'producto' && (
            <View className="flex-row flex-wrap gap-2">
              {ITEM_UNITS.map((u) => (
                <Choice key={u} label={u} active={unit === u} onPress={() => setUnit(u)} />
              ))}
            </View>
          )}
          <TextField label="Nombre *" value={name} onChangeText={setName} placeholder="Ej. Café con leche" />
          <Text className="mt-1 text-[13px] font-semibold text-muted">Categoría *</Text>
          <View className="flex-row flex-wrap gap-2">
            {productCategories.map((c) => (
              <Choice
                key={c.id}
                label={c.name}
                active={categoryId === c.id}
                onPress={() => {
                  setCategoryId(c.id);
                  setNewCategoryOpen(false);
                }}
              />
            ))}
            <Choice
              label="+ Nueva"
              active={newCategoryOpen}
              onPress={() => {
                setNewCategoryOpen((v) => !v);
                setCategoryId('');
                setNewCategoryName('');
              }}
            />
          </View>
          {newCategoryOpen && (
            <TextField
              label="Nueva categoría *"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Ej. Panadería"
            />
          )}
          <TextField
            label="Precio (CUP) *"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <Text className="mt-1 text-[13px] font-semibold text-muted">Foto (opcional)</Text>
          <View className="mb-1 gap-2.5">
            <Pressable
              className={`self-start rounded-xl bg-brand-600 px-3.5 py-2.5 active:opacity-70 ${
                photoUploading ? 'opacity-60' : ''
              }`}
              onPress={() => void pickPhoto()}
              disabled={photoUploading}
            >
              <Text className="font-bold text-white">
                {photoUploading ? 'Subiendo…' : 'Seleccionar foto'}
              </Text>
            </Pressable>
            {photoUrl.trim() || photoPreview ? (
              <View className="flex-row items-center gap-3">
                <Image
                  source={{ uri: photoPreview ?? mediaUrl(photoUrl) ?? '' }}
                  className="rounded-[10px] border border-edge"
                  style={{ width: 72, height: 72 }}
                />
                <Pressable
                  onPress={() => {
                    setPhotoUrl('');
                    setPhotoPreview(null);
                  }}
                >
                  <Text className="font-semibold text-red-600">Quitar</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Button
            title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar producto'}
            onPress={() => void addItem()}
            disabled={busy}
          />
        </Card>
      )}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="Este negocio todavía no tiene productos." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View
              className={`mb-2 flex-row items-center justify-between rounded-2xl border border-edge bg-white p-3.5 ${
                item.available ? '' : 'opacity-55'
              }`}
            >
              <View className={item.photoUrl ? 'shrink flex-row items-center gap-2.5' : 'shrink gap-0.5'}>
                {item.photoUrl ? (
                  <Image
                    source={{ uri: mediaUrl(item.photoUrl) ?? '' }}
                    className="rounded-lg"
                    style={{ width: 52, height: 52 }}
                  />
                ) : null}
                <View className="shrink">
                  <Text className="text-base font-semibold text-ink">{item.name}</Text>
                  <Text className="text-muted">
                    {item.type === 'servicio' ? 'servicio' : item.unit ?? 'unidad'}
                    {!item.available ? ' · oculto' : ''}
                  </Text>
                </View>
              </View>
              <View className="items-end gap-1.5">
                <Text className="text-base font-bold text-brand-700">{formatPrice(item.price)}</Text>
                <Pressable className="self-end" onPress={() => startEdit(item)}>
                  <Text className="font-semibold text-muted">Editar</Text>
                </Pressable>
                <Pressable className="self-end" onPress={() => void toggleAvailable(item)}>
                  <Text className="font-semibold text-muted">
                    {item.available ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </Pressable>
                <Pressable
                  className="self-end rounded-lg bg-red-600 px-2.5 py-1.5 active:opacity-70"
                  onPress={() => void removeItem(item)}
                >
                  <Text className="font-semibold text-white">Borrar</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
