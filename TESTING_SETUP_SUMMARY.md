# Testing System Setup — Summary

Complete testing infrastructure has been established for the Dashboard project. This document provides an overview of what's been set up and how to use it.

## What's Been Created

### 1. Dependencies Added to `pom.xml`
- ✅ TestContainers (PostgreSQL, Kafka, Redis management)
- ✅ AssertJ (fluent assertions)
- ✅ JavaFaker (realistic test data generation)
- ✅ Spring Boot Test (already included, verified)
- ✅ Mockito (already included with spring-boot-starter-test)

### 2. Test Configuration Files

**Location:** `src/test/resources/application-test.properties`
- H2 in-memory database for unit/basic integration tests
- Redis and Kafka configuration for advanced integration tests
- Spring Security test configuration

### 3. Test Base Classes

**Unit Testing:**
- `BaseUnitTest` → `src/test/java/com/VentureCapitals/Dashboard/config/BaseUnitTest.java`
  - Parent class for all unit tests
  - Mockito extension auto-loaded
  - No Spring context (fast execution)
  - Provides readable test names (snake_case → sentence case)

**Integration Testing:**
- `BaseIntegrationTest` → `src/test/java/com/VentureCapitals/Dashboard/config/BaseIntegrationTest.java`
  - Parent class for all integration tests
  - Full Spring context loaded
  - MockMvc auto-configured
  - Test profile applied
  - Random port for server

**TestContainers Configuration:**
- `TestContainersConfiguration` → `src/test/java/com/VentureCapitals/Dashboard/config/TestContainersConfiguration.java`
  - Optional configuration for tests needing real PostgreSQL, Redis, Kafka
  - Use `@Import(TestContainersConfiguration.class)` when needed

### 4. Test Data Builders

**Location:** `src/test/java/com/VentureCapitals/Dashboard/testdata/`

Central factory pattern for creating test data:

```java
// Main factory
TestDataBuilder.user()
TestDataBuilder.vcFirm()
TestDataBuilder.startup()
TestDataBuilder.investment()
TestDataBuilder.fundingCycle()
TestDataBuilder.event()
TestDataBuilder.faker()  // JavaFaker for random data
```

Files:
- `TestDataBuilder.java` → Central factory
- `UserTestDataBuilder.java` → Build User test data
- `VCFirmTestDataBuilder.java` → Build VCFirm test data
- `StartupTestDataBuilder.java` → Build Startup test data
- `InvestmentTestDataBuilder.java` → Build Investment test data
- `FundingCycleTestDataBuilder.java` → Build FundingCycle test data
- `EventTestDataBuilder.java` → Build Event test data

### 5. Example Tests

**Repository Integration Test:**
- `UserRepositoryIntegrationTest` → `src/test/java/com/VentureCapitals/Dashboard/domain/user/UserRepositoryIntegrationTest.java`
  - Shows how to test repository queries
  - Tests database persistence
  - Uses test data builders

**Controller Integration Test:**
- `AuthControllerIntegrationTest` → `src/test/java/com/VentureCapitals/Dashboard/api/auth/AuthControllerIntegrationTest.java`
  - Shows how to test REST API endpoints
  - Tests request/response flow
  - Shows authentication testing

**Existing Unit Test:**
- `UserServiceTest` → Already present at `src/test/java/com/VentureCapitals/Dashboard/domain/user/UserServiceTest.java`
  - Example of mocking and service testing

### 6. Documentation

**TEST_FRAMEWORK.md** (Comprehensive guide)
- Architecture overview
- Unit testing patterns and best practices
- Integration testing patterns and examples
- Test data builder usage
- Coverage goals
- Troubleshooting guide
- CI/CD integration examples
- Common test scenarios

**TESTING_CHECKLIST.md** (Implementation checklist)
- Pre-implementation checklist
- Unit test requirements
- Repository test requirements
- Controller test requirements
- Integration test scenarios
- Code review checklist
- Feature coverage checklist
- Test data guidelines
- Troubleshooting guide

---

## How to Use the Testing System

### For Unit Tests (Testing Business Logic)

```java
// 1. Create test class extending BaseUnitTest
class YourServiceTest extends BaseUnitTest {

    // 2. Mock dependencies
    @Mock
    private YourRepository repository;

    // 3. Inject service being tested
    @InjectMocks
    private YourService service;

    // 4. Write tests following should_*_when_* pattern
    @Test
    void should_do_something_when_condition() {
        // Arrange: Setup using test data builders
        YourEntity entity = TestDataBuilder.yourEntity()
                .withField("value")
                .build();
        
        when(repository.save(any())).thenReturn(entity);

        // Act: Execute method
        YourEntity result = service.doSomething(entity);

        // Assert: Verify using fluent assertions
        assertThat(result)
                .isNotNull()
                .hasFieldOrPropertyWithValue("field", "value");
    }
}
```

### For Repository Tests (Testing Queries)

```java
// 1. Extend BaseIntegrationTest for database access
class YourRepositoryTest extends BaseIntegrationTest {

    // 2. Autowire the repository
    @Autowired
    private YourRepository repository;

    // 3. Write tests for custom queries
    @Test
    void should_find_entities_by_criteria() {
        // Arrange: Create and save test data
        YourEntity entity = TestDataBuilder.yourEntity()
                .withStatus("ACTIVE")
                .build();
        repository.save(entity);

        // Act: Call repository method
        List<YourEntity> results = repository.findByStatus("ACTIVE");

        // Assert: Verify results
        assertThat(results)
                .isNotEmpty()
                .allMatch(e -> e.getStatus().equals("ACTIVE"));
    }
}
```

### For Controller Tests (Testing REST API)

```java
// 1. Extend BaseIntegrationTest
class YourControllerTest extends BaseIntegrationTest {

    // 2. Autowire MockMvc
    @Autowired
    private MockMvc mockMvc;

    // 3. Autowire dependencies as needed
    @Autowired
    private YourRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    // 4. Write tests for endpoints
    @Test
    @WithMockUser(username = "test@example.com", roles = "OWNER")
    void should_return_200_for_valid_request() throws Exception {
        // Arrange
        YourEntity entity = TestDataBuilder.yourEntity().build();
        repository.save(entity);

        // Act & Assert: Make request and verify response
        mockMvc.perform(get("/api/your-endpoint/{id}", entity.getId())
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.field").value("value"));
    }
}
```

### Running Tests

```bash
# Run all tests
mvn clean test

# Run only unit tests
mvn test -DskipITs

# Run single test class
mvn test -Dtest=UserServiceTest

# Run single test method
mvn test -Dtest=UserServiceTest#should_create_user

# Run with coverage report
mvn clean test jacoco:report
# View report: target/site/jacoco/index.html

# Run in CI/CD pipeline
mvn clean verify
```

---

## Test Organization

### Directory Structure
```
src/test/
├── java/com/VentureCapitals/Dashboard/
│   ├── config/                    # Test base classes, configuration
│   │   ├── BaseUnitTest.java
│   │   ├── BaseIntegrationTest.java
│   │   └── TestContainersConfiguration.java
│   ├── testdata/                  # Test data builders
│   │   ├── TestDataBuilder.java
│   │   ├── UserTestDataBuilder.java
│   │   ├── VCFirmTestDataBuilder.java
│   │   └── ... (other builders)
│   ├── domain/
│   │   └── user/
│   │       ├── UserServiceTest.java           (unit test)
│   │       └── UserRepositoryIntegrationTest.java  (integration test)
│   └── api/
│       └── auth/
│           └── AuthControllerIntegrationTest.java  (integration test)
└── resources/
    └── application-test.properties     # Test configuration
```

### Naming Conventions

- **Unit test class:** `{Entity}ServiceTest`
- **Repository test class:** `{Entity}RepositoryIntegrationTest` or `{Entity}RepositoryTest`
- **Controller test class:** `{Entity}ControllerIntegrationTest`
- **Test methods:** `should_{expected_behavior}_when_{condition}`

---

## Coverage Goals

| Layer | Target | Priority |
|-------|--------|----------|
| Service | 80%+ | HIGH |
| Repository (custom queries) | 75%+ | HIGH |
| Controller | 70%+ | MEDIUM |
| Mapper/DTO | 60%+ | MEDIUM |
| Utility | 90%+ | MEDIUM |

Check coverage:
```bash
mvn clean test jacoco:report
open target/site/jacoco/index.html
```

---

## Key Principles

1. **80/20 Rule** — 80% unit tests, 20% integration tests
2. **Fast Tests** — Unit tests should run in <100ms each
3. **Test Behavior** — Not implementation details
4. **Use Builders** — Never hardcode test data
5. **One Assertion** — Each test validates one concept
6. **Clear Names** — Test name should explain what's being tested
7. **Independent Tests** — Tests don't depend on each other or execution order
8. **Mock External Deps** — Only mock things outside your test boundary

---

## Next Steps

### For Existing Code
1. Review `TEST_FRAMEWORK.md` for patterns
2. Add tests for critical business logic
3. Focus on service layer (80% coverage)
4. Use `TestDataBuilder` for all test data

### For New Features
1. **Write test first** (TDD approach)
2. **Implement feature** to make test pass
3. **Add more tests** for edge cases
4. **Verify coverage** (80%+ for services)
5. **Code review** validates test quality

### For All Code
1. Follow naming conventions
2. Use appropriate base class (Unit vs. Integration)
3. Use test data builders
4. Use fluent assertions
5. Ensure tests are independent

---

## Dependencies Added to pom.xml

```xml
<!-- TestContainers for Integration Tests -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>kafka</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>

<!-- Better Assertions -->
<dependency>
    <groupId>org.assertj</groupId>
    <artifactId>assertj-core</artifactId>
    <scope>test</scope>
</dependency>

<!-- Data Faker for Test Data -->
<dependency>
    <groupId>com.github.javafaker</groupId>
    <artifactId>javafaker</artifactId>
    <version>1.0.2</version>
    <scope>test</scope>
</dependency>
```

---

## Quick Reference

### Test Execution
```bash
mvn clean test                                      # Run all tests
mvn test -Dtest=UserServiceTest                   # Run specific test
mvn test -Dtest=UserServiceTest#should_create     # Run specific method
mvn clean test jacoco:report                      # Generate coverage
```

### Test Creation Template
```java
@ExtendWith(MockitoExtension.class)  // or extend BaseUnitTest
class YourFeatureTest {
    @Mock private YourDependency dependency;
    @InjectMocks private YourService service;
    
    @Test
    void should_do_something_when_condition() {
        // Arrange
        YourEntity entity = TestDataBuilder.yourEntity().build();
        
        // Act
        YourEntity result = service.doSomething(entity);
        
        // Assert
        assertThat(result).isNotNull();
    }
}
```

### Test Data
```java
// Use builders for all test data
User user = TestDataBuilder.user()
    .withEmail("test@example.com")
    .withUserType(UserType.VC)
    .build();

// Use Faker for realistic data
String email = TestDataBuilder.faker().internet().emailAddress();
String phone = TestDataBuilder.faker().phoneNumber().phoneNumber();
```

---

## Support & Reference

- **TEST_FRAMEWORK.md** — Comprehensive testing guide with patterns and best practices
- **TESTING_CHECKLIST.md** — Before-submission checklist and code review guidelines
- **Example Tests:**
  - `UserServiceTest` — Unit test example
  - `UserRepositoryIntegrationTest` — Repository integration test example
  - `AuthControllerIntegrationTest` — Controller integration test example

---

## Summary

✅ **Unit Testing Framework** — Ready for fast, isolated service/controller tests  
✅ **Integration Testing Framework** — Ready for full-stack API and database tests  
✅ **Test Data Builders** — Consistent test data creation across all tests  
✅ **Documentation** — Comprehensive guides and examples  
✅ **Base Classes** — Standardized test setup  
✅ **CI/CD Ready** — Tests can run in automated pipelines  

**Start writing tests now! Follow the patterns in TEST_FRAMEWORK.md and use TESTING_CHECKLIST.md for guidance.**
