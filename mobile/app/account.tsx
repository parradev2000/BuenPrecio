import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { api } from '../src/api/client';
import type { Application } from '../src/api/types';
import { Alert, Button, Card, Loading, Screen, TextField } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export default function AccountScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const [application, setApplication] = useState<Application | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const loadApplication = useCallback(async () => {
    if (!session || session.user.role !== 'consumidor') {
      setApplication(undefined);
      setError(null);
      return;
    }
    setError(null);
    try {
      const res = await api<{ application: Application | null }>('/me/producer-application', { auth: true });
      setApplication(res.application);
    } catch (e) {
      setApplication(null);
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  }, [session]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  if (!session) {
    return null;
  }

  const roleLabel =
    session.user.role === 'consumidor'
      ? 'Consumidor'
      : session.user.role === 'productor'
        ? 'Productor'
        : 'Administrador';

  async function requestProducer() {
    setBusy(true);
    setError(null);
    try {
      await api('/me/producer-application', { method: 'POST', auth: true });
      await loadApplication();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setPwBusy(true);
    setPwError(null);
    setPwMessage(null);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        auth: true,
        body: { currentPassword: pwCurrent, newPassword: pwNew },
      });
      setPwMessage('Contraseña actualizada. Si estabas en otro dispositivo, tendrás que volver a entrar.');
      setPwCurrent('');
      setPwNew('');
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña');
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Card className="mb-3">
          <Text className="text-lg font-bold text-ink">{session.user.name}</Text>
          <Text className="text-sm text-muted">{session.user.email}</Text>
          <View className="self-start rounded-full bg-brand-50 px-3 py-1">
            <Text className="text-[13px] font-bold text-brand-700">{roleLabel}</Text>
          </View>
        </Card>

        {error && <Alert kind="error">{error}</Alert>}

        {session.user.role === 'consumidor' && (
          <Card className="mb-3">
            <Text className="text-base font-bold text-ink">Ser productor</Text>
            <Text className="text-sm text-muted">
              Publica y gestiona tus negocios y su catálogo. Un administrador revisará tu solicitud.
            </Text>
            {application === undefined && <Loading />}
            {application === null && (
              <Button
                title={busy ? 'Enviando…' : 'Solicitar ser productor'}
                onPress={() => void requestProducer()}
                disabled={busy}
              />
            )}
            {application !== null && application !== undefined && (
              <>
                <Text className="text-sm text-muted">Estado: {STATUS_LABEL[application.status]}</Text>
                {application.status === 'rejected' && (
                  <Button title="Volver a solicitar" onPress={() => void requestProducer()} disabled={busy} />
                )}
                {application.status === 'approved' && (
                  <Text className="text-sm text-muted">
                    Ya eres productor. Ve a <Link href="/my-businesses">Mis negocios</Link>.
                  </Text>
                )}
              </>
            )}
          </Card>
        )}

        {session.user.role === 'administrador' && (
          <Card className="mb-3">
            <Text className="text-base font-bold text-ink">Administración</Text>
            <Text className="text-sm text-muted">Solicitudes, usuarios y negocios.</Text>
            <Button title="Abrir panel de administración" onPress={() => router.push('/admin')} />
          </Card>
        )}

        {session.user.role === 'productor' && (
          <Text className="mb-3 text-sm text-muted">
            Gestiona tus negocios en <Link href="/my-businesses">Mis negocios</Link>.
          </Text>
        )}

        <Card className="mb-3">
          <Text className="text-base font-bold text-ink">Servidor</Text>
          <Text className="text-sm text-muted">
            ¿La app no se conecta? Cambia aquí la dirección de la API (por si cambió la IP de tu red)
            sin recompilar.
          </Text>
          <Button title="Configurar servidor" onPress={() => router.push('/servidor')} />
        </Card>

        <Card className="mb-3">
          <Text className="text-base font-bold text-ink">Contáctanos</Text>
          <Text className="text-sm text-muted">Información del desarrollador y dueño de la aplicación.</Text>
          <Button variant="secondary" title="Ver contacto" onPress={() => router.push('/contact')} />
        </Card>

        <Card className="mb-3">
          <Text className="text-base font-bold text-ink">Cambiar contraseña</Text>
          {pwMessage && <Alert kind="success">{pwMessage}</Alert>}
          {pwError && <Alert kind="error">{pwError}</Alert>}
          <TextField
            label="Contraseña actual"
            secureTextEntry
            autoComplete="current-password"
            value={pwCurrent}
            onChangeText={setPwCurrent}
          />
          <TextField
            label="Nueva contraseña"
            secureTextEntry
            autoComplete="new-password"
            value={pwNew}
            onChangeText={setPwNew}
          />
          <Button
            title={pwBusy ? 'Guardando…' : 'Actualizar contraseña'}
            onPress={() => void changePassword()}
            disabled={pwBusy}
          />
        </Card>

        <Button variant="ghost" title="Salir" onPress={() => void logout().then(() => router.replace('/'))} />
      </ScrollView>
    </Screen>
  );
}
