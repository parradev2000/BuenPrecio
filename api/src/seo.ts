import { and, eq } from 'drizzle-orm';
import { db } from './db.js';
import { businesses } from './schema.js';

export const SITE_URL = 'https://buenprecio.onrender.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export type SeoView = {
  title: string;
  description: string;
  url: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
};

const DEFAULT_ORG = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Buen Precio',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/favicon.png`,
  description: 'Catálogo de negocios locales con productos y servicios a buenos precios.',
};

const HOME_VIEW: SeoView = {
  title: 'Buen Precio - Encuentra y publica negocios locales con buenos precios',
  description:
    'Buen Precio es el catálogo de negocios locales: descubre productos y servicios cerca de ti con mejores precios. Publica tu negocio gratis.',
  url: `${SITE_URL}/`,
  jsonLd: DEFAULT_ORG,
};

const CATALOG_VIEW: SeoView = {
  title: 'Catálogo de negocios - Buen Precio',
  description:
    'Explora negocios locales, sus productos y servicios, con precios visibles y tipos de negocio claros para comparar mejor.',
  url: `${SITE_URL}/catalogo`,
  jsonLd: DEFAULT_ORG,
};

const LOGIN_VIEW: SeoView = {
  title: 'Entrar - Buen Precio',
  description: 'Inicia sesión en Buen Precio para gestionar tus negocios y catálogos.',
  url: `${SITE_URL}/entrar`,
  jsonLd: DEFAULT_ORG,
};

const REGISTER_VIEW: SeoView = {
  title: 'Crear cuenta - Buen Precio',
  description:
    'Crea tu cuenta gratuita en Buen Precio y publica tu negocio con su catálogo de productos y servicios.',
  url: `${SITE_URL}/registro`,
  jsonLd: DEFAULT_ORG,
};

export function seoViewForUrl(url: string): Promise<SeoView> {
  const path = url.split('?')[0];

  if (path === '/') return Promise.resolve(HOME_VIEW);
  if (path === '/catalogo') return Promise.resolve(CATALOG_VIEW);
  if (path === '/entrar') return Promise.resolve(LOGIN_VIEW);
  if (path === '/registro') return Promise.resolve(REGISTER_VIEW);

  const businessMatch = /^\/catalogo\/([0-9a-zA-Z-]+)$/.exec(path);
  if (businessMatch) {
    return businessSeoView(businessMatch[1]);
  }

  const privateMatch = /^(\/mi-cuenta|\/mis-negocios|\/admin)/.exec(path);
  if (privateMatch) {
    return Promise.resolve({ ...HOME_VIEW, noindex: true });
  }

  return Promise.resolve(HOME_VIEW);
}

async function businessSeoView(id: string): Promise<SeoView> {
  const [row] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      description: businesses.description,
      phone: businesses.phone,
      address: businesses.address,
      photoUrl: businesses.photoUrl,
    })
    .from(businesses)
    .where(and(eq(businesses.id, id), eq(businesses.active, true)))
    .limit(1);

  if (!row) return HOME_VIEW;

  const url = `${SITE_URL}/catalogo/${row.id}`;
  const image = row.photoUrl
    ? row.photoUrl.startsWith('http')
      ? row.photoUrl
      : `${SITE_URL}${row.photoUrl.startsWith('/') ? '' : '/'}${row.photoUrl}`
    : DEFAULT_IMAGE;
  const description = row.description ?? `${row.name} en el catálogo de Buen Precio.`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: row.name,
    url,
    image,
    description,
    ...(row.phone ? { telephone: row.phone } : {}),
    ...(row.address
      ? { address: { '@type': 'PostalAddress', streetAddress: row.address } }
      : {}),
  };

  return { title: `${row.name} - Buen Precio`, description, url, image, jsonLd };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replaceMeta(html: string, attr: 'name' | 'property', key: string, content: string): string {
  const escaped = escapeAttr(content);
  return html.replace(
    new RegExp(`(<meta ${attr}="${key}"[^>]*content=")[^"]*("(?:[^>]*)?/?>)`, 'i'),
    `$1${escaped}$2`,
  );
}

function replaceJsonLd(html: string, jsonLd?: Record<string, unknown>): string {
  const data = jsonLd ?? DEFAULT_ORG;
  return html.replace(
    /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
    `$1\n      ${JSON.stringify(data)}\n    $2`,
  );
}

export function injectSeo(html: string, view: SeoView): string {
  let out = html
    .replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(view.title)}</title>`)
    .replace(
      /(<link rel="canonical"[^>]*href=")[^"]*(")/i,
      `$1${escapeAttr(view.url)}$2`,
    )
    .replace(/content="index,follow"/i, `content="${view.noindex ? 'noindex,follow' : 'index,follow'}"`);

  out = replaceMeta(out, 'name', 'description', view.description);
  out = replaceMeta(out, 'property', 'og:title', view.title);
  out = replaceMeta(out, 'property', 'og:description', view.description);
  out = replaceMeta(out, 'property', 'og:url', view.url);
  out = replaceMeta(out, 'property', 'og:image', view.image ?? DEFAULT_IMAGE);
  out = replaceMeta(out, 'name', 'twitter:title', view.title);
  out = replaceMeta(out, 'name', 'twitter:description', view.description);
  out = replaceMeta(out, 'name', 'twitter:image', view.image ?? DEFAULT_IMAGE);
  out = replaceJsonLd(out, view.jsonLd);
  return out;
}