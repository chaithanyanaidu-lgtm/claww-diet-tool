/** Placeholder while a page's signed-in content streams in. */
export function PageLoading({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 sm:px-6" aria-busy="true">
      <p role="status" className="flex items-center gap-3 text-sm text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" aria-hidden="true" />
        {label}
      </p>
      <div className="mt-6 h-16 w-48 animate-pulse rounded-[14px] bg-line/60 motion-reduce:animate-none" />
      <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-line/60 motion-reduce:animate-none" />
      <div className="mt-10 h-40 w-full animate-pulse rounded-[20px] bg-line/40 motion-reduce:animate-none" />
    </div>
  );
}
