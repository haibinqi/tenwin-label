# AGENTS.md - Coding Guidelines for Tenwin Label

## Project Overview

React Router v7 + Cloudflare Pages full-stack label printing system with D1 database.

## Build Commands

```bash
# Development
npm run dev                 # Start dev server

# Build & Deploy
npm run build               # Production build
npm run deploy              # Build + deploy to Cloudflare Pages
npm run start               # Local preview with Wrangler

# Type Checking
npm run typecheck           # Run TypeScript compiler

# Database
npm run db:migrate          # Apply D1 migrations
npm run db:create           # Create D1 database
```

**Note:** No test runner or linter is currently configured. Add tests using Vitest if needed.

## Code Style Guidelines

### TypeScript

- **Target**: ES2022, strict mode enabled
- **Module**: ESNext with Bundler resolution
- **JSX**: Use `react-jsx` transform (no React import needed)

### Imports

- Use path alias `~/` for app imports (e.g., `~/utils/db`, `~/types`)
- Import types separately with `import type { ... }`
- Group imports: 1) external libs, 2) types, 3) internal modules

Example:
```typescript
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getDB } from "~/utils/db";
import type { CodeTemplate } from "~/types";
```

### Naming Conventions

- **Components**: PascalCase (e.g., `Dashboard`, `Layout`)
- **Functions**: camelCase (e.g., `getDB`, `formatDate`)
- **Types/Interfaces**: PascalCase with descriptive names
- **Database**: snake_case for table/column names
- **Files**: camelCase for utils, PascalCase for components

### Types & Interfaces

- Define shared types in `app/types.ts`
- Use explicit return types on exported functions
- Prefer `interface` over `type` for object shapes
- Use union types for literal values (e.g., `'一维码' | '二维码'`)

### React Router Patterns

- Use `loader` for data fetching with D1 database
- Access DB via `getDB(context as { DB: D1Database })`
- Use `useLoaderData<LoaderData>()` for type-safe data
- Route files use `_layout.` prefix for nested routes

### Tailwind CSS v4

- Use `@import "tailwindcss"` in CSS files
- Custom theme variables in `tailwind.css` @theme block
- Prefer utility classes over custom CSS
- Use arbitrary values sparingly: `text-[13px]`, `border-[#f1f1f1]`

### Error Handling

- Return typed API responses: `{ success: boolean, data?: T, error?: string }`
- Handle async errors with try/catch in actions/loaders
- Use null checks for optional database fields

### Database (D1)

- Use parameterized queries with `.bind()`
- Use `Promise.all()` for parallel queries
- Implement methods in `Database` class in `app/utils/db.ts`

### File Organization

```
app/
  routes/
    _layout.tsx              # Root layout
    _layout._index.tsx       # Dashboard
    _layout.templates.tsx    # Template management
    _layout.batches.tsx      # Batch generation
    _layout.history.tsx      # History
    print.$batchId.tsx       # Print preview (non-layout)
  utils/
    db.ts                    # Database class & helper
  types.ts                   # Shared TypeScript types
  root.tsx                   # App root component
  routes.ts                  # Route configuration
  tailwind.css               # Tailwind + custom styles
```

### Environment

- Cloudflare bindings accessed via `context.DB` and `context.CACHE`
- Configure in `wrangler.toml`
- Use `compatibility_flags = ["nodejs_compat"]`

## Key Conventions

1. Always type the `context` parameter in loaders/actions
2. Use Chinese for UI text (target audience)
3. Use Material Symbols for icons
4. Keep components focused; extract helpers to `utils/`
5. Use `Promise.all()` for concurrent DB operations
