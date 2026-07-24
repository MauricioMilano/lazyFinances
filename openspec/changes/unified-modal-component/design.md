---
tags:
  - change/unified-modal-component
  - capability/modal-system
---
## Context

The app currently exposes `Dialog` (Radix), `Drawer` (vaul), `AlertDialog` (Radix), and `Sheet` (Radix) as raw shadcn primitives in `src/components/ui/`. Of those, only one is actually consumed in app code: `Settings.tsx` uses `Dialog` for the LM Studio AI configuration. The AI Rules explicitly forbid editing those primitive files ("Note that these files shouldn't be edited, so make new components if you need to change them."), so any unified modal must wrap rather than replace them. Today, every consumer of a modal will reach for the raw primitive directly — there is no opinionated API, no shared spacing, and no responsive behavior. Tablet and mobile users see a desktop dialog at narrow widths.

The wrapper is also the enforcement point: a custom ESLint rule will gate `from "@/components/ui/{dialog,drawer,alert-dialog,sheet}"` outside the wrapper itself, turning the API into a single chokepoint.

## Goals / Non-Goals

**Goals:**
- One `Modal` API that picks the correct primitive per breakpoint without re-mounting children state.
- Aether-aligned, responsive spacing tokens on Header / Body / Footer that consumers never have to override.
- A `ConfirmModal` with opinionated destructive-safe defaults that downstream flows can opt into without re-implementing a11y.
- A lint-level guarantee that no future modal bypasses the wrapper.

**Non-Goals:**
- Replacing or editing the underlying shadcn primitives (`dialog.tsx`, `drawer.tsx`, etc.) — they are untouched.
- Visual unification of the open/close animations between Dialog (fade+zoom) and Drawer (slide-up). The platform conventions win; the wrapper does not try to harmonize them.
- A nested/stacked-modal pattern. Only one modal at a time is in scope.
- Removing the four raw primitives from `ui/`. They remain as low-level building blocks used only by the wrapper.

## Decisions

### 1. JS-driven primitive selection (not CSS-hide)
`Modal` calls `useIsDesktop()` (a new `matchMedia('(min-width: 1024px)')` hook) and conditionally renders either the Dialog tree or the Drawer tree. The children are passed exactly once into the chosen tree.

- **Rationale**: Form state, refs, and focus inside the modal children must not split across two parallel trees. CSS-hiding one of two mounted trees would render children twice and split their hooks.
- **Alternative considered**: Render both primitives and hide one with `hidden lg:block` / `lg:hidden`. Rejected because it duplicates the children subtree and breaks stateful children.
- **First-paint default**: while `useIsDesktop()` is `undefined` (pre-`useEffect`), the wrapper defaults to the Drawer so mobile users do not see a flash of centered dialog. This is a mobile-first Vite SPA with no SSR, so no hydration mismatch concern.

### 2. Context-driven primitive selection inside children
`Modal` exposes a `ModalContext` carrying `{ variant: 'desktop' | 'drawer' }`. `Modal.Header` reads it to decide whether to wrap the title in `DialogTitle` or `DrawerTitle`. `Modal.Footer` and `Modal.Body` are dumb presentational wrappers and do not need the context.

- **Rationale**: Radix/vaul each require their own Title primitive to wire up `aria-labelledby`. The wrapper hides that switch from consumers.
- **Alternative considered**: Always render both `DialogTitle` and `DrawerTitle` and hide one with CSS. Rejected for the same reason as decision 1.

### 3. Threshold at 1024px (Tailwind `lg`), not 768px (`md`)
The desktop↔tablet boundary is `1024px`, not the `768px` already used by `use-mobile.tsx`.

- **Rationale**: A centered dialog at 800px viewport feels cramped; tablets have enough room for content but not for a comfortable dialog. `lg` matches the colloquial "desktop" surface for this app.
- **Alternative considered**: Use the existing `useIsMobile` (768px) so modal and non-modal layouts switch at the same point. Rejected because dialog ergonomics dominate this decision, not layout consistency.

### 4. Close X is always present, in the Header
The close button is rendered as part of `Modal.Header` (positioned absolutely within the header's padding box), not as a sibling of the header content.

- **Rationale**: Consumers do not have to remember to add it; the dismiss affordance is consistent across every breakpoint. It also reserves layout space so the title does not shift if the consumer later adds a header right-action.

### 5. `ConfirmModal` is its own component, not a `Modal` prop
The opinionated confirmation flow lives in `src/components/ui/confirm-modal.tsx`, importing `Modal` and re-using its primitives internally. It is not exposed as `<Modal intent="destructive" />`.

- **Rationale**: Confirmation flows have a small but non-trivial a11y contract (initial focus on Cancel, Escape = cancel, outside-click does not dismiss, async loading state). Folding those into the generic `Modal` props would bloat its API and push destructive assumptions onto every consumer.
- **Alternative considered**: `<Modal intent="destructive" />` with extra flags. Rejected as prop creep.

### 6. ESLint rule scopes imports by directory
A custom rule (`eslint-rules/no-raw-modal-primitives.cjs`) bans `from "@/components/ui/dialog"`, `…/drawer`, `…/alert-dialog`, `…/sheet` from any file under `src/components/**` and `src/pages/**`. The wrapper files (`modal.tsx`, `confirm-modal.tsx`) are explicitly allowed.

- **Rationale**: The rule is the only mechanism that prevents future drift — documentation alone does not stop the next consumer from importing the raw primitives.
- **Alternative considered**: Delete the primitives outright. Rejected because they are useful inside the wrapper itself, and removing them costs nothing extra while keeping the rule as the only gate.

### 7. Custom rule implemented as a local CommonJS module
The rule is a single `.cjs` file in `eslint-rules/` and registered in `eslint.config.js` via `local` plugin conventions.

- **Rationale**: Keeps the rule colocated with the project, avoids publishing an npm package, and is small enough (~30 lines) that the maintenance cost is negligible.

## Risks / Trade-offs

- **[Risk] Mid-modal breakpoint switch unmounts children**
  When the user resizes across 1024px while the modal is open, the children tree is unmounted and re-mounted in the other primitive. Any in-flight state inside the children is lost.
  - **Mitigation**: The threshold is high (1024px), and resize-during-modal is rare. If it becomes a real complaint, the future option is to render both trees and use CSS to toggle visibility — but that re-introduces the duplicate-children problem. Document the trade-off in `Modal`'s JSDoc.

- **[Risk] First-paint flash of Drawer on desktop**
  Before `useEffect` runs, `useIsDesktop()` is `undefined` and the wrapper defaults to Drawer. Desktop users see one frame of Drawer before it switches to Dialog.
  - **Mitigation**: The default matches the mobile-first philosophy; the flash is one frame and only on first open. If it is visible enough to be a problem, switch the default to desktop-only when `(min-width: 1024px)` matches at first paint — but that costs an SSR-style hydration check we do not need for a Vite SPA.

- **[Risk] ESLint custom rule slows down linting**
  A custom rule that scans every file path runs on every file.
  - **Mitigation**: The rule short-circuits on file path (only `src/components/**` and `src/pages/**` get checked). The rule body itself is a simple regex on the source text.

- **[Risk] `useIsDesktop` and `useIsMobile` definitions diverge**
  Two hooks with different thresholds could confuse a future developer.
  - **Mitigation**: Each hook's JSDoc will name its threshold and the surface it gates (layout vs modal). We will not collapse them into one — they answer different questions.

- **[Risk] `ConfirmModal` outside-click opt-out is non-obvious**
  Consumers used to "click outside to dismiss" may be surprised that ConfirmModal does not.
  - **Mitigation**: Document the rationale in `confirm-modal.tsx` JSDoc and rely on the existing press-Escape = cancel as the keyboard escape hatch.

## Migration Plan

1. **Add `useIsDesktop` hook** — new file, no existing call sites, safe.
2. **Add `Modal` and `ConfirmModal`** — new files in `src/components/ui/`. No existing consumer changes yet.
3. **Migrate `Settings.tsx`** — replace `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` with `Modal` + compound parts. Test responsive behavior.
4. **Wire `AirtableTable.tsx` row delete** — add local `confirmId` state; clicking the trash opens `<ConfirmModal intent="destructive" …>` and only calls `onDelete(id)` after the user confirms.
5. **Add ESLint custom rule + register it** — non-breaking; the lint passes today because `Settings.tsx` is being migrated in step 3 and `AirtableTable.tsx` never imported the raw primitives.
6. **Rollback** — Each step is independently revertable. `Modal` and `ConfirmModal` are additive until step 3; reverting step 3 brings the raw `Dialog` back into `Settings.tsx`; reverting step 4 simply unbinds the confirmation. The ESLint rule (step 5) is additive and can be disabled by removing its entry in `eslint.config.js`.

## Open Questions

- None. All five open questions surfaced in the explore phase are resolved: heading shape is a `title` prop + `as` override, close X is always rendered, `ConfirmModal` is a separate component, `Modal.Description` is added (optional), and outside-click opt-out is built into `ConfirmModal` only.


## Related

- [[proposal|Proposal]]
- [[tasks|Tasks]]
- [[specs/modal-system/spec|modal-system spec]]
