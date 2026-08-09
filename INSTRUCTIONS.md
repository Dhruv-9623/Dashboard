# Dashboard Project — Coding Standards & Instructions

**Last Updated:** 2026-07-25  
**Project:** VC × Startup Platform (Spring Boot)  
**Solo Developer:** Dhruv Patel

---

## Overview

This document defines the coding standards, best practices, and operational guidelines for the Dashboard project. Every piece of code written should adhere to these principles. Claude Code will reference this file to ensure consistency and quality.

---

## Table of Contents

1. [Naming & Code Style](#naming--code-style)
2. [Comments & Documentation](#comments--documentation)
3. [Error Handling & Validation](#error-handling--validation)
4. [Testing Requirements](#testing-requirements)
5. [Performance & Optimization](#performance--optimization)
6. [Security Practices](#security-practices)
7. [Git & Collaboration](#git--collaboration)
8. [Project-Specific Rules](#project-specific-rules)
9. [Architecture & Design](#architecture--design)
10. [Logging Strategy](#logging-strategy)

---

## 1. Naming & Code Style

### Naming Conventions

- **Classes & Types:** `PascalCase` (e.g., `VCFirmService`, `InvestmentRepository`)
- **Methods & Variables:** `camelCase` (e.g., `getUserById()`, `investmentAmount`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_INVESTMENT_AMOUNT`, `DEFAULT_PAGE_SIZE`)
- **Enums:** `PascalCase` for type, `UPPER_SNAKE_CASE` for values (e.g., `enum UserType { VC, STARTUP }`)
- **Package names:** `lowercase.no.spaces` (e.g., `com.VentureCapitals.Dashboard.domain.vc`)

**Key Principle:** Every file name must clearly describe its purpose — **no ambiguity**. Err on the side of verbose/explicit naming over brevity.

Examples:
- ✅ `VCFirmPortfolioManagementService` (clear purpose)
- ❌ `VCService` (too vague)
- ✅ `FindInvestmentsByStatusAndDateRangeRepository` (clear intent)
- ❌ `InvestmentQuery` (unclear)

### Formatting

- **Indentation:** Use spaces consistently (4 spaces is standard for Java). Tabs are fine for readability where needed, but be consistent within a file.
- **Line Length:** Aim for 120 characters max, but prioritize readability over strict limits.
- **Imports:** Group in the following order:
  1. Java standard library imports
  2. Third-party imports (alphabetical)
  3. Project imports (alphabetical)
  4. Static imports
- **Class Organization:**
  ```
  package declaration
  imports
  
  javadoc
  class declaration {
    static fields
    static initializers
    instance fields
    constructors
    public methods
    protected methods
    private methods
    inner classes
  }
  ```

---

## 2. Comments & Documentation

### Comment Level

**Moderate commenting.** Don't over-comment obvious code; comment the *why*, not the *what*.

- ✅ `// Group investments by fiscal year for reporting; Q1 data needs special handling due to delayed settlement times`
- ❌ `// Loop through investments` (obvious from code)

### Javadoc Requirements

**Javadoc is mandatory for:**
- All public methods (classes, interfaces, methods)
- All public/protected fields
- Complex business logic (even if private)
- Any method with non-obvious behavior or constraints

**Format:**
```java
/**
 * Calculates the total equity stake across all investments for a VC firm.
 *
 * @param vcFirmId the UUID of the VC firm
 * @return total equity percentage (0.0 to 100.0)
 * @throws EntityNotFoundException if the VC firm does not exist
 */
public Double calculateTotalEquityStake(UUID vcFirmId) {
    // implementation
}
```

### README Requirements

**Every new feature must include a README.md** in its domain folder explaining:
- What the feature does
- Key entities and relationships
- API endpoints (if applicable)
- Important business rules
- Example usage or workflow

Example structure:
```
src/main/java/com/VentureCapitals/Dashboard/domain/investment/README.md
```

---

## 3. Error Handling & Validation

### Validation Strategy

**Validate at boundaries; trust internals.**

1. **Controller/Service Entry Points** (boundaries):
   - Use Bean Validation annotations: `@Valid`, `@NotNull`, `@NotBlank`, `@Min`, `@Max`, `@Email`, etc.
   - Validate request DTOs in controller signatures
   - Check authorization (not just authentication) at service layer
   - Example:
     ```java
     @PostMapping("/investments")
     public ApiResponse<InvestmentDTO> createInvestment(
         @Valid @RequestBody CreateInvestmentRequest request,
         @CurrentUser User user
     ) {
         return ApiResponse.ok(investmentService.create(request, user));
     }
     ```

2. **Internal Methods** (private/protected):
   - Assume data is already validated
   - No redundant null checks or defensive copies
   - Trust the contract established at the boundary

### Exception Handling

**Use custom exceptions extending `AppException` base class:**

```java
public abstract class AppException extends RuntimeException {
    private final ErrorCode errorCode;
    
    public AppException(ErrorCode code, String message) {
        super(message);
        this.errorCode = code;
    }
    
    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
```

**Specific exceptions:**
```java
public class EntityNotFoundException extends AppException { }
public class UnauthorizedException extends AppException { }
public class ValidationException extends AppException { }
public class BusinessRuleViolationException extends AppException { }
```

**Philosophy:**
- Only catch exceptions when you can handle them meaningfully
- Don't swallow exceptions (especially `Exception` or `RuntimeException`)
- Let unexpected exceptions propagate to `@ControllerAdvice` (global exception handler)
- Wrap external exceptions only when adding meaningful context
  ```java
  try {
      return externalPaymentService.charge(amount);
  } catch (PaymentServiceException e) {
      throw new BusinessRuleViolationException(
          ErrorCode.PAYMENT_FAILED,
          "Failed to charge investor account: " + e.getMessage(),
          e  // preserve original cause
      );
  }
  ```

### Global Exception Handler

**Use `@ControllerAdvice` to centralize error responses:**

```java
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(ValidationException e) {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(e.getErrorCode(), e.getMessage()));
    }
    
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(e.getErrorCode(), e.getMessage()));
    }
    
    // Catch-all for unexpected exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception e) {
        logger.error("Unexpected error", e);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred"));
    }
}
```

---

## 4. Testing Requirements

### Coverage

**100% test coverage is required** for all production code.

### Testing Strategy

**Three-tier approach:**

1. **Local Branch Testing**
   - Write unit tests + integration tests before committing
   - Run locally: `mvn clean test`
   - All tests must pass before pushing

2. **Dev Branch Testing**
   - Merge to `dev` branch only after local tests pass
   - CI pipeline runs full test suite on `dev`
   - Manual QA testing in dev environment allowed
   - Entire project must be testable in dev (end-to-end)

3. **Production**
   - Only after `dev` validation
   - Monitored rollout

### Unit vs Integration Balance

- **Unit Tests:** Fast, isolated, mock external dependencies (60% of tests)
- **Integration Tests:** Hit real database/services, slower but catch real issues (30% of tests)
- **E2E Tests:** Full flow testing, minimal and focused (10% of tests)

### Mocking Philosophy

**Mock external dependencies only; use real instances for cheap collaborators.**

**DO mock:**
- Repositories (use in-memory H2 for tests instead)
- External APIs (HTTP clients, payment gateways, etc.)
- Other microservices or remote services
- Time/clock for deterministic testing

**DON'T mock:**
- Value objects (DTOs, POJOs, simple data classes)
- Utility classes and mappers
- Entities (use real instances or test builders)
- Your own services (unless testing interaction is the goal)

**Example:**
```java
@Test
void testCalculateTotalEquity() {
    // Real: Create real Startup and Investment objects
    Startup startup = Startup.builder()
        .name("TechStartup")
        .build();
    
    // Mock: External dependency
    when(investmentRepository.findByStartupId(startup.getId()))
        .thenReturn(List.of(/* real Investment objects */));
    
    // Assert on outcome, not interaction
    Double result = service.calculateTotalEquity(startup.getId());
    assertThat(result).isEqualTo(45.5);
}
```

### Assertion Strategy

**Prefer asserting on outcomes over verifying interactions.**

- ✅ `assertThat(result).isEqualTo(expectedValue)` (outcome-based)
- ❌ `verify(repository).save(any())` (interaction-based, only use when the side effect IS the test)

Use `verify()` only when testing that a method was actually called (e.g., "ensure email was sent"):
```java
@Test
void testSendInvestorNotification() {
    service.notifyInvestor(investmentId);
    verify(emailService).send(any(EmailRequest.class));  // Side effect is the goal
}
```

### Performance Testing

**Not required for standard feature work.** Performance is validated through:
- Code review (checking for N+1 queries, inefficient loops)
- Local profiling if suspected bottlenecks
- Load testing in a separate CI pipeline (if needed)

---

## 5. Performance & Optimization

### Key Rules

**Code optimization is a primary requirement.** Always ask: "Can this be faster or more efficient?"

### Common Patterns to Avoid

1. **N+1 Query Problem:**
   ```java
   // ❌ Bad: N+1 query
   List<Investment> investments = investmentRepository.findAll();
   for (Investment inv : investments) {
       VCFirm firm = vcFirmRepository.findById(inv.getVcFirmId()); // Query in loop
   }
   
   // ✅ Good: Use JOIN FETCH or explicit JOIN
   List<Investment> investments = investmentRepository.findAllWithVcFirm(); // @Query with JOIN FETCH
   ```

2. **Pagination for Large Result Sets:**
   ```java
   // ❌ Bad: Loading entire table
   List<Startup> all = startupRepository.findAll();
   
   // ✅ Good: Paginated
   Page<Startup> page = startupRepository.findAll(PageRequest.of(0, 20));
   ```

3. **Efficient Filtering:**
   ```java
   // ❌ Bad: Filter in memory
   List<Investment> all = investmentRepository.findAll();
   List<Investment> filtered = all.stream()
       .filter(i -> i.getStatus() == ACTIVE)
       .collect(toList());
   
   // ✅ Good: Filter in database
   List<Investment> filtered = investmentRepository.findByStatus(ACTIVE);
   ```

4. **Caching (where appropriate):**
   - Cache read-heavy, infrequently-changing data (e.g., VC firm profiles)
   - Never cache sensitive data without explicit eviction rules
   - Use Redis TTLs intelligently

### Benchmarking

- If you suspect a bottleneck, profile locally before optimizing
- Use `@Benchmark` in JMH for critical paths
- Document any non-obvious performance trade-offs in code comments

---

## 6. Security Practices

### Input Validation & Sanitization

1. **All external inputs must be validated:**
   - User-submitted notes, names, descriptions
   - Financial figures (amounts, percentages)
   - File uploads (size, type, content scan)
   - API parameters

2. **Use parameterized queries exclusively:**
   ```java
   // ✅ Good: Parameterized (Spring Data handles this)
   List<Investment> investments = investmentRepository.findByVcFirmIdAndStatus(firmId, status);
   
   // ❌ Bad: String concatenation (SQL injection risk)
   String query = "SELECT * FROM investments WHERE vc_firm_id = " + firmId;
   ```

3. **Sanitize before display/log:**
   ```java
   String sanitized = sanitizer.clean(userInput); // HTML escaping, etc.
   ```

### Authentication & Authorization

1. **Check both authentication AND authorization:**
   ```java
   @PostMapping("/investments")
   @PreAuthorize("hasRole('PORTFOLIO_MANAGER')")
   public ApiResponse<InvestmentDTO> create(
       @Valid @RequestBody CreateInvestmentRequest request,
       @CurrentUser User user
   ) {
       // ✅ Authentication is checked by @PreAuthorize
       // ✅ Also verify user belongs to the firm they're creating investment for
       VCFirm firm = vcFirmRepository.findById(request.getVcFirmId())
           .orElseThrow(() -> new EntityNotFoundException(...));
       
       if (!firm.isMember(user)) {
           throw new UnauthorizedException("You do not belong to this firm");
       }
       
       return ApiResponse.ok(investmentService.create(request, firm));
   }
   ```

2. **Sensitive endpoints require explicit role checks:**
   - Deal terms, valuations, financial data
   - LP information
   - Fund performance metrics

### Sensitive Data Handling

**Never log sensitive information:**
- Investor/LP names or details
- Financial figures (valuations, check amounts)
- Tokens or API keys
- Personal identity numbers
- Passwords or authentication credentials

**Examples of what NOT to log:**
```java
// ❌ Bad: Logs sensitive data
logger.info("Processing investment: " + investment); // toString() may expose data
logger.info("LP approved: " + lpName + ", amount: " + amount);

// ✅ Good: Log safe identifiers only
logger.info("Investment processed: id={}, status={}", investment.getId(), investment.getStatus());
logger.info("Commitment received for cycle: id={}", fundingCycle.getId());
```

### Sensitive Data Caching

**Never cache LP-specific, user-specific, or financial data** unless:
1. Cache has a short TTL (minutes, not hours)
2. Proper cache eviction rules are in place
3. Cache is not shared across tenants/firms

Example of safe caching:
```java
@Cacheable(value = "vcFirmProfiles", key = "#vcFirmId", cacheManager = "cacheManager")
public VCFirmDTO getVCFirmProfile(UUID vcFirmId) {
    // Safe to cache: public profile info
    return vcFirmRepository.findById(vcFirmId)
        .map(this::toDTO)
        .orElseThrow();
}

// Cache definition with TTL
@Bean
public CacheManager cacheManager() {
    return new RedisCacheManager(
        RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
    );
}
```

---

## 7. Git & Collaboration

### Commit Messages

**Format: Description + Why + What**

```
Brief one-line summary (50 chars max)

Longer description explaining the change. 
Why is this change needed? What problem does it solve?

Example:
- Added connection request validation
- Ensures mutual consent before messaging unlocks
- Prevents spam and improves user experience

JIRA ticket: DASH-123
```

**Good Examples:**
```
Add mutual consent validation for messaging

Prevents users from messaging before both sides accept connection request.
Implements the core business rule: messaging only unlocks after explicit 
acceptance from both VC and Startup.

Adds:
- ConnectionRequestValidator service
- Pre-message auth checks
- Unit tests (100% coverage)

JIRA: DASH-42
```

```
Optimize investment query with JOIN FETCH to prevent N+1

Previous implementation loaded VC firm data in loop, causing one query per 
investment. Now uses explicit JOIN FETCH in repository method.

Performance: ~40% faster for portfolios with 100+ investments
Memory: Reduced from 150MB to 45MB in test run

JIRA: DASH-99
```

### Branch Naming

**Format: `JIRA-TICKET-ID/exact-use-case-description`**

Examples:
- `DASH-42/add-mutual-consent-messaging-validation`
- `DASH-99/optimize-investment-queries-n-plus-one`
- `DASH-15/implement-vc-portfolio-dashboard`

**Rules:**
- Use lowercase with hyphens
- Include JIRA ticket ID at the start
- Describe the exact use case/feature
- Match the JIRA ticket name exactly (for traceability)

### Pull Requests

**Requirements before merge:**
1. ✅ Code passes all local tests (`mvn clean test`)
2. ✅ Code passes CI pipeline (GitHub Actions / Jenkins)
3. ✅ PR approval required (from code review)
4. ✅ All 100% test coverage maintained
5. ✅ No security issues or code smells

**PR Description Template:**
```markdown
## Summary
- Brief description of changes
- Why this change is needed
- What problem it solves

## Changes
- List of files modified
- Brief explanation of each change

## Testing
- How to test locally
- Edge cases covered
- New tests added

## Related JIRA
DASH-XXX
```

### Merge Strategy

**Rebase vs Merge:** As per situation (no strict preference yet)
- Prefer **merge** for feature branches (preserves history)
- Use **rebase** for WIP cleanup or synchronizing with main
- Never force-push to shared branches

---

## 8. Project-Specific Rules

### Business Logic Constraints

**These rules are enforced at the service layer and must not be bypassed:**

1. **Mutual Consent for Messaging** (DASH-10)
   - No `Conversation` can be created without an accepted `ConnectionRequest`
   - Both parties must explicitly accept before messaging unlocks
   - Implementation: Service method checks `connectionRequest.getStatus() == ACCEPTED`

2. **Investment Creation Authority** (DASH-11)
   - Only `OWNER` or `PORTFOLIO_MANAGER` roles in a VC firm can create `Investment` records
   - Startups cannot create investment records
   - Implementation: `@PreAuthorize` + role check in `InvestmentService.create()`

3. **FundingCycle Creation Authority** (DASH-12)
   - Only `FOUNDER` or `CO_FOUNDER` can create/edit `FundingCycle`
   - VCs cannot create funding cycles for startups they don't own
   - Implementation: Service validates `StartupMember` role

4. **Pool Entry Consistency** (DASH-13)
   - A `PoolEntry` can reference either a registered `Startup` or an unregistered company name, not both
   - If `startup` is not null, `companyName` must be null
   - Implementation: Entity validator or service-level check

5. **VCFirm Ownership**
   - Users can belong to only one VC firm (for now)
   - A VC firm can have only one `OWNER` role
   - Implementation: Unique constraint + service validation

### Data Consistency

**To be defined later** as the project evolves. Current assumptions:
- ACID transactions for financial data (investments, commitments)
- Eventual consistency acceptable for cached signals/news
- Real-time consistency for user messaging

---

## 9. Architecture & Design

### Layered Architecture

```
Controller (API)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database
```

**Responsibilities:**
- **Controller:** Route requests, validate DTOs, delegate to service
- **Service:** Business logic, authorization checks, transaction boundaries
- **Repository:** Pure data access (Spring Data JPA)
- **DTO:** Data transfer between layers (never expose entities)

### Entities vs DTOs

**Never expose JPA entities in API responses. Always use DTOs.**

```java
// ❌ Bad: Exposes entity
@GetMapping("/{id}")
public Investment getInvestment(@PathVariable UUID id) {
    return investmentRepository.findById(id).orElseThrow();
}

// ✅ Good: Uses DTO
@GetMapping("/{id}")
public ApiResponse<InvestmentDTO> getInvestment(@PathVariable UUID id) {
    return ApiResponse.ok(investmentService.getById(id));
}

// InvestmentService
public InvestmentDTO getById(UUID id) {
    return investmentRepository.findById(id)
        .map(this::toDTO)
        .orElseThrow();
}

private InvestmentDTO toDTO(Investment entity) {
    return InvestmentDTO.builder()
        .id(entity.getId())
        .amount(entity.getAmount())
        .status(entity.getStatus())
        .build();
}
```

### Kafka & Async Processing

**Use for non-blocking operations** (AI suggestions, notifications, analytics):

```java
// Publish event
@Component
public class InvestmentEventPublisher {
    
    @Autowired
    private KafkaTemplate<String, InvestmentCreatedEvent> kafkaTemplate;
    
    public void publishInvestmentCreated(Investment investment) {
        InvestmentCreatedEvent event = new InvestmentCreatedEvent(
            investment.getId(),
            investment.getVcFirmId(),
            investment.getStartupId()
        );
        kafkaTemplate.send("dashboard.investment.created", event);
    }
}

// Consume event
@Component
public class AIRecommendationConsumer {
    
    @KafkaListener(topics = "dashboard.investment.created")
    public void onInvestmentCreated(InvestmentCreatedEvent event) {
        // Generate AI suggestions asynchronously
        aiSuggestionService.generateSuggestionsForInvestment(event.getInvestmentId());
    }
}
```

### Dependency Injection

Always use constructor injection (`@Autowired` on constructor, not field):

```java
// ✅ Good: Constructor injection (testable)
@Service
public class InvestmentService {
    private final InvestmentRepository investmentRepository;
    private final VCFirmRepository vcFirmRepository;
    
    public InvestmentService(
        InvestmentRepository investmentRepository,
        VCFirmRepository vcFirmRepository
    ) {
        this.investmentRepository = investmentRepository;
        this.vcFirmRepository = vcFirmRepository;
    }
}

// ❌ Bad: Field injection (hard to test)
@Service
public class InvestmentService {
    @Autowired
    private InvestmentRepository investmentRepository;
}
```

---

## 10. Logging Strategy

### SLF4J with Logback

**Use SLF4J exclusively** (not System.out, not println).

```java
private static final Logger logger = LoggerFactory.getLogger(ClassName.class);
```

### Log Levels

1. **ERROR** — Unhandled exceptions, critical failures needing immediate attention
   ```java
   logger.error("Failed to process investment commitment", e);
   ```

2. **WARN** — Recoverable issues, unexpected but handled cases
   ```java
   logger.warn("Investment duplicate detected, skipping duplicate id={}", investmentId);
   ```

3. **INFO** — Key business events (user actions, significant state changes)
   ```java
   logger.info("Investment created: firmId={}, amount={}, startupId={}", 
       firmId, amount, startupId);
   logger.info("Funding cycle opened: cycleId={}, targetAmount={}", 
       cycleId, targetAmount);
   ```

4. **DEBUG** — Detailed flow tracing for troubleshooting
   ```java
   logger.debug("Validating VC firm membership: userId={}, firmId={}", userId, firmId);
   logger.debug("Repository query executed: status={}, recordCount={}", status, count);
   ```
   **Rule:** No DEBUG logs in hot paths (loops, frequently-called methods in production)

### What NOT to Log

- **Sensitive Data:**
  - LP/Investor names or details
  - Financial figures or valuations
  - Personal information (emails, phone numbers—if logged, hash them)
  - API keys or tokens
  - Password hashes or authentication credentials

- **Excessive Detail:**
  - Don't log entire request/response bodies (log IDs instead)
  - Don't log full stack traces for expected exceptions
  - Don't log the same event in multiple places

### Logging Best Practices

```java
// ✅ Good: Use parameterized logging (no string concatenation)
logger.info("Investment processed: firmId={}, status={}, amount={}", 
    firmId, status, amount);

// ❌ Bad: String concatenation (performance + readability)
logger.info("Investment processed: " + firmId + " " + status + " " + amount);

// ✅ Good: Meaningful structured data
logger.info("Payment received", 
    new StructuredData()
        .add("event", "payment_received")
        .add("fundingCycleId", cycleId)
        .add("vcFirmId", vcFirmId)
        .add("amountInCents", amountInCents)
);

// ✅ Good: Context-aware logging
MDC.put("userId", userId);
MDC.put("requestId", requestId);
logger.info("Processing user request");
MDC.clear();
```

---

## Checklist: Before Pushing Code

- [ ] All tests pass locally (`mvn clean test`)
- [ ] Test coverage is 100%
- [ ] No N+1 queries or obvious performance issues
- [ ] All inputs validated at boundaries
- [ ] No sensitive data in logs
- [ ] Authorization checks on sensitive endpoints
- [ ] Javadoc on all public methods
- [ ] Commit message follows format (description + why)
- [ ] Branch name matches JIRA ticket
- [ ] No hardcoded secrets or credentials
- [ ] Code follows naming conventions (explicit, descriptive)
- [ ] Error handling uses custom exceptions
- [ ] DTOs used in API responses (no entities exposed)
- [ ] No commented-out code left behind
- [ ] README added for new feature domain

---

## Questions? Updates?

This document is the source of truth for coding practices. If you encounter a situation not covered here, update this file first, then proceed. Over time, this becomes a living codebook for the project.

---

**Version History:**
- v1.0 (2026-07-25) — Initial comprehensive instructions document created
