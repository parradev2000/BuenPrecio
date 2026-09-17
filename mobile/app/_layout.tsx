import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AccountHeaderButton } from '../src/components/AccountHeaderButton';
import { AuthProvider } from '../src/context/AuthContext';
import { COLORS } from '../src/lib/format';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerTintColor: COLORS.primary,
          headerTitleStyle: { fontWeight: '700' },
          headerStyle: { backgroundColor: '#fff' },
          contentStyle: { backgroundColor: COLORS.bg },
          headerRight: () => <AccountHeaderButton />,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Buen Precio' }} />
        <Stack.Screen name="login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="register" options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="account" options={{ title: 'Mi cuenta' }} />
        <Stack.Screen name="admin" options={{ title: 'Administración' }} />
        <Stack.Screen name="my-businesses" options={{ title: 'Mis negocios' }} />
        <Stack.Screen name="my-businesses/[id]" options={{ title: 'Catálogo' }} />
        <Stack.Screen name="business/[id]" options={{ title: 'Negocio' }} />
        <Stack.Screen name="contact" options={{ title: 'Contáctanos' }} />
        <Stack.Screen name="servidor" options={{ title: 'Servidor' }} />
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}