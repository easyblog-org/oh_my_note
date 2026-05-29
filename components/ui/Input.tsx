import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[0.88rem] font-medium text-secondary-text">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`
          w-full px-4 py-[10px] text-[1rem] text-primary-text bg-card-bg
          rounded-pill border border-border-gray outline-none
          transition-all duration-200
          focus:border-primary focus:bg-primary-light/50 focus:shadow-sm
          placeholder:text-muted-text
          ${className}
        `}
      />
    </div>
  );
}
