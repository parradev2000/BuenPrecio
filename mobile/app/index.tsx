import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api/client';
import type { CatalogBusiness, Category } from '../src/api/types';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/lib/format';
import { EmptyState, Loading, Screen } from '../src/components/ui';

export default function CatalogScreen() {
  const router = useRouter();
  const { session } = useAuth();
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
    <Screen>
      {session?.user.role === 'productor' && (
        <Pressable style={styles.producerBtn} onPress={() => router.push('/my-businesses')}>
          <Text style={styles.producerBtnText}>Gestionar mis negocios</Text>
        </Pressable>
      )}

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

    </Screen>
  );
}

const styles = StyleSheet.create({
  producerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  producerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  filters: {
    marginBottom: 12,
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
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  muted: {
    color: COLORS.muted,
  },
});