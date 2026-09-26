import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'buenprecio.theme';

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function systemScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type ThemeState = {
  preference: ThemePreference;
  scheme: ColorScheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (isPreference(raw)) return raw;
    } catch {
      // ignore
    }
    return 'system';
  });
  const [mediaScheme, setMediaScheme] = useState<ColorScheme>(() => systemScheme());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setMediaScheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const scheme: ColorScheme = preference === 'system' ? mediaScheme : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', scheme === 'dark');
    root.style.colorScheme = scheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', scheme === 'dark' ? '#0b1220' : '#f8fafc');
    }
  }, [scheme]);

  const value = useMemo<ThemeState>(
    () => ({
      preference,
      scheme,
      setPreference: (next) => {
        setPreferenceState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // ignore
        }
      },
    }),
    [preference, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeState {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return value;
}