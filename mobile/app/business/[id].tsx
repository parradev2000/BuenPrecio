import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { CatalogBusiness, PublicItem } from '../../src/api/types';
import { COLORS, formatPrice, mediaUrl } from '../../src/lib/format';
import { EmptyState, Loading, Screen } from '../../src/components/ui';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<CatalogBusiness | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ business: CatalogBusiness & { items: PublicItem[] } }>(`/catalog/businesses/${id}`);
      setBusiness(res.business);
      setItems(res.business.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Screen>
        <Text style={styles.error}>{error}</Text>
      </Screen>
    );
  }
  if (!business) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{business.name}</Text>
      <Text style={styles.muted}>{business.categoryName ?? 'Categoría general'}</Text>
      {business.description ? <Text style={styles.body}>{business.description}</Text> : null}
      {business.address ? <Text style={styles.muted}>📍 {business.address}</Text> : null}
      {business.phone ? <Text style={styles.muted}>☎️ {business.phone}</Text> : null}

      {items.length === 0 ? (
        <EmptyState message="Este negocio aún no tiene productos publicados." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.rowLeft, item.photoUrl && styles.rowLeftWithPhoto]}>
                {item.photoUrl ? <Image source={{ uri: mediaUrl(item.photoUrl) ?? '' }} style={styles.itemThumb} /> : null}
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.muted}>
                    {item.type === 'servicio' ? 'servicio' : item.unit ?? 'unidad'}
                  </Text>
                </View>
              </View>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: COLORS.dangerDark,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  muted: {
    color: COLORS.muted,
  },
  body: {
    marginTop: 6,
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
  itemName: {
    fontWeight: '600',
    fontSize: 16,
  },
  price: {
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 16,
    marginLeft: 8,
  },
});