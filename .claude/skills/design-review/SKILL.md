---
name: design-review
description: Visual and UX review of a running website or app — design system consistency, layout, WCAG AA/AAA accessibility, colour contrast and palette intent, responsive behaviour, loading and empty states, and benchmarking against live market products via Mobbin. Use when the user asks for a design review, UI/UX audit, accessibility audit, or a comparison of their interface against competitors. Inspects the rendered product, not the source.
metadata:
  type: dynamic
---

# Design Review

## Purpose
This skill reviews the product as the user actually experiences it. It inspects the rendered interface in a browser across viewports and evaluates visual quality, design system consistency, information hierarchy, accessibility against WCAG 2.1 AA with AAA noted where achievable, colour contrast and palette intent, responsive behaviour, and the perceived quality of loading, empty, and error states.

It also benchmarks the interface against comparable products currently shipping in the market, using Mobbin as the reference library, so that layout and flow decisions are judged against what the target audience already uses rather than against taste alone.

It is the perceptual counterpart to `frontend-review`. Where that skill asks "is this code correct", this one asks "does this work for the person looking at it". Implementation-level findings — bundle size, state management, API contracts — belong to `frontend-review`.

The output is a prioritised report. The skill inspects and reports; it does not edit source files.

## Trigger
When the user requests a design review, UI review, UX audit, accessibility or contrast check, responsive review, or a comparison of the current interface against products already in the market.

## Steps

### 1. Establish target and context
1. Confirm the URL to review. If not supplied, ask: local dev server, staging, or production.
2. Confirm scope: specific pages and flows, or the whole application.
3. Establish the audience and the job being done on each screen — who uses it, what they came to do, how often, and under what pressure. Every layout judgement in this review is made against that, not against general aesthetics.
4. Gather design intent if available: existing design system, brand guidelines, token definitions, component library, or reference designs. If none exists, note that and review against internal consistency instead.
5. Confirm browser automation is available (Playwright MCP, Claude in Chrome, or equivalent) with navigation, screenshot, DOM snapshot, resize, and console access.

### 2. Visual inspection
1. Navigate the target and capture full-page screenshots of every in-scope page and key state (loaded, loading, empty, error, populated with realistic volume).
2. Retrieve the DOM or accessibility snapshot where the tool supports it.
3. Traverse the primary navigation and walk each core user flow end to end rather than reviewing isolated screens.
4. Read console messages and flag anything user-visible.

Inspect for:

| Category | What to look for | Severity |
|---|---|---|
| **Layout** | Element overflow beyond parent or viewport; unintended overlap; broken grid or flex alignment; text clipping and unhandled long strings | High |
| **Spacing** | Inconsistent padding and margin between similar elements; uneven rhythm; cramped or orphaned content | Medium |
| **Hierarchy** | Primary action not visually dominant; competing emphasis; unclear scan path; content weighted wrongly for the task | High |
| **Typography** | Mixed font families; inconsistent scale; line length beyond comfortable reading; insufficient line height | Medium |
| **Consistency** | Same component styled differently across pages; non-unified brand colours; divergent icon or border-radius treatment | Medium |

### 3. Design system review
1. Inventory the components actually rendered and compare against the defined system. Flag one-off components that duplicate an existing one and components that have drifted from their definition.
2. Check token discipline — are colour, spacing, radius, shadow, and type values coming from tokens, or are hardcoded values appearing in the rendered styles?
3. Check state coverage on interactive components: default, hover, focus, active, disabled, loading, error, and selected. A component missing states is a finding.
4. Check density and alignment consistency across data-heavy surfaces — tables, lists, cards, dashboards — where drift is most visible and most costly.
5. Where no formal system exists, document the de facto one observed and flag the inconsistencies within it.

### 4. Accessibility — WCAG AA baseline, AAA where achievable
1. **Colour contrast** — measure every text/background pair. Body text must reach 4.5:1, large text 3:1, and UI component and graphical boundaries 3:1. Note where AAA (7:1 body, 4.5:1 large) is met or within reach. Check contrast in every state, including disabled, placeholder, and hover, and over images or gradients.
2. **Colour independence** — confirm no status, error, or category is communicated by colour alone. Check the interface against protanopia, deuteranopia, and tritanopia simulation.
3. **Focus visibility** — every interactive element must show a clearly visible focus indicator with adequate contrast against its background.
4. **Keyboard journey** — traverse each flow using only the keyboard. Check logical tab order, focus management on navigation and modal open/close, escape behaviour, and absence of traps.
5. **Text and zoom** — legible base size, no fixed heights that clip text, layout survives 200% zoom and browser text resizing.
6. **Touch targets** — minimum 44×44px on mobile, with adequate separation between adjacent targets.
7. **Motion** — reduced-motion preference respected; no unavoidable auto-playing or flashing content.
8. State clearly which criteria pass at AA, which fail, and which are close enough to AAA to be worth claiming.

### 5. Colour and palette intent
1. Verify the palette matches the emotional positioning the product needs for its audience.
2. Apply the intent model: **blue** carries trust, stability, and institutional credibility — appropriate for a primary identity in a finance or data product; **green** signals success and power-user momentum, with **darker green** reading as more serious and considered than bright green, which skews consumer and casual.
3. Check semantic colour consistency — success, warning, error, and informational colours must mean the same thing everywhere and never be reused decoratively.
4. Check that the accent colour is reserved for the primary action and not diluted across the interface.
5. Flag any conflict between the palette's emotional reading and the audience's expectations of the category.

### 6. Responsive review
Test and screenshot at each viewport:

| Name | Width | Representative device |
|---|---|---|
| Mobile | 375px | iPhone SE / 12 mini |
| Tablet | 768px | iPad |
| Desktop | 1280px | Standard laptop |
| Wide | 1920px | Large display |

Check for layout breakage on small screens, unnatural transitions at breakpoints, horizontal scroll, undersized touch targets, content reordering that damages hierarchy, and data-dense views (tables, dashboards) that become unusable rather than adapting.

### 7. Perceived performance and state design
1. Confirm every asynchronous action gives feedback within roughly 100ms.
2. Match the loader to the expected latency: inline or optimistic feedback for fast actions, skeleton screens that mirror the real layout for content loads, and explicit progress or an expectation-setting message for anything long-running. Flag spinners standing in for structure, and layout shift when content replaces a loader.
3. Review empty states — do they explain what belongs there and offer the action that fills it, or is the screen simply blank?
4. Review error states — is the message specific, non-technical, and paired with a recovery path?
5. Review first-run experience — what a brand-new account sees before any data exists.

### 8. Market benchmarking via Mobbin
1. Use Mobbin to pull comparable screens, sections, and flows from products serving a similar audience and solving a similar job.
2. Compare layout conventions, navigation patterns, data presentation, onboarding, and empty states against those references.
3. Identify where the current design diverges from an established convention, and judge each divergence as either a deliberate differentiator or an unnecessary cost to the user's familiarity.
4. Pull specific patterns worth adopting, with a note on why they fit this audience.
5. Keep the comparison honest — a convention is not automatically correct, and matching competitors everywhere produces an undifferentiated product.

### 9. Prioritise and report

| Priority | Meaning |
|---|---|
| **P1** | Blocks use, breaks layout, or fails WCAG AA — fix immediately |
| **P2** | Degrades experience or breaks system consistency — fix next |
| **P3** | Polish and minor inconsistency — fix when convenient |

## Output
A written report containing:

- **Summary** — URL, pages and flows reviewed, viewports tested, audience assumed, issue counts by priority.
- **Findings** — each with priority, page, element or selector, a description of the problem, why it matters for this audience, a screenshot reference, and a recommended direction.
- **Accessibility results** — contrast measurements in a table with pass/fail against AA and AAA, plus keyboard, focus, and touch target findings.
- **Design system findings** — drift, inconsistencies, missing component states, hardcoded values observed.
- **Colour and palette assessment** — whether the palette serves the intended positioning and audience.
- **Responsive findings** — per viewport, with screenshots.
- **State design findings** — loading, empty, error, and first-run coverage.
- **Market comparison** — Mobbin references, what they do differently, and what is worth adopting or deliberately rejecting.
- **Recommendations** — ordered and specific, separating what should change now from what belongs on a design backlog.

## Notes
- Inspect and report only. This skill does not edit source files, stylesheets, or components. If the user wants fixes applied, that is a separate, explicitly requested task with its own confirmation.
- Always capture screenshots before recording a finding, and reference them in the report.
- Review against the audience and the job, not against general taste. A dense, information-heavy screen can be exactly right for a professional tool and wrong for a consumer app.
- Judge against the project's own design language first. Deviation from the product's established pattern is a finding; deviation from a generic convention needs a reason before it is called a problem.
- Never claim a contrast ratio without measuring it.
- Keep code-quality findings out of this report. Note them in one line and hand them to `frontend-review`.
- Flag anything that would require a component or token change rather than a page-level tweak, since those carry wider impact and should be decided deliberately.