import Link from 'next/link';
import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className="w-full border-b border-border-gray bg-card-bg backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-[1rem] font-semibold text-primary tracking-tight">
          OhMyNote
        </Link>
        <nav className="flex items-center gap-4">
          {children}
        </nav>
      </div>
    </header>
  );
}
