import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { wishlistApi, wishlistKeys } from './api'
import type { WishlistTargetType } from './types'

/** Heart toggle shared by the startup and investor discovery views. */
export const useWishlistToggle = (targetType: WishlistTargetType) => {
  const queryClient = useQueryClient()

  const wishlist = useQuery({ queryKey: wishlistKeys.all, queryFn: wishlistApi.list })

  const toggle = useMutation({
    mutationFn: async (targetId: string) => {
      const existing = (wishlist.data ?? []).find((item) => item.targetId === targetId)
      return existing
        ? wishlistApi.remove(existing.id)
        : wishlistApi.add({ targetType, targetId })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKeys.all }),
  })

  const savedIds = new Set((wishlist.data ?? []).map((item) => item.targetId))

  return { isSaved: (id: string) => savedIds.has(id), toggle }
}
