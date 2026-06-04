import { cn } from '@/lib/utils';

type MemberAvatarSkeletonProps = {
  count?: number;
  className?: string;
};

export function MemberAvatarSkeleton({ count = 6, className }: MemberAvatarSkeletonProps) {
  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="bg-muted/30 size-12 animate-pulse rounded-full" />
          <div className="bg-muted/30 h-3 w-16 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
