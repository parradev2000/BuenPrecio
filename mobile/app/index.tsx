import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api/client';
import type { CatalogBusiness, CatalogProduct, Category, ProductCategory } from '../src/api/types';
import { useAuth } from '../src/context/AuthContext';
import { type LocationStatus, useUserLocation } from '../src/hooks/useUserLocation';
import { COLORS, formatDistance, formatPrice, mediaUrl } from '../src/lib/format';
import { EmptyState, Loading, Screen } from '../src/components/ui';
import { PhotoLightbox } from '../src/components/PhotoLightbox';

type CatalogView = 'productos' | 'negocios';

export default function CatalogScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [view, setView] = useState<CatalogView>('productos');

  return (
    <Screen>
      {session?.user.role === 'administrador' && (
        <Pressable
          className="mb-2.5 items-center rounded-xl bg-brand-600 py-3 active:opacity-70"
          onPress={() => router.push('/admin')}
        >
          <Text className="text-[15px] font-bold text-white">Dashboard</Text>
        </Pressable>
      )}
      {session?.user.role === 'productor' && (
        <Pressable
          className="mb-2.5 items-center rounded-xl bg-brand-600 py-3 active:opacity-70"
          onPress={() => router.push('/my-businesses')}
        >
          <Text className="text-[15px] font-bold text-white">Gestionar mis negocios</Text>
        </Pressable>
      )}

      <View className="mb-3 flex-row gap-2">
        <Pressable
          className={`flex-1 items-center rounded-xl border py-2.5 active:opacity-70 ${
            view === 'productos' ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
          }`}
          onPress={() => setView('productos')}
        >
          <Text className={`text-[15px] font-bold ${view === 'productos' ? 'text-white' : 'text-muted'}`}>
            Productos
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-xl border py-2.5 active:opacity-70 ${
            view === 'negocios' ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
          }`}
          onPress={() => setView('negocios')}
        >
          <Text className={`text-[15px] font-bold ${view === 'negocios' ? 'text-white' : 'text-muted'}`}>
            Negocios
          </Text>
        </Pressable>
      </View>

      {view === 'productos' ? <ProductsCatalog /> : <BusinessesCatalog />}
    </Screen>
  );
}

function CategoryChips({
  categories,
  categoryId,
  onSelect,
}: {
  categories: { id: string; name: string }[];
  categoryId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      <Pressable
        className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
          categoryId === '' ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
        }`}
        onPress={() => onSelect('')}
      >
        <Text className={`text-[13px] font-semibold ${categoryId === '' ? 'text-white' : 'text-muted'}`}>
          Todas
        </Text>
      </Pressable>
      {categories.map((c) => {
        const active = categoryId === c.id;
        return (
          <Pressable
            key={c.id}
            className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
              active ? 'border-brand-600 bg-brand-600' : 'border-edge bg-white'
            }`}
            onPress={() => onSelect(c.id)}
          >
            <Text className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProductsCatalog() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const { status, coords, error, enable, disable } = useUserLocation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId) params.set('categoryId', categoryId);
      if (status === 'enabled' && coords) {
        params.set('lat', String(coords.latitude));
        params.set('lng', String(coords.longitude));
      }
      const [productsRes, cats] = await Promise.all([
        api<{ items: CatalogProduct[] }>(`/catalog/products?${params.toString()}`),
        api<{ items: ProductCategory[] }>('/product-categories'),
      ]);
      setItems(productsRes.items);
      setCategories(cats.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, status, coords?.latitude, coords?.longitude]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <View className="mb-2.5 gap-2.5">
        <TextInput
          className="rounded-xl border border-edge bg-white px-3 py-2.5 text-base text-ink"
          placeholder="Producto…"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
        <CategoryChips categories={categories} categoryId={categoryId} onSelect={setCategoryId} />
      </View>

      <LocationControl status={status} error={error} onEnable={() => void enable()} onDisable={disable} />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message={search || categoryId ? 'No hay productos que coincidan con tu búsqueda.' : 'Aún no hay productos publicados.'} />
      ) : (
        <>
          <Text className="mb-2 text-[13px] text-muted">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
            {status === 'enabled' && ' · ordenados por cercanía'}
          </Text>
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable
                className="mb-2.5 gap-1.5 rounded-2xl border border-edge bg-white p-3.5 active:opacity-90"
                onPress={() => router.push(`/product/${item.id}`)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="rounded-full bg-brand-50 px-2.5 py-0.5">
                    <Text className="text-xs font-semibold text-brand-700">
                      {item.categoryName ?? 'General'}
                    </Text>
                  </View>
                  {item.distanceKm != null && (
                    <Text className="text-xs text-muted">{`a ${formatDistance(item.distanceKm)}`}</Text>
                  )}
                </View>
                <View className="flex-row items-center gap-2.5">
                  {item.photoUrl ? (
                    <Pressable onPress={() => setPreviewUri(mediaUrl(item.photoUrl))}>
                      <Image
                        source={{ uri: mediaUrl(item.photoUrl) ?? '' }}
                        className="rounded-lg"
                        style={{ width: 56, height: 56 }}
                      />
                    </Pressable>
                  ) : null}
                  <View className="flex-1 gap-0.5">
                    <Text className="text-base font-bold text-ink">{item.name}</Text>
                    <Text className="text-[15px] font-bold text-brand-700">
                      {formatPrice(item.price)}
                      {item.unit ? ` / ${item.unit}` : ''}
                    </Text>
                    <Text className="text-muted" numberOfLines={1}>
                      {item.businessName}
                    </Text>
                  </View>
                </View>
                {item.businessAddress ? (
                  <Text className="text-muted">📍 {item.businessAddress}</Text>
                ) : null}
              </Pressable>
            )}
          />
          <PhotoLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />
        </>
      )}
    </>
  );
}

function BusinessesCatalog() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogBusiness[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId) params.set('categoryId', categoryId);
      const [catalog, cats] = await Promise.all([
        api<{ items: CatalogBusiness[] }>(`/catalog?${params.toString()}`),
        api<{ items: Category[] }>('/categories'),
      ]);
      setItems(catalog.items);
      setCategories(cats.items.filter((c) => c.kind === 'negocio'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <View className="mb-2.5 gap-2.5">
        <TextInput
          className="rounded-xl border border-edge bg-white px-3 py-2.5 text-base text-ink"
          placeholder="Buscar negocio…"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
        <CategoryChips categories={categories} categoryId={categoryId} onSelect={setCategoryId} />
      </View>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message="No hay negocios publicados todavía." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              className="mb-2.5 gap-1.5 rounded-2xl border border-edge bg-white p-3.5 active:opacity-90"
              onPress={() => router.push(`/business/${item.id}`)}
            >
              <View className="flex-row items-center justify-between">
                <View className="rounded-full bg-brand-50 px-2.5 py-0.5">
                  <Text className="text-xs font-semibold text-brand-700">
                    {item.categoryName ?? 'General'}
                  </Text>
                </View>
                <Text className="text-muted">
                  {item.itemsCount} producto{item.itemsCount === 1 ? '' : 's'}
                </Text>
              </View>
              <Text className="text-base font-bold text-ink">{item.name}</Text>
              {item.address ? <Text className="text-muted">{item.address}</Text> : null}
            </Pressable>
          )}
        />
      )}
    </>
  );
}

function LocationControl({
  status,
  error,
  onEnable,
  onDisable,
}: {
  status: LocationStatus;
  error: string | null;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return (
    <View className="mb-3 gap-2 rounded-xl border border-dashed border-brand-600 bg-white p-3">
      {status === 'idle' && (
        <>
          <Text className="text-muted">Activa tu ubicación para ver primero lo más cercano a ti.</Text>
          <Pressable
            className="items-center rounded-xl bg-brand-600 py-2.5 active:opacity-70"
            onPress={onEnable}
          >
            <Text className="text-sm font-bold text-white">Activar ubicación</Text>
          </Pressable>
        </>
      )}
      {status === 'asking' && <Text className="text-muted">Obteniendo tu ubicación…</Text>}
      {status === 'enabled' && (
        <>
          <Text className="text-[13px] text-muted">📍 Ordenando por cercanía a tu ubicación.</Text>
          <Pressable onPress={onDisable}>
            <Text className="text-[13px] font-bold text-brand-700">Quitar ubicación</Text>
          </Pressable>
        </>
      )}
      {error ? <Text className="text-[13px] text-red-600">{error}</Text> : null}
    </View>
  );
}
