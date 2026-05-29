import { NextRequest, NextResponse } from 'next/server';
import { verifyLogin, createSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const isValid = verifyLogin(username, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', createSessionCookie(username));
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: '服务器错误，请重试' },
      { status: 500 }
    );
  }
}
