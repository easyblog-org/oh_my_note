interface PillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function Pill({ label, active = false, onClick }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center px-4 py-1.5
        text-[0.88rem] font-normal
        rounded-pill border transition-all duration-200 cursor-pointer
        ${active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-card-bg text-secondary-text border-border-gray hover:border-border-light hover:text-primary-text'
        }
      `}
    >
      {label}
    </button>
  );
}
