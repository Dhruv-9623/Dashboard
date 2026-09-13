---
name: frontend-review
description: Comprehensive review of the frontend codebase — architecture, component design, state management, frontend-backend contract mapping, performance, accessibility at code level, security, error handling and observability. Use when the user asks for a frontend code review, UI code health check, or a pre-merge audit of client-side work. Read and report only, never edits code.
metadata:
type: dynamic
---

# Frontend Review

## Purpose
This skill provides a comprehensive engineering review of the frontend codebase. It focuses on code quality, architecture, and the integrity of the contract between the client and the backend services. It evaluates component structure, state management, data fetching, rendering performance, bundle health, loading and error states, accessibility as implemented in markup, client-side security, and the logging and monitoring wired into the app.

It is the client-side counterpart to `backend-review` and deliberately stops at the code boundary. Anything concerning visual design, layout aesthetics, design system fidelity, colour psychology, or user experience quality belongs to `design-review` and should be referred there rather than duplicated here.

The output is actionable feedback and prioritised recommendations. The skill never writes, updates, refactors, or deletes anything.

## Trigger
When the user requests a review of the frontend codebase — code quality, component architecture, API integration, performance, bundle size, client-side security, or readiness of frontend work to be merged or shipped.

## Steps

### 1. Establish context
1. Check the current branch and list the frontend work in progress — components, pages, and features being built.
2. Review recent commits and pull requests touching frontend paths. Identify what has landed, what is in flight, and how close it sits to the product milestone currently being built toward.
3. Detect the stack before assuming it. Read `package.json`, `tsconfig.json`, and any framework config (`next.config`, `vite.config`, `nuxt.config`, `angular.json`, `tailwind.config`) to establish framework, language, styling method, build tool, and test runner.
4. Map the source layout: routes/pages, components, hooks or composables, state stores, API/service layer, shared utilities, and static assets.

### 2. Architecture and code quality
1. Component architecture — separation of container and presentational concerns, component size, prop drilling depth, reuse versus duplication, dead components.
2. State management — local versus global state boundaries, whether server state is being stored in client state unnecessarily, stale state risks, derived state recomputed instead of cached.
3. Data structures and algorithms — list rendering and keying, sorting/filtering on large datasets, unnecessary O(n²) work in render paths, memoisation used correctly rather than reflexively.
4. Design patterns — container/presenter, hooks/composables, HOCs, render props, provider layering. Flag patterns applied where a simpler construct would do, and places where a pattern is clearly missing.
5. Typing discipline — `any` escape hatches, untyped API responses, optional chaining used to mask unknown shapes.
6. Code hygiene — naming consistency, file/folder conventions, magic numbers and hardcoded strings, commented-out blocks, lint and formatter compliance.

### 3. Frontend–backend mapping
1. Enumerate every API call the frontend makes and map each to its backend endpoint. Flag calls to endpoints that do not exist, are deprecated, or are not covered by the backend review.
2. Compare request and response shapes against the backend contract — field names, types, nullability, enum values, pagination envelopes, date and currency formats.
3. Identify orphans in both directions: backend endpoints nothing consumes, and frontend expectations the backend does not yet serve.
4. Check error contract handling — are backend error codes and validation messages surfaced meaningfully, or collapsed into a generic failure?
5. Check auth flow integration — token storage location, refresh handling, behaviour on 401/403, and what the user sees when a session expires mid-action.
6. Review over-fetching and under-fetching, N+1 request patterns in lists, request waterfalls that could be parallelised, and missing caching or deduplication.

### 4. Performance and perceived responsiveness
1. Bundle health — total and per-route bundle size, code splitting at route boundaries, lazy loading of heavy components, unused or duplicated dependencies, oversized libraries pulled in for a single utility.
2. Rendering performance — unnecessary re-renders, expensive work in render, unvirtualised long lists, layout thrashing, uncontrolled effect loops.
3. Asset handling — image formats and sizing, font loading strategy, whether static assets are served with sensible caching.
4. Response time and latency handling — for every asynchronous operation, confirm there is a defined loading state, a timeout, an error state, an empty state, and a retry path. Loaders should be latency-appropriate: instant feedback for optimistic actions, skeletons for content loads, progress indication for anything expected to exceed a few seconds.
5. Core Web Vitals posture — identify code-level causes of poor LCP, CLS, and INP (unsized media, late-loading fonts, blocking scripts, heavy main-thread work).

### 5. Accessibility in code
Markup-level checks only; the perceptual and visual audit belongs to `design-review`.
1. Semantic HTML over generic containers; correct heading order; landmark regions present.
2. Interactive elements are real buttons and links, not click handlers on divs.
3. Keyboard operability — tab order, focus management on route change and modal open/close, focus trapping, no keyboard traps, visible focus not suppressed in CSS.
4. ARIA used correctly and only where native semantics fall short; labels on all form controls; errors programmatically associated with their inputs.
5. Alternative text on meaningful images; decorative images correctly hidden from assistive technology.

### 6. Security and data exposure
1. No secrets, API keys, or credentials in client code, environment files committed to the repo, or the shipped bundle.
2. XSS exposure — raw HTML injection points, unsanitised user content, unsafe URL handling.
3. Token and sensitive data storage choices, and what is exposed in `localStorage`, cookies, and the URL.
4. No sensitive or personally identifying data in query strings, console logs, analytics payloads, or error reports.
5. Dependency risk — known-vulnerable or unmaintained packages, transitive bloat.
6. Confirm authorisation is enforced server-side and the frontend is not the only gate on a privileged action.

### 7. Error handling, logging and observability
1. Error boundaries in place at sensible levels; no unhandled promise rejections; network failure handled distinctly from application failure.
2. Logging is intentional — no leftover debug output, no logging of user data, meaningful context attached to captured errors.
3. Monitoring wired up — error reporting, source maps for readable stack traces, basic real-user performance metrics.
4. Test coverage — what exists (unit, component, E2E), what critical path is untested, and whether tests assert behaviour or implementation detail.

### 8. Build, cloud and pipeline
1. Build configuration, environment variable handling across environments, and whether the production build is genuinely production-mode.
2. CI pipeline steps for the frontend — lint, type-check, test, build, bundle size budget, preview deploy.
3. Hosting and delivery — CDN and caching headers, static asset strategy, and any cloud integration code living in the frontend that should not be there.

### 9. Compile the report
Prioritise every finding, then write it up in the format below.

| Priority | Meaning |
|---|---|
| **P1** | Broken, insecure, or blocking — fix before merge |
| **P2** | Degrades quality, performance, or maintainability — fix next |
| **P3** | Improvement or consistency issue — fix when convenient |

## Output
A written report containing:

- **Summary** — branch, framework, styling method, scope reviewed, issue counts by priority.
- **Work in progress** — what is being built on this branch and its current state.
- **Recently completed work** — what has landed and its impact on the product.
- **Findings** — each with priority, file path and line reference, what is wrong, why it matters, and the recommended change described in words.
- **Frontend–backend mapping table** — endpoint, consuming component or service, contract match status, notes.
- **Performance snapshot** — bundle observations, render concerns, loading and error state coverage gaps.
- **Security findings** — listed separately and never buried among style issues.
- **Blockers and risks** — anything that stops the work progressing, and anything that will become expensive if left.
- **Alignment check** — how this work tracks against the product goal currently being built toward.
- **Recommendations** — ordered, specific, and scoped to what one engineer can realistically act on.

## Notes
- Read and report only. This skill writes nothing, updates nothing, and deletes nothing — no code, no config, no files. Fixes are a separate, explicitly requested task.
- Do not assume the stack. Detect it, and ask if detection is ambiguous.
- Keep design and UX observations out of this report. Note them in one line and hand them to `design-review`.
- Report against the project's existing conventions. A deviation from the codebase's own established pattern is a finding; a deviation from personal preference is not.
- Scope findings to the constraint set — a single engineer, bootstrapped, shipping web-first. Flag over-engineering as firmly as under-engineering.
- Every finding needs a file path. A finding without a location is not actionable.
- Cloud integration and pipeline code in the frontend is in scope for this review.