# feat/quoting: session notes (2026-10-14, updated 2026-10-15)

Working notes for the quoting tool (cotizaciones). Branch: `feat/quoting`.

## Status

| Area | State |
|---|---|
| Code | Done, not committed |
| Production build (`next build`) | Passes |
| Lint (new files) | Clean. The full repo has 23 errors / 26 warnings, all in files not touched on this branch |
| Types (`npx tsc --noEmit`) | 1 error, in the existing Clients page (generated `.next/dev/types/app/admin/clients/page.ts`); none from this branch |
| Visual match vs `docs/cotizaciones/cotizacion-ejemplo.html` | Verified (see below) |
| DB migration | Applied and recorded (`migrate status` reports up to date) |
| Supabase bucket `quotes` | Being created (private, 10 MB, `application/pdf`); confirm it exists |
| `CHROME_EXECUTABLE_PATH` in `.env.local` | Pending |
| End-to-end test in the app | Pending |

## Next steps (resume here)

1. Confirm the `quotes` bucket exists in Supabase Storage (private).
2. Add to `.env.local`:
   ```
   CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   ```
3. Restart the dev server (`npm run dev`), since `next.config.ts` and the env changed.
4. Test `/admin/cotizaciones`:
   - New quote → Guardar. The first folio should be **#1000**, and the PDF is generated on save.
   - Ver PDF, Enviar (share sheet, or download + WhatsApp), edit + save (PDF regenerates), Eliminar.
   - Check that the preview and the PDF look identical.
5. On a Vercel preview deploy, check PDF generation: Chromium bundle size, cold start, the 60s `maxDuration`. The `quotes` bucket and the migration must exist on whichever DB/project production uses.
6. Commit when ready.

## What was built

- **Pages:** `/admin/cotizaciones`, same layout as Contratos: a "Nueva cotización" card that expands inline, a search card, and quote cards that expand into the editor. `/admin/cotizaciones/[id]` still works full-page. `/admin/cotizaciones/nueva` still exists but nothing links to it anymore.
- **Access:** owner, tech and admin roles. Owner/tech see every quote; admins only their own (`createdById` = their `AdminUser.id`). Enforced in the list query and in every `[id]` route (GET/PUT/DELETE, PDF GET/POST) plus the `[id]` page; a quote that isn't yours returns 404.
- **Editing (2026-10-15):** no side form. Fields live on the template (`InlineField`, passed into `QuoteDocument` through its optional `edit` prop). Clicking a field opens a small popover with a normal input that updates the document live: Enter or click outside to finish, Tab/Shift+Tab to move to the next/previous field, Esc to undo. Hovering a field fades in a light highlight and drops the underline a little; both animations respect reduced motion. Empty = yellow underline, filled = green underline (text-decoration only, so nothing overlaps or moves); a counter shows how many are missing. Values shown twice on the template stay in sync. "Incluye" items are edited in place, with ↑ ↓ ✕ on hover and "+ Agregar item"; their parts are optional (gray dashed when empty). "Editar / Vista previa" toggle shows the clean PDF look. Every value is typed by hand, with no calculations; money without `$`. Client and hotel are required to save.
- **Calendars (2026-10-15):**
  - **Fechas de viaje** opens a hotel-style range calendar: click the arrival, then the return (hover previews the range). It writes the text as "7 al 10 de enero 2027", "28 de febrero al 3 de marzo 2027" or "28 de diciembre 2026 al 3 de enero 2027".
  - The picked dates are also stored as `data.travelRange` (ISO, validated in `parseQuoteData`; not shown on the PDF) so the calendar reopens on them.
  - **Liquidación:** clicking DIC, 17 or 2026 opens one date picker that fills all three.
  - **Salida / Regreso times:** clock picker with hour buttons (1–12), quick minutes every 5 plus an exact-minute box, and AM/PM. Writes "7:09 AM" live.
  - **Salida / Regreso dates:** single-date calendar, written as "7 ene". When empty, it opens on the month of the travel dates (arrival for Salida, return for Regreso).
  - The code is in `DateFields.tsx` and `lib/quotes/dates.ts`. It's custom, with no new dependency, because the app only used native date inputs.
- **Auto-filled (2026-10-15):**
  - **Vendedor** is locked. The server sets it on every save from the session: the creator's username, or email if there's no username. Edits keep the original creator. Any value sent from the client is ignored.
  - **Fecha de cotización** is set to today ("15 de octubre 2026", Mexico City time) when the quote is created, and shown as plain text with no box. It isn't editable on the template.
  - **Folio:** an unsaved quote shows the expected next folio, read from `Quote_folio_seq` without consuming it. The real folio is still assigned by the DB on save.
- **Stars:** clickable 1–5 selector right next to the subtitle on the template; click the current value to clear it.
- **Folio:** assigned by the DB on first save, starting at 1000, unique and never reused.
- **PDF:**
  - Every save regenerates it with headless Chrome from the same React component as the preview.
  - It's uploaded to the private `quotes` bucket.
  - If generation fails, the quote is still saved and **Generar PDF** retries.
  - Ver PDF and Enviar work like contracts.
  - PDFs are only served through the authenticated `/api/admin/quotes/[id]/pdf` route.
- **Fonts:** Manrope (body) and Philosopher (display). To change them later, edit `lib/quotes/fonts.ts` and swap the files in `public/fonts/`.
- **Logo:** reuses `public/logoalvvaz.png`, which is byte-identical to `docs/cotizaciones/logo-alvvaz.png`.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Rendering | React component (`components/quotes/QuoteDocument.tsx`), not Mustache | No new dependency; one component for preview and PDF |
| Styles | Inline styles copied 1:1 from the template; only font families swapped | `next/font` serves fonts under hashed names, so plain `'Manrope'` would not match |
| Tailwind interference | Scoped reset (`QUOTE_DOCUMENT_RESET_CSS`): `line-height: normal`, `box-sizing: content-box`, default font smoothing | Tailwind's base styles would otherwise change spacing |
| PDF engine | `puppeteer-core@25.11.0` + `@sparticuz/chromium@153.0.0` (exact pins, about a month old) | Only option that matches the HTML 1:1 and supports the contract-style Generar/Ver/Enviar flow; redrawing with `pdf-lib` would drift |
| PDF on edit | Regenerated automatically on every save | Never stale |
| Storage | New private bucket `quotes` (override with `SUPABASE_STORAGE_BUCKET_QUOTES`) | Keeps quotes separate from contracts |
| DB | Prisma `Quote` model; all template fields stored in a `data` JSON column; `folio`, `clientName`, `hotelName` as columns for search | Template fields can change without new migrations |
| Stars in reference | The reference example renders no stars (bug in the sample); the template intends them | Stars are rendered; the selector controls them |

## Files

**New**
- `components/quotes/QuoteDocument.tsx`: the template as a React component
- `lib/quotes/types.ts`: types, default "Incluye" items, input validation (`parseQuoteData`)
- `lib/quotes/dates.ts`: calendar date helpers (travel range text, liquidation parts)
- `lib/quotes/fonts.ts`: font stacks for preview and PDF, plus PDF font files
- `lib/quotes/render-pdf.ts`: HTML builder (fonts and logo embedded) + headless Chrome render
- `lib/quotes/db.ts`: Prisma list/get/create/update/delete
- `lib/quotes/storage.ts`: PDF generate/upload/download/remove
- `app/api/admin/quotes/route.ts`: GET list, POST create
- `app/api/admin/quotes/[id]/route.ts`: GET, PUT, DELETE
- `app/api/admin/quotes/[id]/pdf/route.ts`: GET stream, POST regenerate
- `app/admin/cotizaciones/`: `layout.tsx`, `page.tsx`, `nueva/page.tsx`, `[id]/page.tsx`, `QuotesList.tsx`, `QuoteEditor.tsx`, `QuotePreview.tsx` (builds the edit slots), `InlineField.tsx` (text fields + shared popover), `DateFields.tsx` (calendars), `StarRating.tsx`
- `prisma/migrations/20261014120000_add_quotes/migration.sql`: **already applied; do not edit** (its checksum is recorded)
- `public/fonts/Manrope-Variable.ttf`, `Philosopher-Regular.ttf`, `Philosopher-Bold.ttf`, `Philosopher-Italic.ttf` (SIL Open Font License)

**Modified**
- `prisma/schema.prisma`: `Quote` model
- `package.json` / `package-lock.json`: the two PDF packages
- `next.config.ts`: `serverExternalPackages` for Chromium/Puppeteer; `outputFileTracingIncludes` so the quote routes ship Chromium, react/react-dom, fonts and logo
- `proxy.ts`: admin-role allowlist gets `/admin/cotizaciones` and `/api/admin/quotes`
- `app/admin/AdminNav.tsx`: "Cotizaciones" nav item
- `README.md`: "Admin Cotizaciones" section
- `todo.md`: pending items

**Untracked from before:** `docs/cotizaciones/` (design handoff files), `todo.md`.

## Database work done

What we found:
- **No automated migration pipeline.** The build only runs `prisma generate`.
- **Prisma CLI didn't see `DATABASE_URL`.** It reads `.env`, not `.env.local`.
- **`DATABASE_URL` uses the Supabase transaction pooler** (port 6543, `pgbouncer=true`), which `prisma migrate` doesn't support. Migration commands need the session pooler (same host, port 5432).
- **`20260512120000_add_contract_general_notes` was never recorded**, but its column already existed (it was added by hand in May). `migrate deploy` would have failed on it.

What was applied, in the Supabase SQL editor, in one transaction:
1. Recorded the May migration in `_prisma_migrations` (checksum = SHA-256 of its `migration.sql`). No ALTER was run.
2. Ran `add_quotes`: the `Quote` table, unique `folio` index, `createdAt` index, and the folio sequence restarted at 1000.
3. Recorded `add_quotes` in `_prisma_migrations`.
4. Enabled RLS on `Quote` (no policies).

Verified afterwards (read-only): both migrations are recorded with matching checksums, the table and 3 indexes exist, the sequence's next value is 1000, RLS is on with 0 policies, and `prisma migrate status` reports "Database schema is up to date!".

**Why RLS is on:**
- The anon key is public (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, used for promotions and magazine uploads).
- Without RLS, `Quote` would be readable through Supabase's API.
- The app is unaffected: Prisma connects as `postgres`, which bypasses RLS. All other public tables also have RLS on.

**How to run Prisma migrate commands with the current env** (loads `.env.local`, switches to port 5432 for that command only, never prints the URL):
```bash
node --env-file=.env.local -e 'const u=new URL(process.env.DATABASE_URL);u.port="5432";u.searchParams.delete("pgbouncer");require("child_process").execSync("npx prisma migrate status",{stdio:"inherit",env:{...process.env,DATABASE_URL:u.toString()}})'
```
(`migrate status` exits non-zero when migrations are pending; that is expected.)

If production uses a different Supabase project, check `migrate status` there first and apply the same way.

## Verification done

- **Pixel diff vs the reference** (headless Chrome screenshots at 2x):
  - Server PDF HTML: 0.012% of pixels differ.
  - In-app preview, rendered with the app's compiled CSS and `next/font`: 0.021% differ.
  - Both differences come only from the `→` glyph in the flight labels (font subset vs full font file, sub-pixel shift, not visible).
- **PDF:** one page, 612×792 pt (US Letter).
- **`next build`:** passes; traced files for the quote routes include Chromium, `react-dom/server`, the fonts and the logo.
- **`npm audit`:** no new issues from the added packages.

## Gotchas

- **Next.js blocks `react-dom/server` in route handlers.** `lib/quotes/render-pdf.ts` loads it at runtime with a bundler-ignored dynamic import, and `next.config.ts` traces `react`, `react-dom` and `scheduler` so it ships to Vercel.
- **Chrome is locked down during PDF render:** request interception blocks every non-`data:` URL. Fonts and logo are embedded as data URIs.
- **Do not edit `prisma/migrations/20261014120000_add_quotes/migration.sql`.** Its checksum is recorded in the DB.
- **Never run `prisma migrate dev` or `supabase db reset --linked` against the remote DB.**

## Found along the way (tracked in todo.md)

- `app/contratos/[id]/pdf/route.ts` has no auth check; anyone with a contract id can download that contract's PDF.
- The contracts bucket may be public (`getPublicUrl` is used).
- `next@16.1.1` has critical `npm audit` advisories, including proxy/middleware bypasses. Upgrade.
- Migration hygiene: add `DIRECT_URL` + `directUrl`; never apply schema changes by hand; Supabase CLI adoption is deferred (plan in `todo.md`).
