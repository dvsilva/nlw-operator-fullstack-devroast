function RoastLoading() {
  return (
    <main className="flex flex-col w-full">
      <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto px-10 md:px-20 py-10">
        {/* Score Hero Skeleton */}
        <section className="flex items-center gap-12">
          <div className="w-[180px] h-[180px] rounded-full bg-bg-elevated animate-pulse shrink-0" />

          <div className="flex flex-col gap-4 flex-1">
            <div className="h-6 w-32 bg-bg-elevated animate-pulse rounded" />
            <div className="h-6 w-full max-w-md bg-bg-elevated animate-pulse rounded" />
            <div className="h-4 w-40 bg-bg-elevated animate-pulse rounded" />
          </div>
        </section>

        <hr className="border-border-primary" />

        {/* Code Block Skeleton */}
        <section className="flex flex-col gap-4">
          <div className="h-5 w-40 bg-bg-elevated animate-pulse rounded" />
          <div className="h-48 w-full bg-bg-elevated animate-pulse rounded" />
        </section>

        <hr className="border-border-primary" />

        {/* Analysis Cards Skeleton */}
        <section className="flex flex-col gap-6">
          <div className="h-5 w-48 bg-bg-elevated animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i.toString()}`}
                className="h-32 bg-bg-elevated animate-pulse rounded"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default RoastLoading;
