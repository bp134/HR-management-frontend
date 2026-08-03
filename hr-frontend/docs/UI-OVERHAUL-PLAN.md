# UI overhaul plan

## Purpose

Create a stable, readable, responsive HR interface after the current deployment/configuration recovery work. The screenshots show severe styling and layout failures, so the first priority is to restore the CSS pipeline before redesigning individual pages.

## Screenshot observations

From the supplied collage:

- Pages are rendering with mostly browser-default styling in several areas.
- The employee search icon appears extremely large and covers most of the page.
- The login page has oversized black SVG blocks/icons and loses the intended card/button styling.
- Layout width, spacing, alignment, and typography are inconsistent.
- Content rows appear as thin horizontal lines with very little visible structure.
- Information density is uneven: some areas are almost empty while icons/graphics dominate the viewport.
- The app does not currently look like a coherent admin dashboard, even where functionality is present.

## Likely technical cause

The screenshots strongly suggest Tailwind utility CSS is not being generated or applied correctly.

Evidence:

- SVGs that should be constrained with classes such as `w-4 h-4` are displaying at default/huge sizes.
- Tailwind layout utilities such as flex/grid/spacing/rounded/shadow/background appear missing.
- The current frontend uses Tailwind v4 packages with a Tailwind v3-style CSS entry:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Tailwind v4 expects a different integration pattern. This should be corrected before spending time manually adjusting page layout.

## Goals

1. Restore reliable CSS generation and loading.
2. Re-establish a consistent application shell.
3. Standardize page layout, typography, controls, tables, and cards.
4. Improve responsive behavior.
5. Make the app visually usable before adding more features.

## Non-goals

- Redesigning backend/API behavior.
- Changing authentication flow.
- Changing database schema.
- Adding new HR features before layout stability is restored.

## Workstream 1: Fix styling pipeline

### Tasks

- Decide between:
  - migrate properly to Tailwind v4, or
  - pin back to Tailwind v3 for lower-risk recovery.
- Verify `src/index.css` produces expected Tailwind utilities.
- Verify built CSS contains common utility classes used by the app.
- Confirm deployed Static Web App loads the generated CSS asset.
- Add a simple visual smoke check page/route or checklist for common classes:
  - flex
  - grid
  - spacing
  - width/height
  - colors
  - rounded corners
  - shadows

### Impact

High. This should fix the giant icons, unstyled login page, broken spacing, and most layout collapse issues in one pass.

### Acceptance criteria

- Login page shows a centered card with normal-sized Microsoft icon.
- Search icon is constrained to normal input-icon size.
- Sidebar, cards, tables, and buttons visibly use Tailwind styling.
- No page is mostly browser-default Times New Roman styling.

## Workstream 2: Application shell and navigation

### Tasks

- Review `Layout.tsx`.
- Standardize:
  - sidebar width
  - page padding
  - mobile header
  - active navigation state
  - sign-out placement
- Ensure protected pages share one consistent content container.
- Fix mobile sidebar overlay behavior.

### Impact

High. This gives all pages a consistent frame and prevents each page from drifting visually.

### Acceptance criteria

- Sidebar is usable on desktop and mobile.
- Main content aligns consistently across dashboard, employees, leave, documents, and profile pages.
- No content starts flush against the browser edge.

## Workstream 3: Login page cleanup

### Tasks

- Rebuild the sign-in screen around a simple centered card.
- Keep one small Microsoft icon.
- Add clear error state styling.
- Ensure spacing works on mobile and desktop.
- Avoid large decorative SVGs unless they are constrained.

### Impact

High. This is the first screen users see and currently looks broken in the screenshots.

### Acceptance criteria

- Sign-in card is centered.
- Button is normal size and clearly clickable.
- Text hierarchy is clear.
- Error messages are readable and not visually overwhelming.

## Workstream 4: Employee list and search

### Tasks

- Fix search input and icon sizing.
- Standardize list/table container.
- Add empty, loading, and error states with consistent spacing.
- Ensure employee rows align across desktop widths.
- Review mobile behavior for table overflow.

### Impact

High. The search icon issue is one of the most visible problems in the screenshots.

### Acceptance criteria

- Search icon stays inside the input at small size.
- Employee rows are readable.
- Table/list does not overflow awkwardly.
- Empty/loading/error states are visually consistent.

## Workstream 5: Dashboard/cards

### Tasks

- Standardize card component styling.
- Align quick action cards.
- Normalize stat card sizes.
- Ensure headings and subheadings use consistent sizes/weights.

### Impact

Medium to high. Improves perceived quality and dashboard usability.

### Acceptance criteria

- Dashboard cards align in a grid.
- Cards have consistent padding, border, radius, and hover state.
- Stats and quick actions are easy to scan.

## Workstream 6: Employee detail/profile forms

### Tasks

- Standardize form labels, inputs, selects, buttons, and validation messages.
- Align read-only detail sections.
- Ensure edit/create modes share the same form layout.
- Review date fields and employment type controls.

### Impact

Medium. Improves HR/admin workflows after the main styling break is fixed.

### Acceptance criteria

- Form fields align in a predictable grid.
- Save/cancel actions are obvious.
- Error messages appear near relevant controls.

## Workstream 7: Leave, documents, and contracts pages

### Tasks

- Standardize placeholder/empty-state layouts.
- Replace oversized or unstyled icons.
- Use common page header and card patterns.
- Ensure pages do not look unfinished even if data is limited.

### Impact

Medium. These pages may have less functionality but should still feel intentional.

### Acceptance criteria

- Empty states are centered and styled.
- Icons are constrained.
- Page titles and descriptions match the rest of the app.

## Workstream 8: Shared UI primitives

### Tasks

Introduce lightweight reusable components only where they reduce drift:

- `PageHeader`
- `Card`
- `Button`
- `TextInput`
- `StatusMessage`
- `EmptyState`
- `TableShell`

### Impact

Medium. Reduces repeated styling and prevents future visual inconsistency.

### Acceptance criteria

- Common UI patterns use shared components.
- Page code becomes easier to scan.
- Future pages can follow the same patterns.

## Recommended implementation order

1. Fix Tailwind/CSS pipeline.
2. Verify deployed CSS on Azure Static Web Apps.
3. Fix login page.
4. Fix application shell/sidebar.
5. Fix employee list/search.
6. Fix dashboard cards.
7. Fix employee detail/profile forms.
8. Fix leave/documents/contracts empty states.
9. Extract shared UI primitives where duplication remains.

## Validation checklist

For each page:

- Desktop layout at 1440px width.
- Laptop layout at 1024px width.
- Mobile layout around 390px width.
- No giant unconstrained SVGs.
- No browser-default typography.
- No horizontal overflow unless intentionally scrollable.
- Buttons/inputs have clear focus states.
- Loading/error/empty states are styled.

## Expected impact

- Removes the broken/unstyled appearance.
- Restores confidence in the deployed app.
- Makes HR workflows easier to understand.
- Reduces future UI regressions by consolidating patterns.
- Makes screenshots/demo review much easier after each deployment.

## Open questions

- Should the UI remain Tailwind-only, or should shared components be formalized first?
- Should Tailwind be migrated fully to v4 or pinned back to v3 for stability?
- Should the app support mobile as a first-class use case or prioritize desktop HR/admin usage?
- Are there brand colors, logos, or typography preferences to apply?
