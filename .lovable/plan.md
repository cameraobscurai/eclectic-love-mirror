## Problem

Template's import-protection plugin denies any client-reachable import from `src/server/**`. All eight `*.functions.ts` files under `src/server/` are imported by routes/hooks/components → every one is breaking the build. Confirmed in dev-server log: `Denied by file pattern: **/server/**`.

## Fix

Move every `*.functions.ts` out of `src/server/` into `src/lib/` (client-safe location, where `createServerFn` splitting works). Keep `*.server.ts` helpers where they are — those are server-only and only imported by the functions files.

### Files to move

```text
src/server/admin.functions.ts             → src/lib/admin.functions.ts
src/server/archive.functions.ts           → src/lib/archive.functions.ts
src/server/colors.functions.ts            → src/lib/colors.functions.ts
src/server/insights.functions.ts          → src/lib/insights.functions.ts
src/server/inventory-images.functions.ts  → src/lib/inventory-images.functions.ts
src/server/migration.functions.ts         → src/lib/migration.functions.ts
src/server/studio.functions.ts            → src/lib/studio.functions.ts
src/server/style-brief.functions.ts       → src/lib/style-brief.functions.ts
```

### Files staying put

`src/server/_audit.server.ts` and `src/server/migration.server.ts` stay — they're not client-reachable. Update the relative imports inside the moved functions files from `./_audit.server` → `@/server/_audit.server` (and same for migration.server).

### Update import sites

Rewrite `@/server/<name>.functions` → `@/lib/<name>.functions` in:
- `src/routes/admin.incoming.tsx`
- `src/routes/admin.image-qa.tsx`
- `src/routes/admin.tsx`
- `src/routes/admin.colors.tsx`
- `src/routes/admin.insights.tsx`
- `src/routes/admin.studio.tsx`
- `src/routes/studio.index.tsx`
- `src/routes/studio.$token.tsx`
- `src/hooks/use-style-board.ts`
- `src/components/admin/admin-shell.tsx`
- `src/components/admin/ImageOrderEditor.tsx`

(Plus any other hits from a final ripgrep sweep.)

### Revert archive.functions.ts audit shape

While moving, restore the simpler `import { audit } from "@/server/_audit.server"` at top-level (matches sibling `inventory-images.functions.ts`). The dynamic-import workaround from the previous turn isn't needed once the file is in `src/lib/`.

## Verify

After moves + rewrites: dev server should transform all three failing routes cleanly. No more `Denied by file pattern: **/server/**`.
