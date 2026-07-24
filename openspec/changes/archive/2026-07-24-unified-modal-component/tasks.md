---
tags:
  - change/unified-modal-component
  - capability/modal-system
---
## 1. Hook

- [x] 1.1 Create `src/hooks/use-is-desktop.ts` exposing `useIsDesktop()` backed by `matchMedia('(min-width: 1024px)')`. Default to `undefined` pre-`useEffect`, then set on mount and on `change`. Export a `boolean` (treat `undefined` as `false`).

## 2. Modal primitive

- [x] 2.1 Create `src/components/ui/modal.tsx`. Define a `ModalContext` carrying `{ variant: 'desktop' | 'drawer' }`.
- [x] 2.2 Implement `Modal` root: read `useIsDesktop()`, default to `'drawer'` while undefined, render either the Radix `Dialog` tree (desktop) or the vaul `Drawer` tree (mobile/tablet). Share `open` / `onOpenChange` between both roots. Wrap children in the chosen tree exactly once.
- [x] 2.3 Implement `Modal.Trigger` (`asChild`-capable) that renders the appropriate Trigger primitive (`DialogTrigger` vs `DrawerTrigger`) for the active variant.
- [x] 2.4 Implement `Modal.Header` with `title` (required string), optional `description`, optional `as` (heading level, default `'h2'`). Reads `ModalContext` to pick `DialogTitle` / `DrawerTitle` (and the matching `Description` when present). Renders an always-on close `X` affordance positioned within the header's padding box. Applies responsive header spacing tokens (px-8 py-6 / px-6 py-4 / px-5 py-3) and `border-b border-[#dddddd]`.
- [x] 2.5 Implement `Modal.Body` with responsive padding tokens (px-8 py-6 / p-6 / p-5) and internal scroll (`overflow-y-auto`). On desktop, the parent dialog content uses `max-h-[85vh]` so the body is the scroll surface.
- [x] 2.6 Implement `Modal.Footer` with responsive padding tokens (px-6 py-4 / px-6 py-4 / px-5 py-3), `border-t border-[#dddddd]`, `flex justify-end gap-2` on desktop and `flex flex-col gap-2` on mobile. Sticky to the bottom of the drawer.
- [x] 2.7 Export `Modal`, `ModalTrigger`, `ModalHeader`, `ModalBody`, `ModalFooter` from the same file under the compound names `Modal.Trigger`, `Modal.Header`, `Modal.Body`, `Modal.Footer`.

## 3. ConfirmModal

- [x] 3.1 Create `src/components/ui/confirm-modal.tsx`. Internally compose `Modal` + `Modal.Header` + `Modal.Body` + `Modal.Footer`. Render Cancel + Confirm buttons in the footer.
- [x] 3.2 Disable outside-click dismissal (set `onPointerDownOutside` / equivalent on the active primitive to no-op). Keep Escape = cancel.
- [x] 3.3 Move initial focus to the Cancel button when `ConfirmModal` opens (use a ref + `useEffect` on `open`).
- [x] 3.4 Implement `intent="destructive"` styling on the confirm button (destructive foreground token).
- [x] 3.5 Implement `isLoading` state: confirm button is disabled and shows a spinner; cancel button stays enabled.

## 4. Migrate Settings.tsx

- [x] 4.1 Replace `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger` imports with `Modal` + compound parts.
- [x] 4.2 Move the existing title text into `<Modal.Header title="LM Studio Configuration" />`.
- [x] 4.3 Remove the manual `grid gap-4 py-4` wrapper around the form fields; pass them directly to `<Modal.Body>`.
- [x] 4.4 Replace the manual `flex justify-end` wrapper around the Save button with `<Modal.Footer>`.
- [x] 4.5 Verify responsive behavior in browser at three widths (≥1024px, 768–1023px, <768px).

## 5. Wire AirtableTable delete confirmation

- [x] 5.1 Add a `confirmDeleteId: string | null` state in `AirtableTable.tsx`. Clicking the trash icon sets the id instead of deleting immediately.
- [x] 5.2 Render a `<ConfirmModal>` controlled by that state, with `intent="destructive"`, `title="Delete this transaction?"`, `description="This action cannot be undone."`, `confirmLabel="Delete"`, `cancelLabel="Cancel"`. On confirm, call `onDelete(id)` and clear the state.
- [x] 5.3 Verify the confirmation appears on all three breakpoints and that the row is not removed when the user cancels.

## 6. ESLint enforcement

- [x] 6.1 Create `eslint-rules/no-raw-modal-primitives.cjs`. The rule walks the AST, flags any `ImportDeclaration` whose source matches `/^@\/components\/ui\/(dialog|drawer|alert-dialog|sheet)$/`, and reports an error if the importing file is under `src/components/` or `src/pages/` but is not `src/components/ui/modal.tsx` or `src/components/ui/confirm-modal.tsx`.
- [x] 6.2 Register the rule in `eslint.config.js` under a local plugin and add it to the rules block. Run `pnpm lint` to confirm no errors.
- [x] 6.3 Add a short comment in `src/components/ui/modal.tsx` and `confirm-modal.tsx` pointing at the rule's allowlist so future maintainers know to update it if they extract a third wrapper.

## 7. Verification

- [x] 7.1 Run `pnpm lint` and confirm clean. *(Confirmed: no new errors; the 4 pre-existing errors in `command.tsx`, `textarea.tsx`, `ai-extraction.ts`, `tailwind.config.ts` exist on the baseline before this change.)*
- [x] 7.2 Run `pnpm build` and confirm clean. *(Confirmed: `vite build` completes; bundle 475.92 kB / 147.82 kB gzipped.)*
- [x] 7.3 Manually open the AI config modal at desktop, tablet, and mobile widths (Chrome DevTools responsive mode).
- [x] 7.4 Manually trigger a row delete from `AirtableTable.tsx` and verify the destructive confirmation flow on all three breakpoints.


## Related

- [[proposal|Proposal]]
- [[design|Design]]
- [[specs/modal-system/spec|modal-system spec]]
