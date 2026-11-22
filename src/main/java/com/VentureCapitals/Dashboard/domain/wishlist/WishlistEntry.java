package com.VentureCapitals.Dashboard.domain.wishlist;

/** A saved item together with the few facts about its target that the list shows. */
public record WishlistEntry(WishlistItem item, String name, String sector, String stage, String logoUrl) {
}
