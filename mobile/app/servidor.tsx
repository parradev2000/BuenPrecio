import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Alert, Button, Screen, TextField } from '../src/components/ui';
import { COLORS } from '../src/lib/format';
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

  const defaultBase = Array.isArray(API_BASE.split(':')) ? API_BASE : API_BASE;
  const inUse = getSavedApiBase() ?? defaultBase;

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Servidor de la API</Text>
        <Text style={styles.muted}>
          La app guarda aquí la dirección del servidor. Es útil si el Mac y el
          teléfono están en redes distintas o si cambia la IP de la red local.
        </Text>
      </View>

      {message && <Alert kind="success">{message}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <View style={styles.card}>
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
        <Text style={styles.muted}>
          Valor en uso: <Text style={styles.code}>{inUse || '—'}</Text>
        </Text>

        <View style={styles.row}>
          <Button
            title={busy ? 'Guardando…' : 'Guardar y probar'}
            onPress={handleSave}
            disabled={busy || !value.trim()}
          />
          <Button
            variant="ghost"
            title="Restablecer"
            onPress={handleReset}
            disabled={busy || !saved}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Consejo</Text>
        <Text style={styles.muted}>
          Si abres la app al mismo Wi-Fi que el Mac, usa la IP local (empieza
          por 192.168.) con el puerto 3000, por ejemplo{' '}
          <Text style={styles.code}>{defaultBase}</Text>. Para que funcione, el
          Mac debe permitir conexiones entrantes (Ajustes → Firewall → permitir
          Node.js).
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 5,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  muted: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  code: {
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 6,
  },
});
