# Test Framework & Strategy: Dashboard Project

Comprehensive guide for unit testing, integration testing, and test data management.

## Overview

The Dashboard implements a **two-tier testing strategy**:

| Tier | Framework | Speed | Dependencies | Purpose |
|------|-----------|-------|--------------|---------|
| **Unit** | JUnit 5 + Mockito | Fast (<100ms) | None (mocked) | Business logic, edge cases |
| **Integration** | Spring Boot Test + TestContainers | Slow (1-5s per test) | PostgreSQL, Redis, Kafka | Full workflows, persistence, messaging |

**Philosophy:** 80% unit tests, 20% integration tests. Test behavior, not implementation.

---

## Quick Start

### Setup

```bash
# Install dependencies (already in pom.xml)
mvn clean install

# Run all tests
mvn clean test

# Run only unit tests
mvn test -DskipITs

# Run single test
mvn test -Dtest=UserServiceTest

# Run with coverage
mvn clean test jacoco:report
# View: target/site/jacoco/index.html
```

### Example: Writing a Unit Test

```java
package com.VentureCapitals.Dashboard.domain.user;

import com.VentureCapitals.Dashboard.config.BaseUnitTest;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest extends BaseUnitTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void should_complete_account_type_selection_when_user_exists() {
        // Arrange: Use test data builder
        User user = TestDataBuilder.user()
                .withEmail("founder@example.com")
                .build();
        
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        User updated = userService.completeAccountTypeSelection(user.getId(), UserType.STARTUP);

        // Assert
        assertThat(updated.getUserType()).isEqualTo(UserType.STARTUP);
    }
}
```

### Example: Writing an Integration Test

```java
package com.VentureCapitals.Dashboard.api.auth;

import com.VentureCapitals.Dashboard.config.BaseIntegrationTest;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void should_save_user_to_database_on_registration() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content("""
                    {
                        "email": "test@example.com",
                        "password": "SecurePass123!"
                    }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.email").value("test@example.com"));
    }
}
```

---

## Unit Testing

### Base Class: `BaseUnitTest`

Located at: `src/test/java/com/VentureCapitals/Dashboard/config/BaseUnitTest.java`

```java
@ExtendWith(MockitoExtension.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public abstract class BaseUnitTest { }
```

**Features:**
- Mockito extension auto-loaded
- Test names converted from snake_case to readable format
- No Spring context (fast)

### Structure

```
Unit Test
├── Setup (Arrange)
│   ├── Create test data using builders
│   ├── Mock dependencies
│   └── Setup expectations
├── Execution (Act)
│   └── Call method under test
└── Verification (Assert)
    ├── Verify return value
    └── Verify mock calls
```

### Pattern: Arrange-Act-Assert

```java
@Test
void should_reject_duplicate_email() {
    // ✅ Arrange: Set up preconditions
    User existingUser = TestDataBuilder.user()
            .withEmail("taken@example.com")
            .build();
    when(userRepository.findByEmail("taken@example.com"))
            .thenReturn(Optional.of(existingUser));

    // ✅ Act: Execute the method
    var exception = assertThrows(ValidationException.class, () ->
        userService.registerWithEmailPassword("taken@example.com", "pass")
    );

    // ✅ Assert: Verify the result
    assertThat(exception.getMessage())
            .contains("email already in use");
}
```

### Naming Convention

```
Format: should_{expected_result}_when_{condition}

Examples:
✅ should_throw_error_when_email_already_exists
✅ should_create_vc_member_when_owner_adds_staff
✅ should_not_update_investment_when_status_is_exited
```

### What to Test

| Type | What | Example |
|------|------|---------|
| **Service** | Business logic, validations | Calculating equity%, validating email format |
| **Repository** | Custom query logic | `findByEmail()`, `findByInvestmentStatus()` |
| **Controller** | Request mapping, validation | POST body validation, response format |
| **Utility** | Helper functions | Date formatters, UUID generators |

### What NOT to Test

❌ Spring framework behavior (tested by Spring)  
❌ JPA ORM mapping (tested by Hibernate)  
❌ Database constraints (tested by integration tests)  
❌ Getter/setter methods (trivial)  
❌ Dependency injection (Spring tests this)  

### Best Practices

1. **One logical assertion per test**
   ```java
   ✅ Good: One concept tested per method
   void should_return_active_investments() { }
   void should_filter_out_exited_investments() { }
   
   ❌ Bad: Multiple unrelated concepts
   void should_return_and_filter_and_sort() { }
   ```

2. **Use builders, not hardcoded objects**
   ```java
   ✅ Good
   User user = TestDataBuilder.user().withEmail("test@example.com").build();
   
   ❌ Bad
   User user = new User();
   user.setId(UUID.randomUUID());
   user.setEmail("test@example.com");
   ```

3. **Only mock external dependencies**
   ```java
   ✅ Good: Mock repository, test service
   @Mock private UserRepository repo;
   @InjectMocks private UserService service;
   
   ❌ Bad: Mocking what you're testing
   @Mock private UserService service;
   ```

4. **Avoid testing implementation details**
   ```java
   ✅ Good: Test contract
   assertThat(user.getUserType()).isEqualTo(UserType.VC);
   
   ❌ Bad: Test how it's done
   verify(repository, times(1)).save(any());
   ```

5. **Use fluent assertions (AssertJ)**
   ```java
   ✅ Good: Readable, chainable
   assertThat(user)
       .isNotNull()
       .hasFieldOrPropertyWithValue("email", "test@example.com")
       .hasFieldOrPropertyWithValue("userType", UserType.VC);
   
   ❌ Bad: Less readable
   assertNotNull(user);
   assertEquals("test@example.com", user.getEmail());
   assertEquals(UserType.VC, user.getUserType());
   ```

### Common Unit Test Scenarios

**Testing exception cases:**
```java
@Test
void should_throw_validation_error_when_email_invalid() {
    assertThatThrownBy(() -> userService.validateEmail("not-an-email"))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("Invalid email format");
}
```

**Testing with mocked lists:**
```java
@Test
void should_return_vc_members_filtered_by_role() {
    VCFirm firm = TestDataBuilder.vcFirm().build();
    List<VCMember> allMembers = List.of(
        new VCMember(owner, firm, VCRole.OWNER),
        new VCMember(staff, firm, VCRole.STAFF)
    );
    
    when(memberRepository.findByFirmAndRole(firm, VCRole.OWNER))
        .thenReturn(List.of(allMembers.get(0)));

    List<VCMember> result = vcService.findOwners(firm);
    
    assertThat(result).hasSize(1);
}
```

---

## Integration Testing

### Base Class: `BaseIntegrationTest`

Located at: `src/test/java/com/VentureCapitals/Dashboard/config/BaseIntegrationTest.java`

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public abstract class BaseIntegrationTest { }
```

**Features:**
- Full Spring context loaded
- MockMvc configured for REST testing
- Test profile applied (H2 database by default)
- Real beans, test doubles only for external services

### Structure

```
Integration Test
├── Setup
│   ├── Spring context boots
│   ├── Database initialized
│   └── Test data seeded
├── Execution
│   ├── Real HTTP request via MockMvc
│   ├── Service logic executes
│   └── Database state changes
└── Verification
    ├── Response assertions
    └── Database state assertions
```

### Test Profiles

**`application-test.properties`** (default for integration tests):
```properties
# H2 in-memory database
spring.datasource.url=jdbc:h2:mem:testdb
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop

# Logging
logging.level.root=WARN
logging.level.com.VentureCapitals.Dashboard=DEBUG
```

### Full Stack vs. Partial Mocking

**Full Stack (Real Infrastructure):**
```java
@SpringBootTest
class UserRegistrationIT extends BaseIntegrationTest {
    // Uses real database, real repository, real service
    // Database changes persist for this test
}
```

**Partial Mocking (Useful for external services):**
```java
@SpringBootTest
class VCSearchWithAIIT extends BaseIntegrationTest {
    @MockBean
    private ChatClient aiClient;  // Mock AI to avoid API calls
    
    @Autowired
    private VCSearchService vcSearchService;  // Real service
    
    @Test
    void should_fetch_vc_firms_and_score_with_ai() {
        when(aiClient.call(any())).thenReturn("score: 0.92");
        
        List<VCFirm> results = vcSearchService.search("fintech");
        assertThat(results).isNotEmpty();
    }
}
```

### What to Test

| Area | What | Example |
|------|------|---------|
| **REST API** | Full request/response flow | POST /api/users/register returns 201 with location header |
| **Database** | Persistence, transactions | Creating user saves to DB and can be retrieved |
| **Relationships** | Entity associations | VCFirm.members() returns correct team members |
| **Queries** | Custom repository methods | `findByInvestmentStatus("ACTIVE")` returns only active |
| **Kafka** | Event publishing/consumption | Publishing event is consumed by listener |
| **Redis** | Cache operations | Cached data is retrieved without hitting DB |
| **Security** | Auth & authorization | Endpoints require correct role |

### Common Integration Test Scenarios

**Testing a REST POST endpoint:**
```java
@Test
void should_create_user_and_return_201() throws Exception {
    String requestBody = """
        {
            "email": "new@example.com",
            "password": "SecurePass123!",
            "userType": "VC"
        }
    """;

    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody))
        .andExpect(status().isCreated())
        .andExpect(header().exists("Location"))
        .andExpect(jsonPath("$.data.email").value("new@example.com"));
}
```

**Testing with authentication:**
```java
@Test
@WithMockUser(username = "founder@example.com", roles = "FOUNDER")
void should_update_startup_when_authenticated() throws Exception {
    Startup startup = TestDataBuilder.startup().build();
    startupRepository.save(startup);

    mockMvc.perform(put("/api/startups/{id}", startup.getId())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(updateRequest)))
        .andExpect(status().isOk());
}
```

**Testing database persistence:**
```java
@Test
void should_persist_vc_firm_to_database() throws Exception {
    // Act: POST to create VCFirm
    mockMvc.perform(post("/api/vc-firms")
            .contentType(MediaType.APPLICATION_JSON)
            .content(vcFirmJson))
        .andExpect(status().isCreated());

    // Assert: Verify in database
    VCFirm saved = vcFirmRepository.findByName("Sequoia Capital");
    assertThat(saved)
        .isNotNull()
        .hasFieldOrPropertyWithValue("aum", 5_000_000_000L);
}
```

**Testing Kafka events:**
```java
@Test
void should_publish_event_when_funding_cycle_created() {
    // Arrange
    Startup startup = TestDataBuilder.startup().build();
    startupRepository.save(startup);

    FundingCycleRequest request = new FundingCycleRequest(
        startup.getId(),
        "SEED",
        new BigDecimal("1000000")
    );

    // Act
    mockMvc.perform(post("/api/funding-cycles")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated());

    // Assert: Kafka message was published
    // Use Testcontainers KafkaContainer + consumer to verify
}
```

---

## Test Data Management

### Test Data Builder Pattern

All test data builders are in `src/test/java/com/VentureCapitals/Dashboard/testdata/`.

**Central factory:**
```java
public class TestDataBuilder {
    public static UserTestDataBuilder user() { }
    public static VCFirmTestDataBuilder vcFirm() { }
    public static StartupTestDataBuilder startup() { }
    public static InvestmentTestDataBuilder investment() { }
    public static FundingCycleTestDataBuilder fundingCycle() { }
    public static EventTestDataBuilder event() { }
    public static Faker faker() { }  // JavaFaker for random data
}
```

### Available Builders

**User:**
```java
User user = TestDataBuilder.user()
        .withEmail("founder@example.com")
        .withUserType(UserType.STARTUP)
        .withActive(true)
        .build();

User vcUser = TestDataBuilder.user()
        .withUserType(UserType.VC)
        .withOAuthProvider("linkedin")
        .build();
```

**VC Firm:**
```java
VCFirm firm = TestDataBuilder.vcFirm()
        .withName("Sequoia Capital")
        .withAUM(5_000_000_000L)
        .withLocation("Menlo Park")
        .build();
```

**Startup:**
```java
Startup startup = TestDataBuilder.startup()
        .withName("TechCorp")
        .withSector("FINTECH")
        .withStage("SEED")
        .withLocation("Bangalore")
        .build();
```

**Investment:**
```java
Investment inv = TestDataBuilder.investment()
        .withVCFirmId(firm.getId())
        .withStartupId(startup.getId())
        .withAmount(new BigDecimal("500000"))
        .withRound("SEED")
        .build();
```

**Funding Cycle:**
```java
FundingCycle cycle = TestDataBuilder.fundingCycle()
        .withStartupId(startup.getId())
        .withRoundType("SERIES_A")
        .withTargetAmount(new BigDecimal("5000000"))
        .build();
```

**Event:**
```java
Event event = TestDataBuilder.event()
        .withTitle("Startup Demo Day")
        .withEventType("DEMO_DAY")
        .withPublic(true)
        .build();
```

### Using JavaFaker for Random Data

```java
// Access Faker via builder
String randomEmail = TestDataBuilder.faker().internet().emailAddress();
String randomPhone = TestDataBuilder.faker().phoneNumber().phoneNumber();
String randomCity = TestDataBuilder.faker().address().city();
String randomCompanyName = TestDataBuilder.faker().company().name();
```

---

## Test Coverage Goals

| Layer | Target | Why |
|-------|--------|-----|
| **Service** | 80%+ | Core business logic |
| **Repository** (custom) | 75%+ | Data queries |
| **Controller** | 70%+ | API contract |
| **Mapper/DTO** | 60%+ | Transformation logic |
| **Utility** | 90%+ | Used everywhere |

### Check Coverage

```bash
# Run tests with coverage
mvn clean test jacoco:report

# View HTML report
open target/site/jacoco/index.html
```

---

## TestContainers Setup (Advanced)

For tests requiring real PostgreSQL, Redis, Kafka:

**1. Import configuration:**
```java
@SpringBootTest
@Import(TestContainersConfiguration.class)
class KafkaMessagingIT extends BaseIntegrationTest {
    // Full infrastructure provisioned
}
```

**2. Create `application-testcontainers.properties`:**
```properties
spring.jpa.hibernate.ddl-auto=create-drop
spring.kafka.bootstrap-servers=localhost:29092
```

**3. Configuration class manages containers:**
```java
@TestConfiguration
public class TestContainersConfiguration {
    @Bean
    public PostgreSQLContainer<?> postgreSQLContainer() {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>(
            DockerImageName.parse("postgres:15-alpine")
        ).withDatabaseName("dashboard_test");
        container.start();
        // System properties set for Spring to connect
        return container;
    }
}
```

---

## Common Patterns

### Testing Exception Handling

```java
@Test
void should_throw_not_found_when_user_doesnt_exist() {
    assertThatThrownBy(() -> userService.getUser(UUID.randomUUID()))
        .isInstanceOf(EntityNotFoundException.class);
}
```

### Testing with Multiple Assertions

```java
@Test
void should_create_complete_user_profile() {
    User user = userService.registerWithEmailPassword("test@example.com", "pass");
    
    assertThat(user)
        .isNotNull()
        .hasFieldOrPropertyWithValue("email", "test@example.com")
        .hasFieldOrPropertyWithValue("isActive", true);
    
    assertThat(user.getId()).isNotNull();
}
```

### Testing with `@Transactional`

```java
@Test
@Transactional  // Rollback after test
void should_cascade_delete_when_firm_deleted() {
    VCFirm firm = TestDataBuilder.vcFirm().build();
    vcFirmRepository.save(firm);
    
    vcFirmRepository.delete(firm);
    
    assertThat(vcMemberRepository.findByFirm(firm)).isEmpty();
}
```

### Testing Parallel Test Execution

```java
@Execution(ExecutionMode.CONCURRENT)
class ConcurrentUserTests extends BaseUnitTest {
    // Tests run in parallel for faster execution
    // Ensure tests are independent!
}
```

---

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java-version: [21]

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: ${{ matrix.java-version }}
          distribution: temurin
      
      - name: Run unit tests
        run: mvn clean test
      
      - name: Run integration tests
        run: mvn verify -DskipUnitTests
      
      - name: Generate coverage report
        run: mvn jacoco:report
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./target/site/jacoco/jacoco.xml
      
      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: target/surefire-reports/
```

---

## Troubleshooting

### Problem: Tests Pass Locally, Fail in CI

**Causes:**
- Different timezone/locale
- Port conflicts
- Environment variables not set
- Database schema differences

**Solutions:**
```bash
# Use UTC timezone
export TZ=UTC
mvn clean test

# Set required env vars
export ANTHROPIC_API_KEY=test-key
export GOOGLE_CLIENT_ID=test-id
```

### Problem: Flaky Tests

**Causes:**
- Relying on timestamps
- Using random data without seeds
- Race conditions
- Timing-dependent assertions

**Solutions:**
```java
// ✅ Good: Use fixed data
LocalDateTime.of(2024, 1, 1, 10, 0)

// ❌ Bad: Uses current time
LocalDateTime.now()

// ✅ Good: Seed random data
TestDataBuilder.faker().seed(12345)

// ✅ Good: Wait for condition
await().atMost(5, SECONDS)
    .untilAsserted(() -> assertThat(message).isNotNull());
```

### Problem: Slow Tests

**Solutions:**
1. Use unit tests for most logic (80/20 rule)
2. Batch integration tests by database
3. Reuse TestContainers across test class
4. Avoid unnecessary I/O in tests

```java
// ✅ Good: Reuse container
@TestcontainersTest
class MultipleTests {
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>();
}

// ❌ Bad: New container per test
@BeforeEach
void setup() {
    new PostgreSQLContainer<>().start();
}
```

---

## Next Steps

1. **Start writing tests**
   - Existing features: Write tests for current implementation
   - New features: Write test first (TDD), then implement

2. **Follow patterns**
   - Use builders for test data
   - Use base classes for consistency
   - Follow naming convention (should_*_when_*)

3. **Monitor coverage**
   - Aim for 80%+ on services
   - Run `mvn jacoco:report` regularly

4. **Review tests in PRs**
   - Ensure tests follow patterns
   - Verify coverage goals are met
   - Check for test quality (not just quantity)

---

## Additional Resources

- [JUnit 5 Documentation](https://junit.org/junit5/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [TestContainers](https://testcontainers.com/)
- [AssertJ Fluent Assertions](https://assertj.github.io/assertj-core-features-highlight.html)
- [Spring Boot Testing](https://spring.io/guides/gs/testing-web/)
