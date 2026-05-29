'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <header className="w-full border-b border-border-gray bg-card-bg sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
          <span className="text-[1rem] font-semibold text-primary tracking-tight">OhMyNote</span>
        </div>
      </header>
      <main className="flex-1 max-w-[480px] mx-auto w-full px-6 flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-full bg-subtle-bg flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-primary-text mb-2">
          出了点问题
        </h1>
        <p className="text-[0.88rem] text-secondary-text text-center mb-6 leading-relaxed">
          页面加载出错，请稍后重试
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 text-[0.94rem] font-normal rounded-pill bg-primary text-white hover:bg-primary/90 transition-colors duration-200 cursor-pointer"
        >
          重试
        </button>
      </main>
    </div>
  );
}
