import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID: string =
  (Constants.expoConfig?.extra?.googleClientId as string | undefined) ?? '';

function redirectUri(): string {
  return makeRedirectUri();
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  disabled,
}: {
  onSuccess: (idToken: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    selectAccount: true,
    redirectUri: redirectUri(),
  });

  useEffect(() => {
    console.warn(`[Google] Añade este redirect URI en Google Cloud Console: ${redirectUri()}`);
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (idToken) {
        onSuccess(idToken);
      } else {
        onError('No se pudo obtener el token de Google');
      }
    } else if (response?.type === 'error') {
      onError(response.error?.message ?? 'No se pudo conectar con Google');
    }
  }, [response, onSuccess, onError]);

  async function press() {
    if (!request) {
      onError('Google no está configurado en esta app');
      return;
    }
    const result = await promptAsync();
    if (result?.type === 'cancel') {
      // el usuario cerró la ventana; no mostramos error
    }
  }

  return (
    <Pressable
      className={`mt-3 flex-row items-center justify-center gap-2.5 rounded-xl border border-edge bg-white px-4 py-3 active:opacity-70 ${
        disabled || !request ? 'opacity-60' : ''
      }`}
      onPress={() => void press()}
      disabled={disabled || !request}
      accessibilityLabel="Continuar con Google"
    >
      <Text className="text-base font-bold text-ink">Continuar con Google</Text>
    </Pressable>
  );
}