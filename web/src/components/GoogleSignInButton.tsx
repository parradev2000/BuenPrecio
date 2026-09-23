import { useEffect, useRef } from 'react';

type GoogleSignInButtonProps = {
  onSuccess: (idToken: string) => void | Promise<void>;
  onError?: (message: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
};

let gsiScript: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (!gsiScript) {
    gsiScript = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => {
        gsiScript = null;
        reject(new Error('No se pudo cargar Google'));
      });
      document.head.appendChild(script);
    });
  }
  return gsiScript;
}

export function GoogleSignInButton({ onSuccess, onError, text = 'continue_with' }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onSuccess);
  callbackRef.current = onSuccess;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !container || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            void callbackRef.current(response.credential);
          },
        });
        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          locale: 'es',
        });
      })
      .catch(() => onError?.('No se pudo cargar el inicio de sesión con Google'));

    return () => {
      cancelled = true;
      if (container) container.innerHTML = '';
    };
  }, [clientId, text, onError]);

  if (!clientId) return null;

  return (
    <div className="flex justify-center">
      <div ref={containerRef} aria-label="Continuar con Google" />
    </div>
  );
}
