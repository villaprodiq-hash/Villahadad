# System Patterns

## Architecture Guidelines
- **Directory Structure:** All source code (components, hooks, services, utils) MUST reside inside the `src/` directory.
- **Entry Point:** Vite must point to `src/main.tsx` (or `index.tsx`).
- **Imports:** Use absolute paths (alias `@/`) where possible. No relative paths like `../../../../`.

## Technical Constraints
- **NO CDNs:** Do NOT use `importmap` or `esm.sh`. All packages must be installed via `npm`.
- **Database:** - Use `better-sqlite3` for local operations.
  - Database logic must be isolated in `src/services/db`.
- **Testing:** - Use **Vitest** for Unit/Integration tests.
  - Do NOT use Playwright (removed).
  - Test database integrity using In-Memory SQLite.

## AI & Vectors
- **Strategy:** Local-first Hybrid.
- **Engine:** LlamaIndex (TypeScript version).
- **Storage:** Local file system or embedded Chroma.
- **Sync:** Sync raw data to Supabase, but keep Vector embedding local for speed.