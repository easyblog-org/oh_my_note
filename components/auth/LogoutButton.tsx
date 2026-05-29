'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        toast.success('已退出登录');
        router.push('/login');
        router.refresh();
      }
    } catch {
      toast.error('退出失败，请重试');
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      退出
    </Button>
  );
}
