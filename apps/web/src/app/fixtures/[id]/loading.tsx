import { Skeleton } from '@/components/ui/skeleton';

export default function FixtureLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="card-surface p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-4">
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-10 w-20" />
          <div className="flex flex-1 items-center justify-end gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </div>
      {/* Tabs */}
      <Skeleton className="h-10 w-full rounded-lg" />
      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
