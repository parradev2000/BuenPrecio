import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { loginSchema } from '@buenprecio/shared';
import { ApiError } from '../src/api/client';
import { Alert, Button, Screen, TextField } from '../src/components/ui';
import { GoogleSignInButton } from '../src/components/GoogleSignInButton';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
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
        <Text className="mt-4 text-center text-xs text-muted">o continúa con</Text>
        <GoogleSignInButton onSuccess={(idToken) => void onGoogle(idToken)} onError={setError} disabled={busy} />
        <TouchableOpacity onPress={() => router.push('/forgot-password')} className="mt-3 items-center">
          <Text className="font-semibold text-brand-700">¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/register')}
          className="mt-4 items-center"
        >
          <Text className="font-semibold text-brand-700">¿No tienes cuenta? Créala gratis</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
