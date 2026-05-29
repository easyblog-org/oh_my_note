export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full border-b border-border-gray bg-card-bg sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
          <span className="text-[1rem] font-semibold text-primary tracking-tight">OhMyNote</span>
        </div>
      </header>
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-border-gray border-t-primary rounded-full animate-spin" />
            <p className="text-secondary-text text-[1rem]">Loading...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
