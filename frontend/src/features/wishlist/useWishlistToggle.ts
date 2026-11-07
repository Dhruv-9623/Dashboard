import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { wishlistApi, wishlistKeys } from './api'
import type { WishlistItemDTO, WishlistTargetType } from './types'
import { useToast } from '@/components/ui/Toast'

/** Heart toggle shared by the startup and investor discovery views. */
export const useWishlistToggle = (targetType: WishlistTargetType) => {
  const queryClient = useQueryClient()
  const toast = useToast()

  const wishlist = useQuery({ queryKey: wishlistKeys.all, queryFn: wishlistApi.list })

  const toggle = useMutation({
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
    mutationFn: async (targetId: string) => {
      const existing = (wishlist.data ?? []).find((item) => item.targetId === targetId)
      return existing
        ? wishlistApi.remove(existing.id)
        : wishlistApi.add({ targetType, targetId })
    },
    // Optimistic: the heart fills immediately instead of waiting for the round trip.
    onMutate: async (targetId: string) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.all })
      const previous = queryClient.getQueryData<WishlistItemDTO[]>(wishlistKeys.all)
      const existing = (previous ?? []).find((item) => item.targetId === targetId)

      queryClient.setQueryData<WishlistItemDTO[]>(wishlistKeys.all, (current = []) =>
        existing
          ? current.filter((item) => item.targetId !== targetId)
          : [...current, { id: `optimistic-${targetId}`, targetType, targetId, savedAt: new Date().toISOString() } as WishlistItemDTO]
      )

      return { previous, wasSaved: Boolean(existing) }
    },
    onError: (_error, _targetId, context) => {
      // Put the previous list back, then say what failed.
      //
      // Restored whenever `onMutate` ran, even if the snapshot it took was `undefined`. Guarding
      // on the snapshot's truthiness instead left the optimistic entry in the cache in the one
      // case that matters: the list request had failed too, so there was nothing to put back, and
      // the heart stayed filled beside a toast saying the save had failed.
      if (context) queryClient.setQueryData(wishlistKeys.all, context.previous)
      toast.error(
        context?.wasSaved ? "Couldn't remove from your wishlist" : "Couldn't save to your wishlist"
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: wishlistKeys.all }),
  })

  const savedIds = new Set((wishlist.data ?? []).map((item) => item.targetId))

  return { isSaved: (id: string) => savedIds.has(id), toggle }
}
