import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { CatalogProductDetail } from '../../src/api/types';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { COLORS, formatDistance, formatPrice, mediaUrl } from '../../src/lib/format';
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
        <Text style={styles.error}>{error}</Text>
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
          <Text style={styles.backLink}>← Volver</Text>
        </Pressable>
        {product.photoUrl ? (
          <Image source={{ uri: mediaUrl(product.photoUrl) ?? '' }} style={styles.photo} />
        ) : null}
        <Text style={styles.title}>{product.name}</Text>
        <View style={styles.row}>
          <Text style={styles.chip}>{product.categoryName ?? 'General'}</Text>
          <Text style={styles.chip}>{product.type === 'servicio' ? 'servicio' : product.unit ?? 'unidad'}</Text>
        </View>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        {product.distanceKm != null ? (
          <Text style={styles.muted}>📍 A {formatDistance(product.distanceKm)} de ti</Text>
        ) : null}
        {product.description ? <Text style={styles.body}>{product.description}</Text> : null}

        <Text style={styles.section}>Negocio</Text>
        <View style={styles.businessCard}>
          {product.businessPhotoUrl ? (
            <Image
              source={{ uri: mediaUrl(product.businessPhotoUrl) ?? '' }}
              style={styles.businessPhoto}
            />
          ) : null}
          <Pressable onPress={() => router.push(`/business/${product.businessId}`)}>
            <Text style={styles.businessName}>{product.businessName}</Text>
          </Pressable>
          {product.businessAddress ? (
            <Pressable
              onPress={() =>
                geoQuery && void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(geoQuery)}`)
              }
            >
              <Text style={styles.muted}>📍 {product.businessAddress}</Text>
            </Pressable>
          ) : null}
          {businessPhone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${businessPhone.replace(/[^+\d]/g, '')}`)}>
              <Text style={styles.muted}>☎️ {businessPhone}</Text>
            </Pressable>
          ) : null}
        </View>

        {!product.businessName && <EmptyState message="Este producto ya no está disponible." />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: COLORS.dangerDark,
  },
  backLink: {
    color: COLORS.muted,
    marginBottom: 10,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#eaf1ec',
    color: COLORS.primaryDark,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  price: {
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 22,
    marginBottom: 4,
  },
  muted: {
    color: COLORS.muted,
    marginBottom: 2,
  },
  body: {
    marginTop: 8,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  businessCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  businessPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
});