'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { toast } from 'sonner';

interface SidebarProps {
  children: ReactNode;
}

interface UserInfo {
  username: string;
}

const navItems = [
  {
    label: '文章管理',
    href: '/',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: '上传文章',
    href: '/articles/upload',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
];

const hiddenPaths = ['/login'];

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hideSidebar = hiddenPaths.some(p => pathname.startsWith(p));

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setUser({ username: data.username });
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

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

  if (hideSidebar) {
    return <>{children}</>;
  }

  const sidebarWidth = collapsed ? 60 : 220;

  return (
    <div className="min-h-screen flex">
      <aside
        className={`bg-card-bg border-r border-border-gray flex flex-col shrink-0 fixed h-full z-40 transition-all duration-200 ease-out ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
      >
        <div className={`h-14 flex items-center border-b border-border-gray ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
          {!collapsed ? (
            <Link href="/" className="text-[1rem] font-semibold text-primary-text tracking-tight">
              OhMyNote
            </Link>
          ) : (
            <Link href="/" className="text-primary-text font-bold text-[1.13rem]">
              O
            </Link>
          )}
        </div>

        <nav className="flex-1 py-3 px-3">
          {navItems.map(item => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-[0.88rem] rounded-md transition-colors mb-0.5 ${collapsed ? 'justify-center' : ''
                  } ${isActive
                    ? 'bg-primary/8 text-primary font-medium'
                    : 'text-secondary-text hover:bg-subtle-bg hover:text-primary-text'
                  }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border-gray">
          <div className={`flex ${collapsed ? 'flex-col items-center' : 'items-center justify-between'} px-3 py-4`}>
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 min-w-0 hover:bg-subtle-bg rounded-md px-1.5 py-1 -mx-1.5 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[0.81rem] font-semibold shrink-0">
                    {(user.username || 'U')[0].toUpperCase()}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="text-[0.81rem] text-secondary-text truncate">{user.username}</span>
                      <svg className={`w-3.5 h-3.5 text-muted-text transition-transform duration-150 shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                      </svg>
                    </>
                  )}
                </button>

                {userMenuOpen && (
                  <div className={`absolute ${collapsed ? 'left-full ml-2 bottom-0' : 'left-0 bottom-full mb-2'} w-[180px] bg-white border border-border-gray/60 rounded-xl shadow-lg overflow-hidden z-50`}>
                    <style>{`@keyframes menuIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                    <div className="py-0">
                      {[
                        {
                          key: 'github',
                          el: (
                            <a
                              href="https://github.com/easyblog-org/oh_my_note"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 px-3.5 py-1.5 text-[0.85rem] text-secondary-text hover:text-primary-text hover:bg-primary/5 transition-colors"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                              </svg>
                              GitHub
                            </a>
                          ),
                        },
                        {
                          key: 'divider',
                          el: <div className="mx-3 border-t border-border-gray/40" />,
                        },
                        {
                          key: 'logout',
                          el: (
                            <button
                              type="button"
                              onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                              className="flex items-center gap-2.5 w-full px-3.5 py-1.5 text-[0.85rem] text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4 shrink-0" viewBox="0 0 1024 1024" fill="#fb2c36">
                                <path d="M512 896c-215.3 0-390.4-175.1-390.4-390.4 0-137.1 71-261.8 189.8-333.4 17.7-10.6 40.9-5 51.6 12.8 10.7 17.8 5.1 40.9-12.8 51.7-96.1 57.9-153.4 158.5-153.4 269 0 173.7 141.4 315.1 315.1 315.1S827 679.4 827 505.7c0-110.5-57.3-211.1-153.4-269-17.8-10.7-23.5-33.8-12.9-51.7 10.9-17.8 34-23.4 51.7-12.8 118.8 71.6 189.8 196.3 189.8 333.4C902.4 720.9 727.3 896 512 896z" />
                                <path d="M512 523.9c-20.8 0-37.6-16.8-37.6-37.6V165.6c0-20.8 16.8-37.6 37.6-37.6s37.6 16.8 37.6 37.6v320.6c0.1 20.8-16.8 37.7-37.6 37.7z" />
                              </svg>
                              退出登录
                            </button>
                          ),
                        },
                      ].map((item, i) => (
                        <div
                          key={item.key}
                          className="opacity-0"
                          style={{
                            animation: 'menuIn 200ms ease-out forwards',
                            animationDelay: `${i * 55}ms`,
                          }}
                        >
                          {item.el}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !collapsed && (
                <div className="w-8 h-8 rounded-full bg-border-gray/30 animate-pulse" />
              )
            )}

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className={`p-1.5 text-muted-text hover:text-secondary-text hover:bg-subtle-bg rounded-md transition-colors cursor-pointer shrink-0 ${collapsed ? 'mt-2' : ''}`}
              title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                <rect x="2.5" y="1.5" width="11" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 1.5v13" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen transition-all duration-200 ease-out" style={{ marginLeft: sidebarWidth }}>
        {children}
      </div>
    </div>
  );
}
