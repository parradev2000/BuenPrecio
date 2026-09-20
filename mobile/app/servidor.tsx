import { useState } from 'react';
import { Text, View } from 'react-native';
import { Alert, Button, Card, Screen, TextField } from '../src/components/ui';
import {
  API_BASE,
  getApiBase,
  getSavedApiBase,
  resetApiBase,
  setApiBase,
} from '../src/config';

export default function ServerScreen() {
  const [value, setValue] = useState<string>(getApiBase());
  const [saved, setSaved] = useState<string | null>(getSavedApiBase());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function normalize(input: string): string {
    return input.trim().replace(/\/+$/, '');
  }

  function handleSave() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const base = normalize(value);
      if (!/^https?:\/\//i.test(base)) {
        setError('Escribe una URL válida que empiece por http:// o https://');
        return;
      }
      setApiBase(base);
      setSaved(base);
      setMessage('Guardado. Las próximas peticiones irán a ese servidor.');
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setBusy(true);
    setMessage(null);
    setError(null);
    resetApiBase();
    setSaved(null);
    setValue(getApiBase());
    setMessage('Restablecido al valor de fábrica.');
    setBusy(false);
  }

  const defaultBase = API_BASE;
  const inUse = getSavedApiBase() ?? defaultBase;

  return (
    <Screen>
      <Card>
        <Text className="text-base font-bold text-ink">Servidor de la API</Text>
        <Text className="text-[13px] leading-5 text-muted">
          La app guarda aquí la dirección del servidor. Es útil si el Mac y el teléfono están en
          redes distintas o si cambia la IP de la red local.
        </Text>
      </Card>

      {message && <Alert kind="success">{message}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <Card>
        <TextField
          label="Dirección del servidor"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setMessage(null);
            setError(null);
          }}
        />
        <Text className="text-[13px] text-muted">
          Valor en uso: <Text className="font-semibold text-brand-700">{inUse || '—'}</Text>
        </Text>

        <View className="mt-2 flex-row items-center gap-2">
          <View className="flex-1">
            <Button
              title={busy ? 'Guardando…' : 'Guardar y probar'}
              onPress={handleSave}
              disabled={busy || !value.trim()}
            />
          </View>
          <View className="flex-1">
            <Button
              variant="ghost"
              title="Restablecer"
              onPress={handleReset}
              disabled={busy || !saved}
            />
          </View>
        </View>
      </Card>

      <Card>
        <Text className="text-base font-bold text-ink">Consejo</Text>
        <Text className="text-[13px] leading-5 text-muted">
          Si abres la app al mismo Wi-Fi que el Mac, usa la IP local (empieza por 192.168.) con el
          puerto 3000, por ejemplo{' '}
          <Text className="font-semibold text-brand-700">{defaultBase}</Text>. Para que funcione, el Mac
          debe permitir conexiones entrantes (Ajustes → Firewall → permitir Node.js).
        </Text>
      </Card>
    </Screen>
  );
}
