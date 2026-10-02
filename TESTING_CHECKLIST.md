# Testing Checklist — Before Submitting Code

Use this checklist when implementing a new feature or fixing a bug. Ensure tests are written for all new code.

## Pre-Implementation

- [ ] **Understand the feature** — Read requirements, acceptance criteria
- [ ] **Plan test cases** — What scenarios need testing? What are edge cases?
- [ ] **Identify layers** — Service, Repository, Controller, API?

## Unit Tests (For Business Logic)

For each **Service** class:
- [ ] Test **happy path** — Normal execution with valid inputs
- [ ] Test **validation errors** — Invalid inputs rejected with proper exceptions
- [ ] Test **edge cases** — Boundary conditions, empty collections, nulls
- [ ] Test **state changes** — Data mutations are correct
- [ ] Test **exception handling** — Proper error types and messages
- [ ] **Avoid:** Testing Spring framework, ORM mapping, getter/setters

Checklist for unit test quality:
- [ ] Uses `BaseUnitTest` as parent class
- [ ] Follows naming pattern: `should_{expected}_when_{condition}`
- [ ] Uses `TestDataBuilder` for test data
- [ ] Only mocks external dependencies (repositories, external services)
- [ ] Uses fluent assertions (AssertJ)
- [ ] One logical assertion per test
- [ ] No database access (mocked repository)
- [ ] Runs in <100ms

**Example:**
```java
class UserServiceTest extends BaseUnitTest {
    @Mock private UserRepository repo;
    @InjectMocks private UserService service;

    @Test
    void should_throw_error_when_email_invalid() {
        assertThatThrownBy(() -> service.validateEmail("not-email"))
            .isInstanceOf(ValidationException.class);
    }
}
```

## Repository Tests (Custom Queries)

For each **Repository** with custom query methods:
- [ ] Test custom `@Query` methods
- [ ] Test named query results (empty, single, multiple)
- [ ] Test filtering by different fields
- [ ] Test sorting
- [ ] Test pagination
- [ ] Test relationship loading (eager vs. lazy)

**Example:**
```java
class UserRepositoryTest extends BaseIntegrationTest {
    @Autowired private UserRepository repo;

    @Test
    void should_find_active_users_by_role() {
        // Arrange: Save test users
        repo.save(TestDataBuilder.user().withActive(true).build());
        repo.save(TestDataBuilder.user().withActive(false).build());

        // Act
        var results = repo.findActiveByUserType(UserType.VC);

        // Assert
        assertThat(results).hasSize(1);
    }
}
```

## Controller Tests (REST API)

For each **Controller** endpoint:
- [ ] Test **happy path** — Valid request returns correct status
- [ ] Test **validation errors** — Invalid request body returns 400
- [ ] Test **not found** — Missing resource returns 404
- [ ] Test **authentication** — Unauthenticated access returns 401
- [ ] Test **authorization** — Wrong role returns 403
- [ ] Test **response format** — JSON structure, fields, types
- [ ] Test **headers** — Content-Type, Location for POST

Checklist:
- [ ] Uses `BaseIntegrationTest` as parent
- [ ] Uses `MockMvc` for requests
- [ ] Uses `@WithMockUser` for auth tests
- [ ] Verifies response status, headers, body
- [ ] Verifies database changes (if applicable)

**Example:**
```java
class UserControllerTest extends BaseIntegrationTest {
    @Autowired private MockMvc mvc;
    @Autowired private UserRepository repo;

    @Test
    void should_return_401_when_unauthenticated() throws Exception {
        mvc.perform(get("/api/users/profile"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "OWNER")
    void should_return_user_profile_when_authenticated() throws Exception {
        mvc.perform(get("/api/users/profile"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").exists());
    }
}
```

## Integration Tests (Full Workflows)

For **cross-service scenarios**:
- [ ] Test complete user registration flow
- [ ] Test deal flow (investment creation → notification → update)
- [ ] Test messaging (connection request → chat unlocked)
- [ ] Test Kafka event publishing/consumption
- [ ] Test Redis caching
- [ ] Test transaction rollback on error

**Example:**
```java
class FundingCycleWorkflowIT extends BaseIntegrationTest {
    @Autowired private MockMvc mvc;
    @Autowired private FundingCycleRepository cycleRepo;
    @Autowired private StartupRepository startupRepo;

    @Test
    void should_create_funding_cycle_and_notify_investors() throws Exception {
        // Arrange: Create startup
        Startup startup = TestDataBuilder.startup().build();
        startupRepo.save(startup);

        // Act: Create funding cycle via API
        mvc.perform(post("/api/funding-cycles")
                .contentType("application/json")
                .content(cycleJson))
            .andExpect(status().isCreated());

        // Assert: Cycle saved
        var saved = cycleRepo.findByStartup(startup);
        assertThat(saved).isNotEmpty();

        // Assert: Notification sent (verify Kafka message)
        // ...
    }
}
```

## Code Coverage

- [ ] Run: `mvn clean test jacoco:report`
- [ ] Check: `target/site/jacoco/index.html`
- [ ] Verify service coverage is **80%+**
- [ ] Verify controller coverage is **70%+**
- [ ] No untested exception paths

## Test Execution & Quality

Before pushing code:

```bash
# Run all tests
mvn clean test

# Verify no test warnings
mvn clean test -DwarnOnWarnings

# Check coverage
mvn jacoco:report

# Run specific test
mvn test -Dtest=UserServiceTest
```

Acceptance Criteria:
- [ ] All tests pass locally
- [ ] All tests pass in CI/CD
- [ ] No test warnings
- [ ] Coverage goals met (80%+ service, 70%+ controller)
- [ ] No flaky tests (run 3x, all pass)

## Code Review Checklist

When reviewing someone else's tests:

- [ ] **Test follows naming convention** — `should_*_when_*`
- [ ] **Base class appropriate** — `BaseUnitTest` for unit, `BaseIntegrationTest` for integration
- [ ] **Test data uses builders** — `TestDataBuilder.user().build()`
- [ ] **Mocks only external deps** — Repository mocked in service test, not in repository test
- [ ] **Fluent assertions used** — `assertThat()` not `assertEquals()`
- [ ] **One logical assertion** — Not testing 5 things at once
- [ ] **Test is independent** — Can run alone, in any order
- [ ] **Test is readable** — Clear arrange/act/assert sections
- [ ] **No hardcoded IDs** — Use `UUID.randomUUID()` or builders
- [ ] **Proper exception testing** — `assertThatThrownBy()` or `@Test(expected=...)`

**Good example to approve:**
```java
@Test
void should_reject_duplicate_email_on_registration() {
    // Arrange
    User existing = TestDataBuilder.user()
        .withEmail("taken@example.com")
        .build();
    when(userRepository.findByEmail("taken@example.com"))
        .thenReturn(Optional.of(existing));

    // Act & Assert
    assertThatThrownBy(() -> 
        userService.registerWithEmailPassword("taken@example.com", "pass"))
    .isInstanceOf(ValidationException.class)
    .hasMessageContaining("email already in use");
}
```

**Bad example to request changes on:**
```java
@Test
public void testUser() {
    // ❌ Bad name
    User u = new User();  // ❌ No builder
    u.setId(UUID.randomUUID());
    u.setEmail("test@test.com");
    // ... hardcoded data
    
    userService.doSomething(u);
    
    assertTrue(u.getId() != null);  // ❌ Bad assertion
    assertTrue(u.isActive());  // ❌ Multiple unrelated assertions
}
```

## Feature Checklist (What to Test)

### When implementing a Service:
- [ ] Constructor/initialization
- [ ] Main happy path
- [ ] All public methods
- [ ] Validation/rejection scenarios
- [ ] Exception paths
- [ ] Dependency interactions
- [ ] Edge cases (null, empty, max values)

### When implementing a Repository:
- [ ] Save/Create
- [ ] Read/Find
- [ ] Update
- [ ] Delete
- [ ] Custom query methods
- [ ] Filtering
- [ ] Sorting
- [ ] Pagination

### When implementing a Controller:
- [ ] GET endpoints (200, 404)
- [ ] POST endpoints (201, 400)
- [ ] PUT endpoints (200, 400, 404)
- [ ] DELETE endpoints (204, 404)
- [ ] Authentication (401)
- [ ] Authorization (403)
- [ ] Request validation
- [ ] Response format

## Test Data Guidelines

**Use builders consistently:**
```java
// ✅ Good
User user = TestDataBuilder.user().withEmail("test@example.com").build();

// ❌ Bad
User user = new User();
user.setEmail("test@example.com");
user.setId(UUID.randomUUID());
```

**Use Faker for realistic data:**
```java
// ✅ Good
String email = TestDataBuilder.faker().internet().emailAddress();

// ❌ Bad
String email = "user" + System.currentTimeMillis() + "@example.com";
```

**Create fixtures for common scenarios:**
```java
// In test setup:
VCFirm seqouia = TestDataBuilder.vcFirm()
    .withName("Sequoia Capital")
    .withAUM(10_000_000_000L)
    .build();

Startup techCorp = TestDataBuilder.startup()
    .withName("TechCorp")
    .withSector("FINTECH")
    .build();
```

## Documentation Requirements

When adding a new test suite:
- [ ] Add class-level JavaDoc explaining what's being tested
- [ ] Explain non-obvious test setup
- [ ] Document any test data fixtures
- [ ] Link to related requirements/issues

**Example:**
```java
/**
 * Integration tests for UserRegistrationService.
 * Tests:
 * - Email uniqueness validation
 * - Password hashing
 * - User activation workflow
 * - OAuth provider integration
 *
 * @see UserRegistrationService
 */
class UserRegistrationServiceIT extends BaseIntegrationTest {
    // ...
}
```

## Troubleshooting Tests

If a test fails:

1. [ ] **Read the error** — What exactly failed?
2. [ ] **Run in isolation** — `mvn test -Dtest=ClassName#methodName`
3. [ ] **Add debug logging** — `System.out.println()` or logger
4. [ ] **Check test data** — Is it realistic?
5. [ ] **Verify mocks** — Are they set up correctly?
6. [ ] **Check timing** — Is there a race condition?
7. [ ] **Review recent changes** — Did something break it?

## Before Submitting PR

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage is adequate (80%+ service, 70%+ controller)
- [ ] Test names are clear and follow pattern
- [ ] Test data uses builders
- [ ] No hardcoded IDs or dates
- [ ] No test warnings
- [ ] Tests are independent (can run in any order)
- [ ] No flaky tests (run multiple times, always pass)
- [ ] Code review passed
- [ ] CI/CD pipeline passes

## Questions to Ask

Before submitting code without tests:
- "Why isn't this tested?" → Answer forces you to either write test or justify
- "How would I know if this broke?" → If no tests, you wouldn't
- "Is this business logic?" → Yes → Must test it
- "Would a PR reviewer have questions?" → Yes → Tests answer them

**Remember:** Tests are not optional. They're part of the implementation.
