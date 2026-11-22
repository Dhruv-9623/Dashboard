package com.VentureCapitals.Dashboard.domain.vc;

/**
 * A firm as a particular reader is allowed to see it.
 *
 * @param thesis only present when {@code own} — the thesis and the plan are the firm's business,
 *               not part of the public profile a founder browses
 * @param own    whether the reader belongs to this firm
 */
public record FirmProfile(VCFirm firm, VCFirmThesis thesis, boolean own) {
}
