---
tags:
  - change/unified-modal-component
  - capability/modal-system
---
## ADDED Requirements

### Requirement: Unified Modal compound component
The system SHALL provide a `Modal` component with the compound parts `Modal.Trigger`, `Modal.Header`, `Modal.Body`, and `Modal.Footer`. The `Modal` MUST be the only entry point for rendering a modal surface in the application.

#### Scenario: Consumer composes a modal from the compound parts
- **WHEN** a developer writes `<Modal><Modal.Header title="…"/><Modal.Body>…</Modal.Body><Modal.Footer>…</Modal.Footer></Modal>`
- **THEN** the system renders a modal with header, scrollable body, and footer using the section-specific spacing tokens

#### Scenario: Trigger opens the modal
- **WHEN** the user activates a `Modal.Trigger` element
- **THEN** the modal opens in the correct primitive for the current viewport (Dialog or Drawer)

### Requirement: Responsive primitive selection
The system SHALL render a centered `Dialog` (Radix UI) when the viewport width is 1024px or larger, and a bottom-pinned `Drawer` (vaul) when the viewport width is below 1024px.

#### Scenario: Desktop renders Dialog
- **WHEN** the viewport width is 1024px or larger and `Modal` is open
- **THEN** the modal content is rendered as a centered Dialog with `max-w-lg` and `sm:rounded-xl`

#### Scenario: Tablet renders Drawer
- **WHEN** the viewport width is between 768px and 1023px and `Modal` is open
- **THEN** the modal content is rendered as a Drawer anchored to the bottom of the viewport

#### Scenario: Mobile renders Drawer
- **WHEN** the viewport width is below 768px and `Modal` is open
- **THEN** the modal content is rendered as a Drawer anchored to the bottom of the viewport with tighter spacing

#### Scenario: Single child tree across the breakpoint switch
- **WHEN** a developer holds internal React state inside the modal children (e.g. a form) and the viewport crosses the 1024px threshold while the modal is open
- **THEN** the modal re-mounts in the new primitive and the children state is preserved because the children tree is rendered exactly once per mount

### Requirement: Tokenized section spacing
The system SHALL apply Aether-Finance-aligned padding and margin tokens to each of the three modal sections (Header, Body, Footer). The Header and Footer MUST use `border-[#dddddd]` dividers; the Body MUST be vertically scrollable when content overflows.

#### Scenario: Desktop header and footer spacing
- **WHEN** the modal is rendered as a Dialog on desktop
- **THEN** the Header has `px-8 py-6` and the Footer has `px-6 py-4`, both with `border-[#dddddd]` dividers

#### Scenario: Tablet drawer spacing
- **WHEN** the modal is rendered as a Drawer on tablet (768–1023px)
- **THEN** the Header has `px-6 py-4`, the Body has `p-6`, and the Footer has `px-6 py-4` with a sticky bottom

#### Scenario: Mobile drawer spacing
- **WHEN** the modal is rendered as a Drawer on mobile (<768px)
- **THEN** the Header has `px-5 py-3`, the Body has `p-5`, and the Footer has `px-5 py-3` with a sticky bottom

#### Scenario: Desktop dialog has height cap with internal scroll
- **WHEN** the modal body content exceeds `85vh` on desktop
- **THEN** the body section scrolls internally while the Header and Footer remain pinned

### Requirement: Header title and close affordance
The system SHALL render the `title` prop inside a heading element (default `<h2>`, configurable via `as`) and SHALL always render a close (X) affordance inside the Header.

#### Scenario: Title uses default heading
- **WHEN** the developer writes `<Modal.Header title="Settings" />`
- **THEN** the system renders an `<h2>` containing the text "Settings" with `text-2xl font-medium tracking-tight` on desktop and `text-xl`/`text-lg` on smaller breakpoints

#### Scenario: Heading level override
- **WHEN** the developer writes `<Modal.Header title="Settings" as="h3" />`
- **THEN** the system renders the title inside an `<h3>` instead of the default `<h2>`

#### Scenario: Close X is always present
- **WHEN** the modal is open
- **THEN** a close X affordance is visible in the Header at every breakpoint and closes the modal on activation

#### Scenario: Optional description for screen readers
- **WHEN** the developer writes `<Modal.Header title="…" description="…" />`
- **THEN** the system renders the description in muted foreground text immediately below the title and exposes it as the accessible description of the modal

### Requirement: ConfirmModal for destructive confirmations
The system SHALL provide a `ConfirmModal` component built on `Modal` that is the only allowed pattern for confirming destructive actions.

#### Scenario: ConfirmModal renders confirmation copy and buttons
- **WHEN** the developer writes `<ConfirmModal open={open} onOpenChange={setOpen} title="Delete?" description="…" confirmLabel="Delete" cancelLabel="Cancel" onConfirm={fn} />`
- **THEN** the system renders a modal containing the title, description, a Cancel button, and a Confirm button labelled "Delete"

#### Scenario: Outside click does not dismiss
- **WHEN** the user clicks outside the modal while `ConfirmModal` is open
- **THEN** the modal remains open

#### Scenario: Escape key cancels
- **WHEN** the user presses the Escape key while `ConfirmModal` is open
- **THEN** the modal closes and `onOpenChange(false)` is called

#### Scenario: Initial focus is on Cancel
- **WHEN** `ConfirmModal` opens
- **THEN** keyboard focus is placed on the Cancel button

#### Scenario: Destructive intent styles the confirm action
- **WHEN** the developer passes `intent="destructive"` to `ConfirmModal`
- **THEN** the confirm button is rendered in destructive styling (red/destructive foreground)

#### Scenario: Loading state disables confirm
- **WHEN** the developer passes `isLoading={true}` to `ConfirmModal`
- **THEN** the confirm button is disabled and shows a loading indicator while the cancel button remains enabled

### Requirement: Enforcement of single modal API
The system SHALL prevent direct use of the raw shadcn modal primitives (`Dialog`, `Drawer`, `AlertDialog`, `Sheet`) anywhere outside `src/components/ui/modal.tsx` and `src/components/ui/confirm-modal.tsx`.

#### Scenario: Lint error on raw primitive import in components
- **WHEN** a developer writes `import { Dialog } from "@/components/ui/dialog"` inside any file under `src/components/**` or `src/pages/**`
- **THEN** the ESLint rule reports an error directing the developer to use `Modal` instead

#### Scenario: Lint allows internal Modal wrapper
- **WHEN** `src/components/ui/modal.tsx` or `src/components/ui/confirm-modal.tsx` imports the raw primitives
- **THEN** the ESLint rule does not report an error for those files

## History

- [[proposal|Proposal]]
