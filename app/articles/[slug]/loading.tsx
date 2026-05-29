export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-border-gray border-t-primary-text rounded-full animate-spin" />
        <p className="text-secondary-text text-[1.13rem]">Loading article...</p>
      </div>
    </div>
  );
}
