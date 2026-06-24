# Operational Tables Upgrade — Obras, Localidades, Prioritários, Histórico OS

Goal: make the operational tables fast, navigable, and editable. Reuse `SimpleTablePage` as the visual base but add real server-side paging/sort/filter, a detail drawer, and create/edit dialogs with validation.

## Scope

In scope:
- Pages: `ObrasPage`, `LocalidadesPage`, `PrioritariosPage`, `HistoricoOsPage`
- Homepage cards (MainHub) → cap to small preview (top N) so they stay fast
- New shared components: detail drawer + form dialogs
- Hooks in `useTabelasOperacionais.ts` → switch to paged queries + mutations

Out of scope:
- Histórico OS: read-only (no create/edit dialog — it's an audit trail). Detail drawer + filters/sort only.
- Caderno/Despacho/Demandas/Documentos: untouched (already have their own UIs).
- Schema changes / new RPCs.

## What gets built

### 1. Shared infra

`src/components/tables/RowDetailDrawer.tsx`
- Right-side `Sheet` showing key/value list for one row
- Slots: title, primary fields, secondary fields, action buttons (Edit, Delete, Close)

`src/components/tables/EntityFormDialog.tsx`
- Generic `Dialog` wrapping `react-hook-form` + `zod`
- Receives schema, default values, submit handler; shared submit/cancel footer

Extend `SimpleTablePage`:
- Per-column `sortable?: boolean` + `accessor` and `filter?: { type: 'text'|'select', options? }`
- Header click toggles sort (asc/desc/none) — single-column sort
- Column filter row beneath header
- `onRowClick` opens detail drawer
- `totalRows` + `serverPaginated` flags so paging reads from the hook, not `rows.length`
- Add a "Novo" button slot in the header area

### 2. Hooks (server-side)

Refactor `src/hooks/useTabelasOperacionais.ts`:

Each list hook becomes paged:
```ts
useObras({ page, pageSize, sort, search, filters })
  → { data: Obra[], total: number, isLoading }
```
Implementation uses Supabase `.range((page-1)*size, page*size-1)` + `.order(sortField, { ascending })` + `.ilike(...)` per filter, with `{ count: 'exact' }`.

Add mutation hooks:
- `useCreateObra`, `useUpdateObra`, `useDeleteObra` (soft delete → `deleted_at = now()`)
- Same trio for `Localidade` and `Prioritario`
- Histórico OS: no mutations

All mutations:
- Validate with zod schema (shared between hook and dialog)
- Optimistic update via `queryClient.setQueryData` on the active page key; rollback on error; final `invalidateQueries`
- Toast success/error

### 3. Entity wiring

For each of Obras / Localidades / Prioritários page:
- Replace client `useMemo` filter+slice with the new paged hook
- Define column meta (sortable, filter type)
- Define zod schema (e.g. Obra: `num_obra` required string, `status` enum-ish text, `sigco` optional int)
- Detail drawer config (which fields render where)
- "Novo" button → opens EntityFormDialog in create mode
- Row click → opens drawer; drawer "Editar" → opens dialog in edit mode; "Excluir" → confirm + soft delete

Histórico OS:
- Server-side paging + sort by `created_at`
- Filters: `num_os` (text), `campo` (text), date range (optional — text input ok for v1)
- Row click → drawer with full before/after values; no edit/delete

### 4. MainHub preview cards

The homepage already renders summary cards. Update to fetch only `pageSize: 5` from the same hooks (cheap), so the homepage stays fast regardless of table size. Each card links to the full `/consulta/...` page.

## Technical details

- Validation: `zod` (already used in project)
- Forms: `react-hook-form` + `@hookform/resolvers/zod` + existing shadcn `Form` primitives
- Sorting state lives in the page component; passed into hook → translated to `.order()`
- Column filters are debounced (300ms) before triggering refetch
- Soft delete pattern matches existing Caderno/Despacho hooks (`deleted_at`, `deleted_by`)
- Permissions: create/edit/delete buttons gated by `useUserRole` — visible only to `admin` / `operador_chefe`, consistent with current app
- Localidade has no `deleted_at` column → hard delete with confirm
- Prioritario has no `deleted_at` either → hard delete with confirm

## File changes

Created:
- `src/components/tables/RowDetailDrawer.tsx`
- `src/components/tables/EntityFormDialog.tsx`
- `src/lib/schemas/operacionais.ts` (zod schemas for obra/localidade/prioritario)

Edited:
- `src/components/tables/SimpleTablePage.tsx` (sort/filter/row-click/total/new-button)
- `src/hooks/useTabelasOperacionais.ts` (paged queries + mutations)
- `src/pages/ObrasPage.tsx`
- `src/pages/LocalidadesPage.tsx`
- `src/pages/PrioritariosPage.tsx`
- `src/pages/HistoricoOsPage.tsx`
- `src/pages/MainHub.tsx` (cards use `pageSize: 5`)

## Open question

Histórico OS is left read-only (it's an audit log). Confirm that's what you want — otherwise I'll add manual create/edit too.
