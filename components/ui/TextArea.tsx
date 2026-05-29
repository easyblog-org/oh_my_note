import { TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export default function TextArea({ label, className = '', ...props }: TextAreaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[0.88rem] font-medium text-secondary-text">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`
          w-full px-4 py-3 text-[1rem] text-primary-text bg-card-bg
          rounded-container border border-border-gray outline-none resize-y min-h-[120px]
          transition-all duration-200
          focus:border-primary focus:bg-primary-light/50 focus:shadow-sm
          placeholder:text-muted-text
          ${className}
        `}
      />
    </div>
  );
}
