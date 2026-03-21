interface SkeletonProps {
  width?: string
  height?: string
  className?: string
}

export function Skeleton({ width, height, className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-[#1a1a1a] animate-pulse rounded-lg ${className}`}
      style={{ width, height }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="mt-8 bg-[#111111] border border-[#222222] rounded-xl p-8 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-48 h-6" />
        <Skeleton className="w-32 h-4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-5/6 h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-4/5 h-4" />
      </div>
      <Skeleton className="w-28 h-3 mt-6" />
    </div>
  )
}

export function SkeletonBadge() {
  return <span className="bg-[#1a1a1a] animate-pulse rounded-full w-16 h-5 inline-block" />
}
