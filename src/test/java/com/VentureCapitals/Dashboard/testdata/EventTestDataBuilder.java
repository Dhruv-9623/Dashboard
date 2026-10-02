package com.VentureCapitals.Dashboard.testdata;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Placeholder builder for Event.
 * Will be fully implemented when the Event entity is created.
 *
 * Usage:
 * EventTestDataBuilder builder = TestDataBuilder.event();
 * // To be implemented
 */
public class EventTestDataBuilder {

    private UUID id = UUID.randomUUID();
    private String title = TestDataBuilder.unique("Event");
    private String eventType = "NETWORKING";
    private LocalDateTime startTime = LocalDateTime.now().plusDays(7);
    private boolean isPublic = true;

    public EventTestDataBuilder withId(UUID id) {
        this.id = id;
        return this;
    }

    public EventTestDataBuilder withTitle(String title) {
        this.title = title;
        return this;
    }

    public EventTestDataBuilder withEventType(String eventType) {
        this.eventType = eventType;
        return this;
    }

    public EventTestDataBuilder withStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
        return this;
    }

    public EventTestDataBuilder withPublic(boolean isPublic) {
        this.isPublic = isPublic;
        return this;
    }

    public Object build() {
        // TODO: Implement when Event entity is created
        throw new UnsupportedOperationException(
            "EventTestDataBuilder.build() - Implement when Event entity is created"
        );
    }
}
