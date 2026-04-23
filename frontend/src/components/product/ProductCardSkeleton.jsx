import Skeleton from "../ui/Skeleton.jsx";

export default function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
