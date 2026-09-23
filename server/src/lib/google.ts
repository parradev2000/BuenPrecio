import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export type GoogleClaims = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function verifyGoogleIdToken(idToken: string, audience: string): Promise<GoogleClaims | null> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience,
    });
    if (!payload.sub || !payload.email || payload.email_verified !== true) {
      return null;
    }
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
      ...(typeof payload.picture === 'string' ? { picture: payload.picture } : {}),
    };
  } catch {
    return null;
  }
}
