package com.VentureCapitals.Dashboard.domain.vc;

/**
 * The subscription a firm is on. Stored as its name, and mirrored by a CHECK constraint in V11.
 *
 * <p>Nothing is billed yet: selecting a tier records the choice and no more. It is kept as real
 * data rather than a client-side flag so that when billing arrives the tier is already on every
 * firm and the Settings screen has something true to show.
 */
public enum PlanTier {
    FREE(1, "Free"),
    STARTER(5, "Starter"),
    GROWTH(Integer.MAX_VALUE, "Growth");

    private final int seats;
    private final String label;

    PlanTier(int seats, String label) {
        this.seats = seats;
        this.label = label;
    }

    /** People who can be on the firm's team at once, the owner included. */
    public int seatLimit() {
        return seats;
    }

    public boolean unlimitedSeats() {
        return seats == Integer.MAX_VALUE;
    }

    public String label() {
        return label;
    }
}
