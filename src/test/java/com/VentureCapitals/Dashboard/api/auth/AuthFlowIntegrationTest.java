package com.VentureCapitals.Dashboard.api.auth;

import com.VentureCapitals.Dashboard.config.PostgresContainerTest;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The sign-up path over real HTTP, with a real session store: register, choose an account type,
 * stay signed in, and sign out. Slice tests can't cover this — the bugs that hit it live were all
 * about what happens <em>between</em> requests (a session that didn't carry the new role, a
 * context saved by the wrong filter), which only a second request can show.
 *
 * <p>This replaces an older disabled test that pointed at an endpoint which no longer exists.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "GOOGLE_CLIENT_ID=test-client-id",
        "GOOGLE_CLIENT_SECRET=test-client-secret",
        "LINKEDIN_CLIENT_ID=test-client-id",
        "LINKEDIN_CLIENT_SECRET=test-client-secret",
})
class AuthFlowIntegrationTest extends PostgresContainerTest {

    @SuppressWarnings("resource") // Reaped by Ryuk when the JVM exits.
    private static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    @DynamicPropertySource
    static void redis(DynamicPropertyRegistry registry) {
        if (!REDIS.isRunning()) {
            REDIS.start();
        }
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private UserRepository users;

    /** Cookies the browser would be holding: the session id and the CSRF token. */
    private final List<String> cookies = new ArrayList<>();

    @Test
    void a_new_user_registers_picks_a_side_stays_signed_in_and_signs_out() {
        String email = "flow-" + System.nanoTime() + "@example.test";

        assertThat(get("/api/auth/me").getStatusCode())
                .as("anonymous access is refused, not redirected to an OAuth page")
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<Map> registered = post("/api/auth/register",
                Map.of("email", email, "password", "secret123"));
        assertThat(registered.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(body(registered).get("userType")).as("the side is chosen after registering").isNull();

        ResponseEntity<Map> me = get("/api/auth/me");
        assertThat(me.getStatusCode())
                .as("registering signs you in; this was once a 401 because the session wasn't kept")
                .isEqualTo(HttpStatus.OK);
        assertThat(body(me).get("email")).isEqualTo(email);

        ResponseEntity<Map> chosen = post("/api/auth/account-type", Map.of("userType", "VC"));
        assertThat(chosen.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body(chosen).get("userType")).isEqualTo("VC");

        // The regression that mattered: the new role has to be in force on the NEXT request, not
        // only after signing out and back in.
        assertThat(rest.exchange("/api/vc/firms/me", HttpMethod.GET, entity(null), Map.class).getStatusCode())
                .as("the VC role applies immediately")
                .isEqualTo(HttpStatus.OK);

        assertThat(users.findByEmail(email).orElseThrow().getUserType()).isEqualTo(UserType.VC);

        assertThat(post("/api/auth/logout", null).getStatusCode())
                .as("logout answers the SPA instead of redirecting")
                .isEqualTo(HttpStatus.OK);
        assertThat(get("/api/auth/me").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void a_write_without_the_csrf_token_is_rejected() {
        get("/api/auth/me"); // issues the XSRF-TOKEN cookie

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.put(HttpHeaders.COOKIE, cookies);
        // Deliberately no X-XSRF-TOKEN header.
        ResponseEntity<Map> response = rest.exchange("/api/auth/register", HttpMethod.POST,
                new HttpEntity<>(Map.of("email", "csrf@example.test", "password", "secret123"), headers),
                Map.class);

        assertThat(response.getStatusCode().is2xxSuccessful()).isFalse();
        assertThat(users.findByEmail("csrf@example.test")).isEmpty();
    }

    @Test
    void registering_with_an_address_that_is_taken_says_so_without_confirming_the_password() {
        String email = "dupe-" + System.nanoTime() + "@example.test";
        get("/api/auth/me"); // issues the CSRF token, as loading the app does
        ResponseEntity<Map> first = post("/api/auth/register", Map.of("email", email, "password", "secret123"));
        assertThat(first.getStatusCode().is2xxSuccessful()).isTrue();

        // Start again as a fresh visitor: drop the session, then fetch a new CSRF token the way
        // the app does on load.
        cookies.clear();
        get("/api/auth/me");

        ResponseEntity<Map> second = post("/api/auth/register", Map.of("email", email, "password", "different"));

        assertThat(second.getStatusCode().is2xxSuccessful()).isFalse();
        assertThat(String.valueOf(second.getBody().get("message"))).doesNotContain("different");
    }

    // --- plumbing -------------------------------------------------------------------------

    private ResponseEntity<Map> get(String path) {
        ResponseEntity<Map> response = rest.exchange(path, HttpMethod.GET, entity(null), Map.class);
        remember(response);
        return response;
    }

    private ResponseEntity<Map> post(String path, Object body) {
        ResponseEntity<Map> response = rest.exchange(path, HttpMethod.POST, entity(body), Map.class);
        remember(response);
        return response;
    }

    private HttpEntity<Object> entity(Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (!cookies.isEmpty()) {
            headers.put(HttpHeaders.COOKIE, cookies);
            csrfToken().ifPresent(token -> headers.add("X-XSRF-TOKEN", token));
        }
        return new HttpEntity<>(body, headers);
    }

    /** Keeps the latest value of each cookie, the way a browser would. */
    private void remember(ResponseEntity<?> response) {
        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        if (setCookies == null) return;
        for (String setCookie : setCookies) {
            String pair = setCookie.split(";", 2)[0];
            String name = pair.split("=", 2)[0];
            cookies.removeIf(existing -> existing.startsWith(name + "="));
            cookies.add(pair);
        }
    }

    private java.util.Optional<String> csrfToken() {
        return cookies.stream()
                .filter(cookie -> cookie.startsWith("XSRF-TOKEN="))
                .map(cookie -> cookie.substring("XSRF-TOKEN=".length()))
                .findFirst();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> body(ResponseEntity<Map> response) {
        return (Map<String, Object>) response.getBody().get("data");
    }
}
