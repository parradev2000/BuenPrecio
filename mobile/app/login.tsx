import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { loginSchema } from '@buenprecio/shared';
import { ApiError } from '../src/api/client';
import { Alert, Button, Screen, TextField } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/lib/format';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo conectar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {error && <Alert kind="error">{error}</Alert>}
        <TextField
          label="Correo"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
        />
        <TextField
          label="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title={busy ? 'Entrando…' : 'Entrar'} onPress={() => void submit()} disabled={busy} />
        <TouchableOpacity onPress={() => router.push('/register')} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: COLORS.primary, fontWeight: '600' }}>¿No tienes cuenta? Créala gratis</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}