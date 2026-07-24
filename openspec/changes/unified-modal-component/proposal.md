---
tags:
  - change/unified-modal-component
  - capability/modal-system
---
## Why

The application currently uses `Dialog` from shadcn/ui for the only existing modal — the LM Studio AI configuration in `Settings.tsx` — and reaches into the shadcn primitive directly. There is no abstraction over Dialog/Drawer, no shared spacing system, and no guidance for future modals. On tablet and mobile the AI config dialog is also the only modal surface, which is cramped and unergonomic. A unified modal component that picks the right primitive per breakpoint and standardizes spacing will unblock every future modal in the project (e.g. delete confirmations, future flows) and lock down a single, opinionated API so no one reaches for the raw primitives again.

## What Changes

- **New `Modal` primitive** — A compound component (`Modal`, `Modal.Header`, `Modal.Body`, `Modal.Footer`, `Modal.Trigger`) that mounts a `Dialog` on desktop (≥1024px) and a `Drawer` on tablet/mobile, sharing one tree of children so internal state (e.g. form state) is preserved across the breakpoint switch.
- **Tokenized, responsive spacing** — Header, Body and Footer each carry their own padding tokens aligned with the Aether Finance aesthetic (`#dddddd` borders, `bg-[#f8fafc]` surfaces, `rounded-lg/xl`, `tracking-tight` titles). Tokens scale per breakpoint: dialog gets `px-8 py-6` headers/footers, drawer gets `px-6 py-4`, mobile tightens further to `px-5 py-3`. The drawer footer is sticky-pinned to the bottom of the sheet; the dialog body is scrollable inside a `max-h-[85vh]` cap.
- **Header always renders title + close X** — Title is a plain string prop wrapped in an `<h2>` by default (heading level overridable via `as`); the close X is always present and is the single, consistent dismissal affordance.
- **New `ConfirmModal` built on `Modal`** — Opinionated confirmation flow with destructive-safe defaults: outside-click does NOT close, Escape cancels, initial focus is on Cancel, confirm button auto-disables while async work is in flight, and a `destructive` intent switches button styling.
- **Migrate `Settings.tsx`** — Replace the raw `Dialog` usage with the new `Modal` so the existing AI configuration flow gets the responsive treatment for free.
- **Wire the row-delete confirmation in `AirtableTable.tsx`** — Today the trash icon deletes immediately with no confirmation; this change routes it through `ConfirmModal`.
- **Enforcement** — Add an ESLint custom rule that bans direct imports of `@/components/ui/dialog`, `@/components/ui/drawer`, `@/components/ui/alert-dialog`, and `@/components/ui/sheet` from `src/components/**` and `src/pages/**`, so the only path to a modal is through `Modal` or `ConfirmModal`.

## Capabilities

### New Capabilities
- `modal-system`: The unified `Modal` compound component and `ConfirmModal` wrapper, including responsive Dialog↔Drawer branching, tokenized section spacing, and the enforcement contract that makes this the only modal surface in the app.

### Modified Capabilities
- None

## Impact

- **New files**
  - `src/components/ui/modal.tsx` — the `Modal` + compound parts (`Modal.Header`, `Modal.Body`, `Modal.Footer`, `Modal.Trigger`)
  - `src/components/ui/confirm-modal.tsx` — opinionated confirmation flow
  - `src/hooks/use-is-desktop.ts` — matchMedia hook at the 1024px threshold (alongside the existing `use-mobile.tsx`)
  - `eslint-rules/no-raw-modal-primitives.cjs` — custom ESLint rule banning direct primitive imports
- **Modified files**
  - `src/components/Settings.tsx` — migrate to `Modal`
  - `src/components/AirtableTable.tsx` — wrap row delete in `ConfirmModal`
  - `eslint.config.js` — register the new rule
- **No dependency changes** — `vaul`, `@radix-ui/react-dialog`, and `@radix-ui/react-alert-dialog` are already installed; only the consumer code changes.
- **UX impact** — Tablet and mobile users get a properly sized bottom drawer instead of a centered dialog for the AI config flow; row deletes gain a confirmation step on every breakpoint.


## Related

- [[design|Design]]
- [[tasks|Tasks]]
- [[specs/modal-system/spec|modal-system spec]]
