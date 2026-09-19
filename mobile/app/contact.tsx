import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '../src/components/ui';
import { COLORS } from '../src/lib/format';

const DEV = {
  name: 'Álvaro Parra',
  handle: '@ParraDEV',
  email: 'alvaroparra233@gmail.com',
  phone: '+53 58239510',
  phoneHref: 'tel:+5358239510',
  role: 'Desarrollador y dueño de la aplicación',
};

export default function ContactScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Desarrollador</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{DEV.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rol</Text>
            <Text style={styles.value}>{DEV.role}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{DEV.handle}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contacto</Text>
          <Text style={styles.muted}>Escríbenos por correo o teléfono ante cualquier duda o sugerencia.</Text>
          <Button variant="secondary" title={DEV.email} onPress={() => Linking.openURL(`mailto:${DEV.email}`)} />
          <Button variant="secondary" title={DEV.phone} onPress={() => Linking.openURL(DEV.phoneHref)} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    color: COLORS.muted,
    fontSize: 14,
  },
  value: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.successBg,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  pillText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  muted: {
    color: COLORS.muted,
    fontSize: 14,
  },
});