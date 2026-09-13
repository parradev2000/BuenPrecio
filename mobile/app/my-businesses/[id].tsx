import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/api/client';
import type { Business, BusinessItem, ItemType } from '../../src/api/types';
import { Alert, Button, EmptyState, Loading, Screen, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, formatPrice, mediaUrl } from '../../src/lib/format';

const ITEM_UNITS = ['unidad', 'kg', 'litro', 'paquete'] as const;

export default function BusinessItemsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [items, setItems] = useState<BusinessItem[]>([]);
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
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ business: Business & { items: BusinessItem[] } }>(`/businesses/${id}`, { auth: true });
      setBusiness(res.business);
      setItems(res.business.items ?? []);
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
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { type, name: name.trim(), price: parsedPrice };
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
      setEditing(null);
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el ítem');
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
        <Text style={styles.muted}>
          {business.name} · {business.active ? 'activo' : 'inactivo'}
        </Text>
      )}
      <Button
        title={formOpen ? 'Cancelar' : '+ Nuevo ítem'}
        variant={formOpen ? 'ghost' : 'primary'}
        onPress={() => {
          setFormOpen((v) => !v);
          setEditing(null);
          setPhotoPreview(null);
        }}
      />

      {formOpen && (
        <View style={styles.form}>
          <View style={styles.formRow}>
            <Pressable
              style={[styles.typeBtn, type === 'producto' && styles.typeBtnActive]}
              onPress={() => setType('producto')}
            >
              <Text style={[styles.typeBtnText, type === 'producto' && styles.typeBtnTextActive]}>Producto</Text>
            </Pressable>
            <Pressable
              style={[styles.typeBtn, type === 'servicio' && styles.typeBtnActive]}
              onPress={() => setType('servicio')}
            >
              <Text style={[styles.typeBtnText, type === 'servicio' && styles.typeBtnTextActive]}>Servicio</Text>
            </Pressable>
          </View>
          {type === 'producto' && (
            <View style={styles.formRow}>
              {ITEM_UNITS.map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextField label="Nombre *" value={name} onChangeText={setName} placeholder="Ej. Café con leche" />
          <TextField
            label="Precio (CUP) *"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Foto (opcional)</Text>
          <View style={styles.photoRow}>
            <Pressable
              style={[styles.photoBtn, photoUploading && styles.photoBtnDisabled]}
              onPress={() => void pickPhoto()}
              disabled={photoUploading}
            >
              <Text style={styles.photoBtnText}>
                {photoUploading ? 'Subiendo…' : 'Seleccionar foto'}
              </Text>
            </Pressable>
            {photoUrl.trim() || photoPreview ? (
              <View style={styles.photoPreviewWrap}>
                <Image
                  source={{ uri: photoPreview ?? mediaUrl(photoUrl) ?? '' }}
                  style={styles.photoPreview}
                />
                <Pressable
                  onPress={() => {
                    setPhotoUrl('');
                    setPhotoPreview(null);
                  }}
                >
                  <Text style={styles.photoClear}>Quitar</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Button
            title={busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar ítem'}
            onPress={() => void addItem()}
            disabled={busy}
          />
        </View>
      )}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="Este negocio todavía no tiene ítems." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={[styles.row, !item.available && styles.rowOff]}>
              <View style={[styles.rowLeft, item.photoUrl && styles.rowLeftWithPhoto]}>
                {item.photoUrl ? <Image source={{ uri: mediaUrl(item.photoUrl) ?? '' }} style={styles.itemThumb} /> : null}
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.muted}>
                    {item.type === 'servicio' ? 'servicio' : item.unit ?? 'unidad'}
                    {!item.available ? ' · oculto' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
                <Pressable style={styles.smallBtnGhost} onPress={() => startEdit(item)}>
                  <Text style={styles.smallBtnGhostText}>Editar</Text>
                </Pressable>
                <Pressable style={styles.smallBtnGhost} onPress={() => void toggleAvailable(item)}>
                  <Text style={styles.smallBtnGhostText}>{item.available ? 'Ocultar' : 'Mostrar'}</Text>
                </Pressable>
                <Pressable style={styles.smallBtnDanger} onPress={() => void removeItem(item)}>
                  <Text style={styles.smallBtnDangerText}>Borrar</Text>
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
  muted: {
    color: COLORS.muted,
    marginBottom: 12,
  },
  form: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  photoRow: {
    gap: 10,
    marginBottom: 4,
  },
  photoBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  photoBtnDisabled: {
    opacity: 0.6,
  },
  photoBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  photoPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoClear: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  typeBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeBtnText: {
    color: COLORS.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  unitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitBtnActive: {
    backgroundColor: COLORS.primary,
  },
  unitText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  unitTextActive: {
    color: '#fff',
  },
  row: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowOff: {
    opacity: 0.55,
  },
  rowLeft: {
    flexShrink: 1,
    gap: 2,
  },
  rowLeftWithPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 16,
  },
  price: {
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 16,
  },
  smallBtnGhost: {
    alignSelf: 'flex-end',
  },
  smallBtnGhostText: {
    color: COLORS.muted,
    fontWeight: '600',
  },
  smallBtnDanger: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-end',
  },
  smallBtnDangerText: {
    color: '#fff',
    fontWeight: '600',
  },
});