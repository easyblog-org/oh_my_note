const SESSION_COOKIE = 'oh_my_note_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function getConfiguredCredentials(): { username: string; password: string } | null {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (username && password) return { username, password };
  return null;
}

export function isAuthEnabled(): boolean {
  return getConfiguredCredentials() !== null;
}

export function verifyLogin(username: string, password: string): boolean {
  const credentials = getConfiguredCredentials();
  if (!credentials) return true;
  return username === credentials.username && password === credentials.password;
}

function generateSessionToken(username: string): string {
  const secret = process.env.AUTH_PASSWORD || 'default-secret';
  const payload = `${username}:${Date.now()}`;
  const signature = Buffer.from(`${payload}:${secret}`).toString('base64');
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

export function validateSession(token: string | undefined): boolean {
  const credentials = getConfiguredCredentials();
  if (!credentials) return true;
  if (!token) return false;

  try {
    const [payloadB64, signatureB64] = token.split('.');
    const secret = process.env.AUTH_PASSWORD || 'default-secret';
    const expectedSignature = Buffer.from(
      `${Buffer.from(payloadB64, 'base64').toString('utf-8')}:${secret}`
    ).toString('base64');
    return signatureB64 === expectedSignature;
  } catch {
    return false;
  }
}

export function getSessionFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1];
}

export function createSessionCookie(username: string): string {
  const token = generateSessionToken(username);
  const expires = new Date(Date.now() + SESSION_TTL).toUTCString();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export { SESSION_COOKIE };
