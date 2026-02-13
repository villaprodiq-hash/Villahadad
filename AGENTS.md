# Villa Hadad V2 - AI Agent Guidelines

This document outlines the coding standards, workflows, and architecture for the Villa Hadad V2 project. All AI agents must follow these guidelines.

## 🏗 Project Overview
**Villa Hadad V2** is a photography studio management system built with **Electron**, **React**, **TypeScript**, and **Supabase**.
- **Frontend**: React 18, Vite, Tailwind CSS v4, Framer Motion.
- **Backend/Data**: Supabase (Cloud), SQLite (Local via Capacitor), React Query.
- **State Management**: Zustand.
- **Forms**: React Hook Form + Zod.
- **Testing**: Vitest.

## 🛠 Commands

### Build & Run
- **Development**: `npm run dev` (Default), `npm run dev:manager`, `npm run dev:reception`.
- **Build**: `npm run build` (Production build).
- **Package (Electron)**: `npm run package:mac` (Builds .dmg for macOS).

### Quality Control
- **Lint**: `npm run lint` (ESLint).
- **Fix Lint**: `npm run lint:fix`.
- **Format**: `npm run format` (Prettier).
- **Type Check**: `npm run build` (Run tsc checks before emit).

### Testing
- **Run All Tests**: `npm test` (Vitest).
- **Run Single Test**: `npx vitest run src/tests/your-test-file.test.ts`.
- **Watch Mode**: `npx vitest`.

## 📐 Code Style & Conventions

### TypeScript
- **Strict Typing**: No `any`. Use `unknown` if necessary and narrow types.
- **Interfaces**: Use `interface` for object shapes and `type` for unions/intersections.
- **Props**: Define component props as `interface ComponentNameProps`.

### React Best Practices
- **Functional Components**: Use `const Component = () => {}` syntax.
- **Hooks**: Custom hooks for logic reuse (`src/hooks/`).
- **State**: 
  - Use **Zustand** for global client state (`src/stores/`).
  - Use **React Query** for server state/data fetching.
  - Avoid `useEffect` for derived state; use `useMemo` or derive during render.
- **Performance**: Use `React.lazy` and `Suspense` for route-based code splitting (as seen in `App.tsx`).

### Styling (Tailwind CSS)
- **Utility First**: Use Tailwind utility classes.
- **Conditional Classes**: Use `clsx` or `tailwind-merge` (via `cn` utility if available) for dynamic class names.
- **V4**: Note we are using Tailwind v4, so some config might differ from v3 (CSS-first config).

### File Structure & Naming
- **Colocation**: Group related files (Component, Test, Styles if any) together or in feature folders.
- **Feature Folders**: `src/components/{manager, reception, admin}`.
- **Naming**: 
  - Components: `PascalCase.tsx`
  - Hooks: `useCamelCase.ts`
  - Utilities: `camelCase.ts`
- **Imports**: Use relative imports for now (e.g., `./components/...`) unless `@/` alias is strictly enforced and working.

### Error Handling
- **Boundaries**: Use `<ErrorBoundary>` for component-level catching.
- **Validation**: Use **Zod** for schema validation (forms, API responses).
- **Notification**: Use `sonner` (`toast`) for user feedback.

### Comments & Language
- **Codebase Language**: The code logic is English, but **business logic comments are in Arabic**. Maintain this pattern for high-level descriptions.
- **Documentation**: Write clear JSDoc for complex functions.

## 🧪 Testing Guidelines
- **Unit Tests**: Test utility functions and hooks.
- **Component Tests**: Test user interactions and state changes.
- **Database**: Mock SQLite/Supabase calls in tests unless running integration tests.

## ⚠️ Critical Rules
1. **Never suppress TypeScript errors** with `@ts-ignore` or `as any` without extremely good reason and comments.
2. **Verify imports**: Ensure imported paths exist.
3. **Clean Code**: Remove unused imports and variables (Linter will catch this).
4. **Data Integrity**: Always validate inputs with Zod before sending to Supabase/SQLite.
