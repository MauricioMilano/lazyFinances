---
name: lazy-finance-add-tests
description: 'Set up Vitest + Testing Library for the lazyFinances project and seed the first round of unit tests. Use when: adding tests, bootstrapping a test runner, covering an untested store or util, or any work that requires tests (this project mandates tests on every change). Triggers: "add tests", "set up vitest", "test the store", "test the AI extraction", "test the export", "write unit tests", "cover the migration".'
---

# Add Tests to lazyFinances

The project ships with **no test runner** despite a project-wide rule that all features, bug fixes, and tasks require unit tests. This skill bootstraps Vitest and writes the first round of tests for the untested code that already exists.

**Scope**: install dependencies, configure Vitest, add `pnpm` scripts, write focused unit tests for the existing untested modules, run the suite.

---

## 1. Verify the current state

Before installing anything, confirm the gap:

```bash
# Should return nothing
grep -E '"(test|vitest|@testing-library|happy-dom)"' package.json

# Should return false
grep -E '"test"\s*:' package.json
```

If `test` script already exists, jump to **Step 6 (Seed tests)**.

---

## 2. Install Vitest + Testing Library + happy-dom

```bash
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom jsdom
```

Pin compatible majors with React 19:

- `vitest@^2` (or `^3` if Vite 8 supports it — use `pnpm view vitest peerDependencies` to confirm)
- `@testing-library/react@^16` (React 19 compatible)
- `happy-dom@^15` or `jsdom@^25`

If you hit peer-dep conflicts, add `--legacy-peer-deps` (the project's Dockerfile already does this).

---

## 3. Configure Vitest

Create [vitest.config.ts](vitest.config.ts) at the project root:

```ts
// filepath: vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/components/ui/**',
        'src/main.tsx',
        'src/lib/utils.ts',
      ],
    },
  },
});
```

> **Note**: keep `vite.config.ts` separate so the dev server is unaffected.

---

## 4. Add the setup file and a tsconfig for tests

Create [src/test/setup.ts](src/test/setup.ts):

```ts
// filepath: src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
```

Extend [tsconfig.app.json](tsconfig.app.json) with `vitest/globals` types so `describe`, `it`, `expect` are available without imports:

```jsonc
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## 5. Add scripts to `package.json`

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

Run `pnpm test` once to confirm the runner is wired up (expect "No test files found" — that's fine for now).

---

## 6. Seed tests for the existing untested code

Create one test file per module. Aim for **fast, focused, table-driven** tests with no real network or storage side effects.

### 6.1 Stores

`src/store/__tests__/finance.test.ts`:
- `addTransaction` prepends a transaction with a UUID
- `addTransactions` prepends N transactions, all with UUIDs
- `updateTransaction` patches only the matching id
- `deleteTransaction` removes the matching id
- `startProcessing(total)` sets `isProcessing: true` and `total`
- `updateProgress(current, fileName)` updates the slice
- `endProcessing()` resets the upload slice to defaults
- `partialize` excludes the `upload` slice from persistence — assert via a `JSON.parse(localStorage.getItem('aether_finance_data'))` mock

`src/store/__tests__/ai-config.test.ts`:
- `getInitialConfig` returns `DEFAULT_CONFIG` when storage is empty
- `migrateLegacyConfig` returns the embedded config when the legacy key has a valid `state.data.config`
- `migrateLegacyConfig` returns `null` when the legacy key is missing, malformed, or lacks the required string fields
- `migrateLegacyConfig` swallows JSON parse errors and logs a warning
- `updateConfig` persists the new config under `aether_ai_config`

### 6.2 Hooks

`src/hooks/__tests__/use-finance.test.tsx`:
- returns the expected shape from the store
- selectors re-render only when their slice changes (use `renderHook` with a counter)

### 6.3 Utils

`src/utils/__tests__/ai-extraction.test.ts`:
- mock `global.fetch` for each case
  - bare array JSON → returns the array
  - fenced ```` ```json [...] ``` ```` block → extracts and parses the array
  - malformed body → throws "AI returned invalid JSON format"
  - HTTP 500 → throws "LM Studio API error: <statusText>"
- `fetchModels`
  - maps `data.data[].id` to a string list on success
  - returns `[]` on failure (does not throw)

`src/utils/__tests__/export.test.ts`:
- `toJSON` envelope: keys are exactly `schemaVersion`, `exportedAt`, `source`, `count`, `transactions`; `count` equals `transactions.length`
- `toCSV` header row is exactly `id,date,description,amount,category,account_id,type,status`
- `toCSV` prepends `\ufeff` BOM
- `toCSV` quotes fields containing `,`, `"`, `\r`, or `\n`
- `toCSV` escapes inner `"` by doubling
- `toCSV` writes CRLF line endings
- `toXML` has the `<?xml version="1.0" encoding="UTF-8"?>` declaration
- `toXML` escapes `<`, `>`, `&`, `"`, `'` in attributes
- `localDateStamp` returns a `YYYY-MM-DD` string in local time

### 6.4 Components (smoke)

`src/components/__tests__/AirtableTable.test.tsx`:
- renders the header progress ribbon only when `upload.isProcessing` is true
- hides the ribbon when `upload.isProcessing` is false
- shows `"Processing <fileName> (<current>/<total>)"` and the right percent

`src/components/__tests__/ExtractionCard.test.tsx`:
- "Upload Image" is disabled while `isProcessing` is true
- selecting a single file calls `extractTransactions` once and `addTransactions` once

Use `@testing-library/user-event` to fire `change` on the hidden file input. Stub `extractTransactions` via `vi.mock('@/utils/ai-extraction')`.

---

## 7. Add a tsconfig include for tests

If your editor complains about test files, ensure the test files are picked up by either:

- extending `tsconfig.app.json` `include` to `["src"]` (already there) and `exclude: []`, or
- adding a separate `tsconfig.test.json` that extends `tsconfig.app.json` with `"include": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]`.

---

## 8. Run the suite

```bash
pnpm test
```

Iterate on failures — common gotchas:

- **`crypto.randomUUID` is undefined in jsdom/happy-dom** → polyfill in `src/test/setup.ts`:
  ```ts
  import { vi } from 'vitest';
  if (!('randomUUID' in globalThis.crypto)) {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: vi.fn(() => 'test-uuid'),
    });
  }
  ```
- **`TextEncoder`/`TextDecoder` missing** → add `import 'vitest-canvas-mock'` or rely on `happy-dom`'s built-ins.
- **`localStorage` is shared between tests** → call `localStorage.clear()` in `afterEach` (already in the setup above).

---

## 9. Update the README

Add a "## Tests" section to [README.md](README.md):

```md
## Tests

\`\`\`bash
pnpm test              # run once
pnpm test:watch        # watch mode
pnpm test:coverage     # with v8 coverage
\`\`\`

Tests live next to the code under test as `__tests__/*.test.ts(x)`. Coverage is configured to exclude the shadcn `ui/` primitives.
```

---

## 10. Add a CI hook (optional but recommended)

If you later add GitHub Actions, include:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm lint
- run: pnpm test
- run: pnpm build
```

---

## Completion checklist

- [ ] `pnpm test` exits 0
- [ ] Coverage report shows stores, hooks, utils covered
- [ ] `pnpm build` still succeeds
- [ ] `pnpm lint` is clean
- [ ] README has a Tests section

After this skill finishes, every future change should use a follow-up skill (or the `lazy-finance-add-feature` meta-skill) that **adds tests alongside any code change**, satisfying the project's mandatory test policy.
