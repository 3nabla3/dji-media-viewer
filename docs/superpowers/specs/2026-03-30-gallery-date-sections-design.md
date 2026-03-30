# Gallery Date Sections Design

## Goal

Group gallery items into labelled date sections (Today, This Week, This Month, This Year, Others), sorted most-recent-first within each section, so users can orient themselves in time without manual filtering.

## Architecture

Four files change or are created:

| File | Change |
|---|---|
| `lib/media-types.ts` | Add `date: Date` to all four `MediaItem` interfaces |
| `lib/media-parser.ts` | Populate `date` at parse time (EXIF for photos/HDR, `lastModified` for video/panorama) |
| `lib/date-sections.ts` | New pure module — `groupByDate()` bucketing + sorting logic |
| `components/MediaGrid.tsx` | Render sections with `<h5>` headers instead of a flat grid |

---

## Data Model

Add `date: Date` to every `MediaItem` variant in `lib/media-types.ts`:

```ts
export interface VideoItem   { type: 'video';    file: File;                    date: Date }
export interface PhotoItem   { type: 'photo';    file: File;                    date: Date }
export interface HdrItem     { type: 'hdr';      files: File[]; middle: File;   date: Date }
export interface PanoramaItem{ type: 'panorama'; htmlFile: File; tiles: File[]; date: Date }
```

`date` represents the capture/creation time used for display and grouping. It is never undefined — the parser always supplies a value.

---

## Parsing (`lib/media-parser.ts`)

`DateTimeOriginal` is already fetched in the EXIF batch parse for all JPGs (it was added for HDR grouping). Reuse that result:

- **PhotoItem**: `date = exif?.DateTimeOriginal ?? new Date(file.lastModified)`
- **HdrItem**: `date = exif of middle file's DateTimeOriginal ?? new Date(middle.lastModified)`
- **VideoItem**: `date = new Date(file.lastModified)`
- **PanoramaItem**: `date = new Date(htmlFile.lastModified)`

No additional EXIF reads are needed.

---

## Grouping Logic (`lib/date-sections.ts`)

```ts
export interface DateSection {
  label: 'Today' | 'This Week' | 'This Month' | 'This Year' | 'Others'
  items: { item: MediaItem; idx: number }[]
}

export function groupByDate(
  items: { item: MediaItem; idx: number }[],
  now?: Date,
): DateSection[]
```

### Bucket algorithm

`now` defaults to `new Date()`. All comparisons use local time.

1. Compute reference values from `now`: year, month, ISO week number, day-of-year.
2. For each item, compare `item.date` against `now` using these rules (checked top-to-bottom, first match wins):
   - **Today**: same year AND same month AND same day-of-month
   - **This Week**: same ISO week year AND same ISO week number (but not Today)
   - **This Month**: same year AND same month (but not This Week)
   - **This Year**: same year (but not This Month)
   - **Others**: everything else
3. Within each bucket, sort items **descending by `date`** (most recent first).
4. Return only non-empty buckets, in the order: Today → This Week → This Month → This Year → Others.

### ISO week helper

```ts
function isoWeek(d: Date): { year: number; week: number }
```

Uses the standard ISO 8601 algorithm (week starts Monday; week 1 contains the year's first Thursday).

### `now` parameter

Injectable for tests. All production callers omit it (defaults to `new Date()`).

---

## Rendering (`components/MediaGrid.tsx`)

1. Apply the active filter to get `visible: { item: MediaItem; idx: number }[]`.
2. Call `groupByDate(visible)` to get sections.
3. Render each section as:
   ```
   <h5 className="text-muted fw-semibold mb-2 mt-4">{section.label}</h5>
   <div className="row row-cols-... g-3">
     {section.items.map(...cards...)}
   </div>
   ```
4. The "no items" empty state is unchanged (shown when `visible` is empty before grouping).

---

## Testing

Tests live in `lib/__tests__/date-sections.test.ts`. Use a fixed `now` value to make tests deterministic.

Cover:
- Item on exactly `now`'s date → Today
- Item 3 days ago (same week) → This Week
- Item earlier in the same month (different week) → This Month
- Item earlier in the same year (different month) → This Year
- Item from a previous year → Others
- Empty sections are omitted from output
- Items within a section are sorted descending by date
- Mixed items land in the correct sections
- ISO week boundary: item on last day of previous week → This Month or This Year (not This Week)
