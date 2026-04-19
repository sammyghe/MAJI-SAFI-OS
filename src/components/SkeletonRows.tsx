export function SkeletonRows({ rows = 3, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-outline-variant/10">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-3 bg-surface-container-highest rounded"
              style={{ width: `${[28, 22, 18, 14, 10][j % 5]}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3 p-6 bg-surface-container-low ghost-border">
      <div className="h-2.5 bg-surface-container-highest rounded w-1/3" />
      <div className="h-8 bg-surface-container-highest rounded w-2/3" />
      <div className="h-2 bg-surface-container-highest rounded w-1/2" />
    </div>
  );
}
