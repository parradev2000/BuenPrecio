import { useCallback, useEffect, useState } from 'react';

export type LocationStatus = 'idle' | 'asking' | 'enabled' | 'denied' | 'error';
export type UserCoords = { latitude: number; longitude: number };

const STORAGE_KEY = 'bp_location';
const MAX_AGE_MS = 30 * 60 * 1000;

type CachedLocation = UserCoords & { ts: number };

function readCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number' ||
      typeof parsed.ts !== 'number' ||
      Date.now() - parsed.ts > MAX_AGE_MS
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>(() => (readCache() ? 'enabled' : 'idle'));
  const [coords, setCoords] = useState<UserCoords | null>(() => {
    const cached = readCache();
    return cached ? { latitude: cached.latitude, longitude: cached.longitude } : null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'enabled') {
      const cached = readCache();
      if (cached) {
        setCoords({ latitude: cached.latitude, longitude: cached.longitude });
      }
    }
  }, [status]);

  const enable = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta la ubicación');
      setStatus('error');
      return;
    }
    setStatus('asking');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const cache: CachedLocation = { ...next, ts: Date.now() };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
        } catch {
          // almacenamiento no disponible; se mantiene solo en memoria
        }
        setCoords(next);
        setStatus('enabled');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Activa la ubicación en tu navegador y vuelve a intentarlo');
          setStatus('denied');
        } else {
          setError('No se pudo obtener tu ubicación');
          setStatus('error');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  const disable = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // sin almacenamiento
    }
    setCoords(null);
    setError(null);
    setStatus('idle');
  }, []);

  return { status, coords, error, enable, disable };
}