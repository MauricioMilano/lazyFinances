# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

# Testing (mandatory)

- Unit tests are required for every feature, bug fix, and development task.
- Use the `lazy-finance-add-tests` skill when bootstrapping or expanding the test suite.
- Before marking any task done, run `pnpm test` and `pnpm typecheck`; both must exit 0.

# Security (mandatory)

- Before marking any task done, run `pnpm cve:full-audit`. CRITICAL findings block the task; HIGH findings require an explicit `## Security Overrides` block in the change's `design.md`.
- Active changes must carry a `## Security Considerations` section in both `proposal.md` and `design.md`; `pnpm cve:scan-proposal` enforces this.
- Every commit is gated by a `pre-commit` hook (managed by `simple-git-hooks`) that runs `pnpm cve:scan-staged`. Use `git commit --no-verify` only in emergencies and document the reason in the change's `design.md`.
- See [[docs/cve-methodology.md]] for the severity ladder, gate mapping, and override path.
