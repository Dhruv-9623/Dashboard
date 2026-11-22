package com.VentureCapitals.Dashboard.domain.events;

/** An event with the three things that depend on who is looking: host name, head count, and their reply. */
public record EventView(Event event, String hostName, long attendeeCount, RsvpStatus myRsvp) {
}
