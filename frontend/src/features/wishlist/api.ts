import { fetchApi } from '@/lib/api-client'
import type { CreateWishlistItemRequest, WishlistItemDTO } from './types'

export const wishlistApi = {
  list: () => fetchApi<WishlistItemDTO[]>('/api/wishlist'),

  add: (request: CreateWishlistItemRequest) =>
    fetchApi<WishlistItemDTO>('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  remove: (id: string) => fetchApi<void>(`/api/wishlist/${id}`, { method: 'DELETE' }),
}

export const wishlistKeys = {
  all: ['wishlist'] as const,
}
