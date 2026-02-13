---
name: frontend-dev-guidelines
description: Frontend development guidelines for React/TypeScript applications. Modern patterns including Suspense, lazy loading, useSuspenseQuery, file organization with features directory, styling, performance optimization, and TypeScript best practices. Use when creating components, pages, features, fetching data, styling, routing, or working with frontend code.
---

# Frontend Development Guidelines

## Purpose

Comprehensive guide for modern React development, emphasizing Suspense-based data fetching, lazy loading, proper file organization, and performance optimization.

## When to Use This Skill

- Creating new components or pages
- Building new features
- Fetching data with TanStack Query
- Setting up routing
- Styling components
- Performance optimization
- Organizing frontend code
- TypeScript best practices

---

## Quick Start

### New Component Checklist

Creating a component? Follow this checklist:

- [ ] Use `React.FC<Props>` pattern with TypeScript
- [ ] Lazy load if heavy component: `React.lazy(() => import())`
- [ ] Wrap in `<Suspense>` for loading states
- [ ] Use `useCallback` for event handlers passed to children
- [ ] Default export at bottom
- [ ] No early returns with loading spinners

### New Feature Checklist

Creating a feature? Set up this structure:

- [ ] Create `features/{feature-name}/` directory
- [ ] Create subdirectories: `api/`, `components/`, `hooks/`, `helpers/`, `types/`
- [ ] Create API service file: `api/{feature}Api.ts`
- [ ] Set up TypeScript types in `types/`
- [ ] Lazy load feature components
- [ ] Use Suspense boundaries
- [ ] Export public API from feature `index.ts`

---

## Common Imports Cheatsheet

```typescript
// React & Lazy Loading
import React, { useState, useCallback, useMemo } from 'react';
const Heavy = React.lazy(() => import('./Heavy'));

// TanStack Query (Suspense)
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';

// TanStack Router
import { createFileRoute } from '@tanstack/react-router';

// Types
import type { User } from '../types';
```

---

## Core Principles

1. **Lazy Load Everything Heavy**: Routes, DataGrid, charts, editors
2. **Suspense for Loading**: Use Suspense, not early returns
3. **Features are Organized**: api/, components/, hooks/, helpers/ subdirs
4. **No Early Returns**: Prevents layout shift
5. **TypeScript Strict Mode**: No `any` type

---

## Quick Reference: File Structure

```
src/
  features/
    my-feature/
      api/
        myFeatureApi.ts       # API service
      components/
        MyFeature.tsx         # Main component
        SubComponent.tsx      # Related components
      hooks/
        useMyFeature.ts       # Custom hooks
      helpers/
        myFeatureHelpers.ts   # Utilities
      types/
        index.ts              # TypeScript types
      index.ts                # Public exports

  components/
    shared/
      SuspenseLoader.tsx      # Reusable loader
```

---

## Modern Component Template

```typescript
import React, { useState, useCallback } from 'react';
import type { User } from '../types';

interface MyComponentProps {
    id: string;
    onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ id, onAction }) => {
    const [state, setState] = useState<string>('');

    const handleAction = useCallback(() => {
        setState('updated');
        onAction?.();
    }, [onAction]);

    return (
        <div className="p-4">
            {/* Content */}
        </div>
    );
};

export default MyComponent;
```

---

## Performance Optimization Patterns

- `useMemo`: Expensive computations (filter, sort, map)
- `useCallback`: Event handlers passed to children
- `React.memo`: Expensive components
- Debounced search (300-500ms)
- Memory leak prevention (cleanup in useEffect)

---

## TypeScript Standards

- Strict mode, no `any` type
- Explicit return types on functions
- Type imports: `import type { User } from '../types'`
- Component prop interfaces with JSDoc
