import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { registerSchema } from '@buenprecio/shared';
import { ApiError } from '../src/api/client';
import { Alert, Button, Screen, TextField } from '../src/components/ui';
import { GoogleSignInButton } from '../src/components/GoogleSignInButton';
import { useAuth } from '../src/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, googleLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGoogle(idToken: string) {
    setError(null);
    setBusy(true);
    try {
      await googleLogin(idToken);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo conectar');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register(parsed.data.name, parsed.data.email, parsed.data.password);
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
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Como te llamas" />
        <TextField label="Correo" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="tu@correo.com" />
        <TextField label="Contraseña (mínimo 8)" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={busy ? 'Creando…' : 'Crear cuenta'} onPress={() => void submit()} disabled={busy} />
        <Text className="mt-4 text-center text-xs text-muted">o regístrate con</Text>
        <GoogleSignInButton onSuccess={(idToken) => void onGoogle(idToken)} onError={setError} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}
