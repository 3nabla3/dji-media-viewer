# Page Split: `/select` and `/` — Design Spec

**Date:** 2026-04-05

## Overview

Split the current monolithic `app/page.tsx` into two distinct Next.js pages:

- `/select` — folder selection, file parsing, loading and error states
- `/` — the media gallery (Navbar + FilterTabs + MediaGrid)

This makes the two user-facing flows clearly separate at the routing level and removes the multi-branch conditional rendering from a single component.

## Routes

| Route | File | Responsibility |
|---|---|---|
| `/select` | `app/select/page.tsx` | FolderPicker, loading spinner, error alert |
| `/` | `app/page.tsx` | Gallery: Navbar, FilterTabs, MediaGrid |

## Data Flow

1. Fresh visit (or page refresh with no items in context) → `/` immediately redirects to `/select`.
2. User picks a folder on `/select` → `handleFiles` parses the files, sets `items` in `MediaContext`, then calls `router.replace("/")`.
3. If parsing throws → error is shown on `/select`; user can retry without leaving the page.
4. `/` reads `items` from `MediaContext`. If items are absent (e.g. direct URL entry), it redirects to `/select`.
5. `/media/[index]` already redirects to `/` on empty context — no change needed.

## State Management

`MediaContext` is unchanged. `folderName` is removed entirely — it is no longer displayed in the gallery navbar, so no new shared state is needed.

Local state per page:

- `/select`: `loading: boolean`, `error: string | null`
- `/`: `filter: FilterType` (with URL query param sync, as today)

## `app/select/page.tsx` (new)

Extracted from current `app/page.tsx`:

- The centered-stack empty state UI (privacy Alert + FolderPicker)
- The loading spinner state
- The error state
- `handleFiles` logic (parse → setItems → router.replace("/"))

Wrapped in `<Suspense>` (same pattern as today, required for `useSearchParams` / `useRouter` in Next.js).

## `app/page.tsx` (modified)

Retains:

- Filter state + `handleFilterChange` (with `?tab=` query param sync)
- `handleSelect` → `router.push("/media/[index]")`
- Gallery JSX: Navbar, FilterTabs, MediaGrid

Removes:

- `folderName` state and all references
- `handleFiles`
- Loading, error, and empty-state branches
- The `<span>` showing folder name and item count in the Navbar

Adds:

- A redirect to `/select` when `items` is null (replacing the old empty-state branch)
- A "Change folder" link/button in the Navbar pointing to `/select`

## What Does Not Change

- `MediaContext` (`lib/media-context.tsx`) — no modifications
- `app/media/[index]/page.tsx` — no modifications
- `app/layout.tsx` — no modifications
- All components (`FolderPicker`, `FilterTabs`, `MediaGrid`, etc.) — no modifications

## Out of Scope

- Persisting the selected folder across page refreshes (files can't be re-read from a URL)
- Any changes to the media detail page or HDR/panorama processing
