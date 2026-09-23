import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { forgotPasswordSchema } from '@buenprecio/shared';
import { ApiError, api } from '../src/api/client';
import { Alert, Button, Screen, TextField } from '../src/components/ui';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Correo inválido');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: parsed.data });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo conectar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {sent ? (
          <Alert kind="success">
            Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.
          </Alert>
        ) : (
          <>
            {error && <Alert kind="error">{error}</Alert>}
            <Text className="mb-3 text-sm text-muted">
              Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
            </Text>
            <TextField
              label="Correo"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
            />
            <Button title={busy ? 'Enviando…' : 'Enviar enlace'} onPress={() => void submit()} disabled={busy} />
          </>
        )}
        <TouchableOpacity onPress={() => router.replace('/login')} className="mt-4 items-center">
          <Text className="font-semibold text-brand-700">Volver a entrar</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}