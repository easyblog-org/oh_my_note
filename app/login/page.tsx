'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || '登录失败，请检查用户名和密码');
        return;
      }

      toast.success('登录成功');
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/';
      router.push(redirect);
    } catch {
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <header className="w-full">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-[1rem] font-semibold text-primary tracking-tight">
            OhMyNote
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] bg-card-bg border border-border-gray rounded-container shadow-sm p-8">
          <h1 className="text-[2rem] font-semibold text-primary-text tracking-tight mb-2">
            欢迎回来
          </h1>
          <p className="text-[0.88rem] text-muted-text mb-8">
            登录以管理你的文章
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="用户名"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="请输入用户名"
            />

            <Input
              label="密码"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="请输入密码"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="mt-2 w-full"
            >
              {loading ? '登录中...' : '登录'}
            </Button>

            {error && (
              <p className="text-[0.81rem] text-center text-secondary-text mt-1">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
