package com.VentureCapitals.Dashboard.config;

import org.testcontainers.DockerClientFactory;

/**
 * Whether a Docker daemon can be reached, cached for the whole run.
 *
 * <p>Probing is slow and throws rather than returning false on some setups, so it happens once and
 * any failure is read as "no Docker".
 */
final class DockerAvailability {

    private static final boolean AVAILABLE = probe();

    private DockerAvailability() {
    }

    static boolean isAvailable() {
        return AVAILABLE;
    }

    private static boolean probe() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable ignored) {
            return false;
        }
    }
}
