import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = getSessionFromRequest(request);
  const isValid = validateSession(token);

  if (!isValid) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const [payloadB64] = (token || '').split('.');
    const payload = Buffer.from(payloadB64 || '', 'base64').toString('utf-8');
    const username = payload.split(':')[0] || 'User';

    return NextResponse.json({ authenticated: true, username });
  } catch {
    return NextResponse.json({ authenticated: true, username: 'User' });
  }
}
