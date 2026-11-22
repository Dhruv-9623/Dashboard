package com.VentureCapitals.Dashboard.common;

/**
 * The two kinds of organisation on the platform, as other features point at them.
 *
 * <p>Wishlists, connection requests and profile views all say "this firm" or "this startup", and
 * the frontend already speaks in exactly these two words. One shared enum keeps them from drifting
 * into three near-identical ones.
 */
public enum TargetType {
    VC_FIRM,
    STARTUP
}
