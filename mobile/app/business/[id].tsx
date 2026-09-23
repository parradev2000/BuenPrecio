import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { CatalogBusiness, PublicItem } from '../../src/api/types';
import { formatPrice, mediaUrl } from '../../src/lib/format';
import { EmptyState, Loading, Screen } from '../../src/components/ui';
import { PhotoLightbox } from '../../src/components/PhotoLightbox';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<CatalogBusiness | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

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
        <Text className="text-red-600">{error}</Text>
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
      {business.photoUrl ? (
        <Pressable onPress={() => setPreviewUri(mediaUrl(business.photoUrl))}>
          <Image
            source={{ uri: mediaUrl(business.photoUrl) ?? '' }}
            className="w-full rounded-xl"
            style={{ height: 180 }}
          />
        </Pressable>
      ) : null}
      <Text className="text-[22px] font-bold text-ink">{business.name}</Text>
      <Text className="text-sm text-muted">{business.categoryName ?? 'General'}</Text>
      {business.description ? <Text className="mt-1.5 text-ink">{business.description}</Text> : null}
      {business.address ? <Text className="text-sm text-muted">📍 {business.address}</Text> : null}
      {business.phone ? <Text className="text-sm text-muted">☎️ {business.phone}</Text> : null}

      {items.length === 0 ? (
        <EmptyState message="Este negocio aún no tiene productos publicados." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <View className="mb-2 flex-row items-center justify-between rounded-2xl border border-edge bg-white p-3.5">
              <View className={item.photoUrl ? 'flex-row items-center gap-2.5 shrink' : 'shrink gap-0.5'}>
                {item.photoUrl ? (
                  <Pressable onPress={() => setPreviewUri(mediaUrl(item.photoUrl))}>
                    <Image
                      source={{ uri: mediaUrl(item.photoUrl) ?? '' }}
                      className="rounded-lg"
                      style={{ width: 52, height: 52 }}
                    />
                  </Pressable>
                ) : null}
                <View className="shrink">
                  <Text className="text-base font-semibold text-ink">{item.name}</Text>
                  <Text className="text-sm text-muted">
                    {item.type === 'servicio' ? 'servicio' : item.unit ?? 'unidad'}
                  </Text>
                </View>
              </View>
              <Text className="ml-2 text-base font-bold text-brand-700">{formatPrice(item.price)}</Text>
            </View>
          )}
        />
      )}
      <PhotoLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />
    </Screen>
  );
}
