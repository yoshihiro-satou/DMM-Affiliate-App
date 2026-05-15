import { Skeleton } from './Skeleton'

type Props = {
  featured?: boolean
}

export function ProductCardSkeleton({ featured = false }: Props) {
  return (
    <div className={featured ? 'col-span-2 row-span-2' : 'col-span-1'}>
      <Skeleton className="aspect-video w-full rounded-lg" />
      {!featured && (
        <div className="mt-1 flex flex-col gap-1 px-0.5">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      )}
    </div>
  )
}
