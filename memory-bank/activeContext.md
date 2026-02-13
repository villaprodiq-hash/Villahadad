# Active Context

## Current Focus
We are executing a **"Deep Architectural Refactor"**.

## Immediate Tasks (The Plan)
1.  **Phase 1 (Dependencies):** Remove `<script type="importmap">` from `index.html` and install all required packages (`react`, `framer-motion`, `lucide-react`, etc.) locally via `npm`.
2.  **Phase 2 (Standards):** Setup `ESLint` and `Prettier` with strict rules.
3.  **Phase 3 (Migration):** Move all root files (`components`, `hooks`, `pages`) into `src/` and fix imports.
4.  **Phase 4 (Testing):** Setup Vitest and create the Database Integrity Test.

## Recent Decisions
- Adopted `src/` folder structure.
- Decided to stick with Local AI (LlamaIndex) instead of Cloud Vector DB for performance.
- Removed Playwright in favor of Vitest + Manual Testing (TestDriver later).