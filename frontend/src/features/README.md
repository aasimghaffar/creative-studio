# features/

Feature-based modules live here. Each feature is self-contained:

```
features/
└── billing/
    ├── api/           # API calls for this feature
    ├── components/    # Components used only by this feature
    ├── hooks/         # Feature-specific hooks
    ├── stores/        # Feature-specific Zustand stores
    ├── schemas/       # Zod schemas + React Hook Form types
    ├── types.ts
    └── index.ts       # Public API — other code imports ONLY from here
```

Rules:
- Features may import from `@/components`, `@/lib`, `@/hooks` (shared code).
- Features must NOT import from other features' internals — only via their `index.ts`.
- Pages compose features; features never import pages.
