import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton'

export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#080808] pb-[calc(4rem+env(safe-area-inset-bottom))] pt-4">
      <div className="grid grid-cols-2 gap-3 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
