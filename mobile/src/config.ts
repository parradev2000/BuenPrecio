import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

const DEFAULT_API_BASE: string =
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  'http://192.168.149.84:3000/api/v1';

export const API_BASE: string =
  Platform.OS === 'web' ? 'http://localhost:3000/api/v1' : DEFAULT_API_BASE;

const SERVER_FILE = 'server.json';
const SERVER_KEY = 'buenprecio.server';

let override: string | null = null;

async function loadOverride(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      const raw = window.localStorage.getItem(SERVER_KEY);
      return raw ? (JSON.parse(raw) as string) : null;
    } catch {
      return null;
    }
  }
  const file = new File(Paths.document, SERVER_FILE);
  if (!file.exists) return null;
  try {
    const raw = await file.text();
    return raw ? (JSON.parse(raw) as string) : null;
  } catch {
    return null;
  }
}

void loadOverride().then((value) => {
  override = value;
});

export function getApiBase(): string {
  return override ?? API_BASE;
}

export function getSavedApiBase(): string | null {
  return override;
}

export function setApiBase(base: string): void {
  const url = base.trim().replace(/\/+$/, '');
  override = url;
  if (Platform.OS === 'web') {
    window.localStorage.setItem(SERVER_KEY, JSON.stringify(url));
    return;
  }
  const file = new File(Paths.document, SERVER_FILE);
  file.write(JSON.stringify(url));
}

export function resetApiBase(): void {
  override = null;
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(SERVER_KEY);
    return;
  }
  const file = new File(Paths.document, SERVER_FILE);
  if (file.exists) file.delete();
}
