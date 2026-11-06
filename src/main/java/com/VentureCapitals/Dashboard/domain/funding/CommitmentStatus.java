package com.VentureCapitals.Dashboard.domain.funding;

/**
 * How firm an investor's interest is, weakest first.
 *
 * <p>The order matters: {@link #INDICATED} is a conversation, {@link #COMMITTED} is money the
 * founder can plan around. Totalling them into one "committed" figure would overstate a round,
 * which is why the cycle reports each band separately.
 */
public enum CommitmentStatus {
    INDICATED,
    SOFT_COMMITTED,
    COMMITTED,

    /**
     * The firm has pulled out. Not a point on the ladder above — it sits outside the scale, which
     * is why it is last rather than first.
     *
     * <p>It is a status rather than a delete because the founder needs to know an investor left;
     * erasing the row would make a round look as though it had never had that interest. For the
     * same reason it is excluded from every total: a withdrawn pledge that still counted toward
     * the bands would tell a founder they have money that has explicitly gone away, which is the
     * exact failure the three-band split exists to prevent.
     *
     * <p>It is not terminal. A firm that comes back re-commits through the normal POST, which
     * finds the existing row and moves it back onto the ladder.
     */
    WITHDRAWN
}
