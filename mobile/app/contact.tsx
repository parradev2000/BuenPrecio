import { Linking, ScrollView, Text, View } from 'react-native';
import { Button, Card, Screen } from '../src/components/ui';

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
      <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
        <Card>
          <Text className="text-base font-bold text-ink">Desarrollador</Text>
          <View className="flex-row justify-between gap-3">
            <Text className="text-sm text-muted">Nombre</Text>
            <Text className="shrink text-right text-sm font-semibold text-ink">{DEV.name}</Text>
          </View>
          <View className="flex-row justify-between gap-3">
            <Text className="text-sm text-muted">Rol</Text>
            <Text className="shrink text-right text-sm font-semibold text-ink">{DEV.role}</Text>
          </View>
          <View className="self-start rounded-full bg-brand-50 px-3 py-1">
            <Text className="text-[13px] font-bold text-brand-700">{DEV.handle}</Text>
          </View>
        </Card>

        <Card>
          <Text className="text-base font-bold text-ink">Contacto</Text>
          <Text className="text-sm text-muted">
            Escríbenos por correo o teléfono ante cualquier duda o sugerencia.
          </Text>
          <Button variant="secondary" title={DEV.email} onPress={() => Linking.openURL(`mailto:${DEV.email}`)} />
          <Button variant="secondary" title={DEV.phone} onPress={() => Linking.openURL(DEV.phoneHref)} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
