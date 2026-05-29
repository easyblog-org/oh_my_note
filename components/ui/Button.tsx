import { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary/90 hover:-translate-y-px hover:shadow-md shadow-sm',
  secondary:
    'bg-btn-bg text-btn-text-dark hover:bg-border-light hover:-translate-y-px',
  danger:
    'bg-primary text-white hover:bg-primary/90 hover:-translate-y-px hover:shadow-md shadow-sm',
  ghost:
    'bg-transparent text-secondary-text hover:bg-subtle-bg hover:text-primary-text',
  dark:
    'bg-transparent text-darkest border border-border-gray hover:bg-primary hover:border-primary hover:text-white hover:-translate-y-px hover:shadow-md',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-[0.88rem]',
  md: 'px-6 py-2.5 text-[1rem]',
  lg: 'px-8 py-3 text-[1.13rem]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-pill font-normal
        transition-all duration-200 ease-out
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
