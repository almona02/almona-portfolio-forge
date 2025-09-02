import { cn } from "@/lib/utils";

export const SkeletonLoader = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "h-64 w-full animate-pulse rounded-lg bg-almona-darker/80",
        className
      )}
    />
  );
};
