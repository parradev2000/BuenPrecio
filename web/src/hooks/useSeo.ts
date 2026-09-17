import { useEffect } from 'react';

type SeoOptions = {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
};

const SITE_URL = 'https://buenprecio.onrender.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function useSeo({ title, description, image, url }: SeoOptions) {
  useEffect(() => {
    const absolute = (value: string) =>
      value.startsWith('http') || value.startsWith('//') ? value : `${window.location.origin}${value}`;
    const img = image ? absolute(image) : DEFAULT_IMAGE;
    const pageUrl = url ?? window.location.href;

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', pageUrl);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', img);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = pageUrl.replace('http:', 'https:');
  }, [title, description, image, url]);
}