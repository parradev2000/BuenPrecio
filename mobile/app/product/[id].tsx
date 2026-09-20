import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { CatalogProductDetail } from '../../src/api/types';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { formatDistance, formatPrice, mediaUrl } from '../../src/lib/format';
import { EmptyState, Loading, Screen } from '../../src/components/ui';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<CatalogProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { status, coords } = useUserLocation();

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status === 'enabled' && coords) {
        params.set('lat', String(coords.latitude));
        params.set('lng', String(coords.longitude));
      }
      const qs = params.toString();
      const res = await api<{ item: CatalogProductDetail }>(
        `/catalog/products/${id}${qs ? `?${qs}` : ''}`,
      );
      setProduct(res.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status, coords?.latitude, coords?.longitude]);

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
  if (!product) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  const geoQuery =
    product.businessLatitude != null && product.businessLongitude != null
      ? `${product.businessLatitude},${product.businessLongitude}`
      : product.businessAddress;
  const businessPhone = product.businessPhone;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Pressable onPress={() => router.back()}>
          <Text className="mb-2.5 text-muted">← Volver</Text>
        </Pressable>
        {product.photoUrl ? (
          <Image
            source={{ uri: mediaUrl(product.photoUrl) ?? '' }}
            className="mb-3 w-full rounded-xl"
            style={{ height: 220 }}
          />
        ) : null}
        <Text className="mb-1.5 text-[22px] font-bold text-ink">{product.name}</Text>
        <View className="mb-2 flex-row gap-2">
          <Text className="overflow-hidden rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700">
            {product.categoryName ?? 'General'}
          </Text>
          <Text className="overflow-hidden rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700">
            {product.type === 'servicio' ? 'servicio' : product.unit ?? 'unidad'}
          </Text>
        </View>
        <Text className="mb-1 text-[22px] font-bold text-brand-700">{formatPrice(product.price)}</Text>
        {product.distanceKm != null ? (
          <Text className="mb-0.5 text-sm text-muted">📍 A {formatDistance(product.distanceKm)} de ti</Text>
        ) : null}
        {product.description ? <Text className="mt-2 text-ink">{product.description}</Text> : null}

        <Text className="mb-2 mt-4 text-[17px] font-bold text-ink">Negocio</Text>
        <View className="gap-1.5 rounded-2xl border border-edge bg-white p-3.5">
          {product.businessPhotoUrl ? (
            <Image
              source={{ uri: mediaUrl(product.businessPhotoUrl) ?? '' }}
              className="mb-1 w-full rounded-[10px]"
              style={{ height: 120 }}
            />
          ) : null}
          <Pressable onPress={() => router.push(`/business/${product.businessId}`)}>
            <Text className="text-[17px] font-bold text-brand-700">{product.businessName}</Text>
          </Pressable>
          {product.businessAddress ? (
            <Pressable
              onPress={() =>
                geoQuery && void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(geoQuery)}`)
              }
            >
              <Text className="text-sm text-muted">📍 {product.businessAddress}</Text>
            </Pressable>
          ) : null}
          {businessPhone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${businessPhone.replace(/[^+\d]/g, '')}`)}>
              <Text className="text-sm text-muted">☎️ {businessPhone}</Text>
            </Pressable>
          ) : null}
        </View>

        {!product.businessName && <EmptyState message="Este producto ya no está disponible." />}
      </ScrollView>
    </Screen>
  );
}
