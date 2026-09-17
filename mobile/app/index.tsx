import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api/client';
import type { CatalogBusiness, CatalogProduct, Category, ProductCategory } from '../src/api/types';
import { useAuth } from '../src/context/AuthContext';
import { type LocationStatus, useUserLocation } from '../src/hooks/useUserLocation';
import { COLORS, formatDistance, formatPrice, mediaUrl } from '../src/lib/format';
import { EmptyState, Loading, Screen } from '../src/components/ui';

type CatalogView = 'productos' | 'negocios';

export default function CatalogScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [view, setView] = useState<CatalogView>('productos');

  return (
    <Screen>
      {session?.user.role === 'administrador' && (
        <Pressable style={styles.producerBtn} onPress={() => router.push('/admin')}>
          <Text style={styles.producerBtnText}>Dashboard</Text>
        </Pressable>
      )}
      {session?.user.role === 'productor' && (
        <Pressable style={styles.producerBtn} onPress={() => router.push('/my-businesses')}>
          <Text style={styles.producerBtnText}>Gestionar mis negocios</Text>
        </Pressable>
      )}

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tabBtn, view === 'productos' && styles.tabBtnActive]}
          onPress={() => setView('productos')}
        >
          <Text style={[styles.tabText, view === 'productos' && styles.tabTextActive]}>Productos</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, view === 'negocios' && styles.tabBtnActive]}
          onPress={() => setView('negocios')}
        >
          <Text style={[styles.tabText, view === 'negocios' && styles.tabTextActive]}>Negocios</Text>
        </Pressable>
      </View>

      {view === 'productos' ? <ProductsCatalog /> : <BusinessesCatalog />}
    </Screen>
  );
}

function ProductsCatalog() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
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
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder="Producto…"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, categoryId === '' && styles.chipActive]}
            onPress={() => setCategoryId('')}
          >
            <Text style={[styles.chipText, categoryId === '' && styles.chipTextActive]}>Todas</Text>
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
        </View>
      </View>

      <LocationControl status={status} error={error} onEnable={() => void enable()} onDisable={disable} />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState message={search || categoryId ? 'No hay productos que coincidan con tu búsqueda.' : 'Aún no hay productos publicados.'} />
      ) : (
        <>
          <Text style={styles.resultCount}>
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
            {status === 'enabled' && ' · ordenados por cercanía'}
          </Text>
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => router.push(`/product/${item.id}`)}>
                <View style={styles.cardTop}>
                  <Text style={styles.chipText}>{item.categoryName ?? 'General'}</Text>
                  {item.distanceKm != null && (
                    <Text style={styles.distance}>{`a ${formatDistance(item.distanceKm)}`}</Text>
                  )}
                </View>
                <View style={styles.productBody}>
                  {item.photoUrl ? (
                    <Image source={{ uri: mediaUrl(item.photoUrl) ?? '' }} style={styles.productThumb} />
                  ) : null}
                  <View style={styles.productInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.price}>
                      {formatPrice(item.price)}
                      {item.unit ? ` / ${item.unit}` : ''}
                    </Text>
                    <Text style={styles.muted} numberOfLines={1}>
                      {item.businessName}
                    </Text>
                  </View>
                </View>
                {item.businessAddress ? <Text style={styles.muted}>📍 {item.businessAddress}</Text> : null}
              </Pressable>
            )}
          />
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
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder="Buscar negocio…"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, categoryId === '' && styles.chipActive]}
            onPress={() => setCategoryId('')}
          >
            <Text style={[styles.chipText, categoryId === '' && styles.chipTextActive]}>Todas</Text>
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
        </View>
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
            <Pressable style={styles.card} onPress={() => router.push(`/business/${item.id}`)}>
              <View style={styles.cardTop}>
                <Text style={styles.chipText}>{item.categoryName ?? 'General'}</Text>
                <Text style={styles.muted}>
                  {item.itemsCount} producto{item.itemsCount === 1 ? '' : 's'}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.address ? <Text style={styles.muted}>{item.address}</Text> : null}
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
    <View style={styles.locCard}>
      {status === 'idle' && (
        <>
          <Text style={styles.muted}>Activa tu ubicación para ver primero lo más cercano a ti.</Text>
          <Pressable style={styles.locBtn} onPress={onEnable}>
            <Text style={styles.locBtnText}>Activar ubicación</Text>
          </Pressable>
        </>
      )}
      {status === 'asking' && <Text style={styles.muted}>Obteniendo tu ubicación…</Text>}
      {status === 'enabled' && (
        <>
          <Text style={styles.locNote}>📍 Ordenando por cercanía a tu ubicación.</Text>
          <Pressable onPress={onDisable}>
            <Text style={styles.locLink}>Quitar ubicación</Text>
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.locError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  producerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  producerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  filters: {
    marginBottom: 10,
    gap: 10,
  },
  search: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  locCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  locBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  locBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  locNote: {
    color: COLORS.muted,
    fontSize: 13,
  },
  locLink: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  locError: {
    color: COLORS.dangerDark,
    fontSize: 13,
  },
  resultCount: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
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
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  price: {
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 15,
  },
  distance: {
    color: COLORS.muted,
    fontSize: 12,
  },
  muted: {
    color: COLORS.muted,
  },
});