"use strict";

/**
 * @fileoverview Forbid direct imports of the raw shadcn modal primitives from
 * anywhere outside the Modal wrapper itself. Consumers must go through
 * `Modal` or `ConfirmModal` so that the responsive primitive selection,
 * spacing tokens, and a11y headers stay consistent.
 */

const FORBIDDEN_SOURCES = [
  "@/components/ui/dialog",
  "@/components/ui/drawer",
  "@/components/ui/alert-dialog",
  "@/components/ui/sheet",
];

const FORBIDDEN_PATTERN = /^@\/components\/ui\/(dialog|drawer|alert-dialog|sheet)$/;

const ALLOWED_FILES = new Set([
  "src/components/ui/modal.tsx",
  "src/components/ui/confirm-modal.tsx",
]);

function isAllowed(filename) {
  if (!filename) return false;
  const normalized = String(filename).replace(/\\/g, "/");
  for (const allowed of ALLOWED_FILES) {
    if (normalized.endsWith(allowed) || normalized === allowed) return true;
  }
  return false;
}

function isUnderUi(filename) {
  if (!filename) return false;
  const normalized = String(filename).replace(/\\/g, "/");
  return /(^|\/)src[\\/]+components[\\/]+ui[\\/]/.test(normalized);
}

function isInScope(filename) {
  if (!filename) return false;
  const normalized = String(filename).replace(/\\/g, "/");
  if (isUnderUi(normalized)) return false;
  return (
    normalized.includes("/src/components/") ||
    normalized.includes("/src/pages/") ||
    /(^|\/)src[\\/]+components[\\/]/.test(normalized) ||
    /(^|\/)src[\\/]+pages[\\/]/.test(normalized)
  );
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid imports of raw shadcn modal primitives outside the Modal wrapper.",
      category: "Best Practices",
      recommended: false,
    },
    schema: [],
    messages: {
      forbidden:
        "Do not import `{{source}}` directly. Use `Modal` or `ConfirmModal` from `@/components/ui/modal` instead. The raw primitives are reserved for the Modal wrapper itself.",
    },
  },

  create(context) {
    const filename = context.getFilename();

    if (isAllowed(filename)) {
      return {};
    }
    if (!isInScope(filename)) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const source = node.source && node.source.value;
        if (typeof source !== "string") return;
        if (!FORBIDDEN_PATTERN.test(source)) return;

        context.report({
          node,
          messageId: "forbidden",
          data: { source },
        });
      },
    };
  },
};
