import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-card-bg border border-border-gray rounded-container p-6 shadow-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-border-light' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
