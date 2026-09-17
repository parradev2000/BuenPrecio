import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { File, Paths } from 'expo-file-system';

export type LocationStatus = 'idle' | 'asking' | 'enabled' | 'denied' | 'error';
export type UserCoords = { latitude: number; longitude: number };

const STORAGE_KEY = 'buenprecio.location';
const LOCATION_FILE = 'location.json';
const MAX_AGE_MS = 30 * 60 * 1000;

type CachedLocation = UserCoords & { ts: number };

function isFresh(cached: CachedLocation | null): cached is CachedLocation {
  return (
    !!cached &&
    typeof cached.latitude === 'number' &&
    typeof cached.longitude === 'number' &&
    typeof cached.ts === 'number' &&
    Date.now() - cached.ts <= MAX_AGE_MS
  );
}

async function readCache(): Promise<CachedLocation | null> {
  if (Platform.OS === 'web') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedLocation;
      if (!isFresh(parsed)) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  const file = new File(Paths.document, LOCATION_FILE);
  if (!file.exists) return null;
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as CachedLocation;
    return isFresh(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function saveCache(next: CachedLocation) {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sin almacenamiento
    }
    return;
  }
  const file = new File(Paths.document, LOCATION_FILE);
  file.write(JSON.stringify(next));
}

async function clearCache() {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // sin almacenamiento
    }
    return;
  }
  const file = new File(Paths.document, LOCATION_FILE);
  if (file.exists) file.delete();
}

function geolocationOnce(): Promise<UserCoords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('sin soporte'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}

export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void readCache().then((cached) => {
      if (active && isFresh(cached)) {
        setCoords({ latitude: cached.latitude, longitude: cached.longitude });
        setStatus('enabled');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setStatus('asking');
    setError(null);
    let next: UserCoords;
    try {
      if (Platform.OS === 'web') {
        next = await geolocationOnce();
      } else {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          setStatus('denied');
          setError('Activa la ubicación en los permisos de la aplicación');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch {
      setStatus('error');
      setError('No se pudo obtener tu ubicación');
      return;
    }
    const cached: CachedLocation = { ...next, ts: Date.now() };
    void saveCache(cached);
    setCoords(next);
    setStatus('enabled');
  }, []);

  const disable = useCallback(() => {
    void clearCache();
    setCoords(null);
    setError(null);
    setStatus('idle');
  }, []);

  return { status, coords, error, enable, disable };
}