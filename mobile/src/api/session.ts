import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type { SafeUser } from '@buenprecio/shared';

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
};

const SESSION_FILE = 'session.json';
const SESSION_KEY = 'buenprecio.session';

function sessionFile(): File {
  return new File(Paths.document, SESSION_FILE);
}

export async function loadSession(): Promise<Session | null> {
  if (Platform.OS === 'web') {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }
  const file = sessionFile();
  if (!file.exists) return null;
  try {
    return JSON.parse(await file.text()) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return;
  }
  sessionFile().write(JSON.stringify(session));
}

export function clearSession(): void {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  const file = sessionFile();
  if (file.exists) file.delete();
}