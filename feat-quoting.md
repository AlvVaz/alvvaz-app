# feat/quoting: session notes (2026-10-14, updated 2026-10-18)

Working notes for the quoting tool (cotizaciones). Branch: `feat/quoting`.

## Status

| Area | State |
|---|---|
| Quoting tool (3 options, inline editing, auto-fills) | Merged to master: PR #12 (2026-10-15) and PR #13 (2026-10-16, commit `6d479ce`) |
| 2026-10-18 round on `feat/quoting` | Done, **not committed**: quote type (Aéreo / Terrestre), terrestre "Incluye" list and Punto de salida, Menores, client phone, PDF file name, footer line, bigger logo, title label removed, editor page grows to fit |
| Branch vs master | Same code; `feat/quoting` lacks master's 2 merge commits, so merge master in before the next PR |
| DB migration | Applied and recorded. Every later change lives in the `data` JSON column: no new migrations |
| Supabase bucket `quotes`, `CHROME_EXECUTABLE_PATH`, local save + PDF | Working: 5 quotes saved (#1000–#1004), all with PDFs |
| Lint (quote files) | Clean |
| Types (`npx tsc --noEmit`) | Only the existing `searchParams` errors in the Clients and Settings pages (generated `.next/dev/types`); none from the quote code |
| Vercel preview | Not checked yet |

## Next steps (resume here)

1. Review the 2026-10-18 changes in the editor (both types), then commit them on `feat/quoting`.
2. Merge master into `feat/quoting` (only the 2 merge commits), push, and open the PR.
3. On a Vercel preview deploy, check PDF generation: Chromium bundle size, cold start, the 60s `maxDuration`.
4. Waiting on the agency:
   - Terrestre: should "# noches de hospedaje" also show the room type ("…en habitación estándar"), or stop at "4 noches de hospedaje"?
   - Aéreo baggage line ("1 maleta de 15 kg…") and Traslados wording are unchanged and still pending the final text.
5. Later (deferred on purpose): WhatsApp "Enviar" straight to the client's number using `clientPhone`. A wa.me link can open the chat but can't attach the PDF; options are open chat + download, an expiring PDF link in the message, or the WhatsApp Business API.

## What was built

- **Pages:** `/admin/cotizaciones`, same layout as Contratos: a "Nueva cotización" card that expands inline, a search card, and quote cards that expand into the editor. `/admin/cotizaciones/[id]` still works full-page. `/admin/cotizaciones/nueva` still exists but nothing links to it anymore.
- **Access:** owner, tech and admin roles. Owner/tech see every quote; admins only their own (`createdById` = their `AdminUser.id`). Enforced in the list query and in every `[id]` route (GET/PUT/DELETE, PDF GET/POST) plus the `[id]` page; a quote that isn't yours returns 404.
- **Editing (2026-10-15):** no side form. Fields live on the template (`InlineField`, passed into `QuoteDocument` through its optional `edit` prop). Clicking a field opens a small popover with a normal input that updates the document live: Enter or click outside to finish, Tab/Shift+Tab to move to the next/previous field, Esc to undo. Hovering a field fades in a light highlight and drops the underline a little; both animations respect reduced motion. Empty = yellow underline, filled = green underline (text-decoration only, so nothing overlaps or moves); a counter shows how many are missing. A value shown in several places is an input only once (the first spot, e.g. "COSTOS POR # ADULTOS", each card's price, Origen in the subtitle, Habitación on card A); the other places mirror it as plain text with no underline and are skipped by Tab (`repeat` flag on `edit.field` / `edit.option`). "Incluye" items (2026-10-16) are one field each, shown exactly as on the PDF (bold title, detail, red note) with no underline; a light green box shows on hover and while it's open. Clicking one opens a single popover with Título, Detalle and Nota (`IncludeField`). Tab moves through the three boxes, then to the next item; Esc undoes. Reorder by dragging an item onto another (native HTML drag and drop, no library) or Alt+↑/↓ on a focused item; "Quitar item" is in the popover. The blue round "+" next to the "Incluye" heading (tooltip "Agregar nota"; it was a "+ Agregar nota" pill under the list until 2026-10-22) adds one (an empty item shows "Nuevo item"). "Editar / Vista previa" toggle shows the clean PDF look. The page scales to the available width, up to 1.5× its real size, so it's easier to fill in. Values are typed by hand (a few are pre-filled, see below); money without `$`. Client and at least one hotel are required to save.
- **Calendars (2026-10-15):**
  - **Fechas de viaje** opens a hotel-style range calendar: click the arrival, then the return (hover previews the range). It writes the text as "7 al 10 de enero 2027", "28 de febrero al 3 de marzo 2027" or "28 de diciembre 2026 al 3 de enero 2027".
  - The picked dates are also stored as `data.travelRange` (ISO, validated in `parseQuoteData`; not shown on the PDF) so the calendar reopens on them.
  - **Liquidación:** clicking DIC, 17 or 2026 opens one date picker that fills all three.
  - **Salida / Regreso times:** clock picker with hour buttons (1–12), quick minutes every 5 plus an exact-minute box, and AM/PM. Writes "7:09 AM" live.
  - **Salida / Regreso dates:** single-date calendar, written as "7 ene". When empty, it opens on the month of the travel dates (arrival for Salida, return for Regreso).
  - The code is in `DateFields.tsx` and `lib/quotes/dates.ts`. It's custom, with no new dependency, because the app only used native date inputs.
- **Auto-filled (2026-10-15):**
  - **Vendedor** comes from the session: the creator's username, or email if there's no username. Edits keep the saved value. Owner/tech can pick another admin; the picker leaves out the names in `HIDDEN_QUOTE_VENDORS` (`lib/quotes/db.ts`, added 2026-10-22). Quotes that already have a hidden admin as Vendedor keep that name when saved.
    - Admins see it locked; any value they send is ignored by the server.
    - Owner and tech (2026-10-16) can click it and pick another admin from a list. The server only accepts names of existing admin users (`resolveQuoteVendor` in `lib/quotes/db.ts`).
  - **Fecha de cotización** is set to today ("15 de octubre 2026", Mexico City time) when the quote is created, and shown as plain text with no box. It isn't editable on the template.
  - **Folio:** an unsaved quote shows the expected next folio, read from `Quote_folio_seq` without consuming it. The real folio is still assigned by the DB on save.
- **Filled from other fields (2026-10-16):** so the same info is entered once (`lib/quotes/derived.ts`, applied in `QuoteEditor`). Each value is refilled only when its source changes, so it can still be edited by hand.
  - Picking **Fechas de viaje** fills Salida / Regreso dates and Noches. The other way works too: once both Salida and Regreso are set, editing either fills Fechas de viaje and Noches (Regreso uses the first matching date on or after Salida, so trips across New Year work). Whichever was edited last wins.
  - **Liquidación** = Salida date − N days, where N is the "21 días antes de la salida" number in the sidebar (editable since 2026-10-22, `data.liquidationDays`, default 21; quotes saved before load as 21; the "liquidado N días antes del viaje" note mirrors it, "1 día" singular). Refilled whenever Salida or N changes (directly or through Fechas de viaje). Salida has no year ("7 ene"), so the year closest to the trip start is used, or the next upcoming one when there are no trip dates.
  - **Reserva con** = Mínimo por persona × pasajeros (adultos + menores, by head count; 2026-10-21, was adultos only). Mínimo por persona is typed only in the "1 Con $… como mínimo por persona" note; the white card shows it as a mirror, and Reserva con is calculated, not editable, blank until both the amount and the head count are filled, and not counted in "Faltan X de Y". Saved quotes keep their stored total until one of those three values is edited.
  - **Incluye**: the default "Vuelos directos" item gets its route from Origen / Destino ("CDMX / HMO / CDMX"), and the hospedaje item from Noches + Habitación ("5 noches de hospedaje en habitación junior suite"). Only those two default items are linked (`auto` marker on the item); added or other items are never changed. Quotes saved before this keep their fixed text. While their fields are empty, the editor shows grey hints in those two items ("Origen / Destino / Origen", "# noches … Tipo de habitación"); the PDF never shows them.
  - Money fields (each option's price, Reserva con, Mínimo por persona) get thousands commas as you type ("24908" → "24,908").
  - Existing quotes don't change until one of those sources is edited.
- **New quote starts from the latest one (2026-10-22):** like contracts, picking a type in "Agregar" pre-fills the new quote from the latest quote of that type the user can see (highest folio; a search doesn't change which one). Trip, flights, dates, options (hotels, stars, prices, plans), Incluye, monto por persona, liquidación and currency carry over; client name/phone, adultos, menores, ages and Reserva con start empty, the date is today and the Vendedor is the current admin. A note above the editor says which folio it was copied from. No quote of that type yet = empty template. `createQuoteDataFrom` in `lib/quotes/types.ts`.
- **Quote type (2026-10-18):** "Agregar" on the list first asks for the type: **Aéreo** or **Terrestre**. Closing the panel goes back to the chooser. Saved as `data.kind` (`"aereo"` | `"terrestre"`), fixed once created; quotes saved before this load as aéreo. Same folio series and same template for both; terrestre only changes the SALIDA / REGRESO icon (bus instead of planes) and the default "Incluye" list (`DEFAULT_QUOTE_INCLUDES.terrestre`, from the agency: transporte primera clase con seguro de viajero, plan todo incluido, alimentos, barra libre, a pie de playa, impuestos y propinas, deportes acuáticos no motorizados, and the auto "# noches de hospedaje" line). No route line on terrestre. Items stay fully editable like on aéreo. Terrestre also has an optional **Punto de salida** (`data.meetingPoint`) inside the SALIDA card ("Punto de salida: Central de Autobuses SLP, andén 5"); hidden on the PDF when empty, never shown on aéreo, not counted in "Faltan". The list shows an Aéreo / Terrestre badge next to each folio. No migration.
  - **Internacional (2026-10-22):** third type in the "Agregar" chooser (globe icon). Same template as aéreo (plane icons, route line); starts in USD (the currency picker can switch it) and with aéreo's "Incluye" list (`DEFAULT_QUOTE_INCLUDES.internacional`) until the agency sends its own list. Shows an "Internacional" badge in the list. No flight times: SALIDA and REGRESO show only the date, and the times aren't counted in "Faltan" (`QUOTE_HIDDEN_FIELDS`). Each card's name field says "Nombre del viaje" instead of "Nombre del hotel" (editor placeholder only; still stored as `hotelName`). No migration.
- **Currency (2026-10-21):** the "MXN" at the end of the "COSTOS POR …" header is a picker (MXN / USD, same popover as Vendedor). It only changes the label in that header, in "RESUMEN … (MXN)" and next to Reserva con; amounts are typed in that currency and never converted. Stored as `data.currency`; new quotes and quotes saved before this are MXN. No migration.
- **Métodos de pago (2026-10-22):** fixed block in the sidebar under "Liquidación del viaje", same on every quote type and not editable (`PAYMENT_METHODS` in `QuoteDocument.tsx`): efectivo en oficinas, transferencia, depósito en banco / Oxxo / Farmacias Guadalajara, tarjeta de crédito en oficina (+ comisión bancaria, light blue). Kept compact (10px) and a few sidebar gaps were tightened (COTIZACIÓN 34→28px, RESUMEN rows 8→5px, Reserva/Liquidación 18/16→14px, bottom padding 32→28px) so the sidebar still fits 4 options on page 1 (measured: 1 option 94px free, 4 options 10px free, 5 options overflow). In the PDF each column now only stretches to its own content (`.quote-main` in `QUOTE_DOCUMENT_PRINT_CSS`), so a sidebar running onto page 2 no longer drags the main column's closing lines with it.
- **Top spacing (2026-10-22):** the main column's top padding went 40px → 28px (same as its bottom) and the title lost its 6px top margin, saving 18px. Measured main-column fit after it: 3 options 46px free, 4 options 18px over, 5 options 82px over.
- **Hotel options (2026-10-16):** only hotel name, stars and price change between options. Everything else (title, dates, flights, room type, includes, deposit) is shared and entered once.
  - **Any number of options (2026-10-21):** a new quote starts with option A only. The green round "+" next to the "Elige tu favorita" heading (tooltip "Agregar opción D"; it was a centered "Agregar +" pill until 2026-10-22) adds the next letter (up to Z, `QUOTE_MAX_OPTIONS = 26`); the × on a card removes it while there's more than one, and the letters after it move up. Badge colors repeat navy / blue / light blue (D is navy again). Blank options are dropped by `parseQuoteData`, so an added letter left empty disappears on save, and quotes saved with empty B/C (from when every quote had three) load with just their filled options.
  - **Multi-page PDF (2026-10-21):** when the options don't fit on one letter page, the PDF continues on a second (or third) page instead of cutting off the bottom. Chrome paginates the document: cards, "Incluye" rows, the deposit note and the closing block never split, section headers stay with their first row, and the main column's padding repeats on each page. The dark sidebar is a fixed band printed on every page (`QUOTE_DOCUMENT_PRINT_CSS`; needs a transparent `<body>` in `render-pdf.ts`); if the sidebar summary itself runs past page 1 it continues over that band. Measured: aéreo fits 3 short hotel names on one page (3 long names already overflowed before and now go to page 2); terrestre fits 4 short. The editor shows a dashed "Página 2" line at each 1056px; it's approximate because the PDF moves a whole card down rather than splitting it, and the editor has extras the PDF doesn't (hints, buttons, Tel.).
  - **Menores (2026-10-18):** optional input next to Adultos in "COSTOS POR # ADULTOS Y # MENORES". On the PDF it only shows when it's above 0 ("2 ADULTOS Y 1 MENOR"; singular/plural handled), in that header and the sidebar summary. "por los N pasajeros" = adultos + menores ("por 1 pasajero" for one). Reserva con also counts menores since 2026-10-21 (it used adultos only before). **Edades (2026-10-21):** ages are typed in the Menores popover in the "COSTOS POR" header, right below the number (the boxes appear and follow the count as it's typed; `MinorsField`), or later from the "(edades)" field in the sidebar line (`MinorAgesField`). Both show one box per menor ("Menor 1 [#] años", digits only, up to 20) and edit the same values. The PDF prints them in that line only: "RESUMEN · 2 ADULTOS Y 2 MENORES (5 Y 8 AÑOS) (MXN)" ("1 AÑO" for a single 1-year-old; ages not typed are left out). Each empty age counts in "Faltan X de Y". Stored as `data.minorAges` (JSON, no migration); ages past the current Menores count are kept, so lowering and raising it restores them. Not counted in "Faltan X de Y" (`QUOTE_OPTIONAL_FIELDS`).
  - **Client phone (2026-10-18):** optional "Tel." field under the client name. Editor only: never printed on the PDF or shown in Vista previa, not required to save, and not counted in "Faltan X de Y" (`QUOTE_OPTIONAL_FIELDS`). Stored in `data.clientPhone`; no migration.
  - Layout: free-text trip title ("Viaje a Cancún", no small label above it since 2026-10-18), client + vendor row, flights, "Elige tu favorita" (was "Opciones de hotel" until 2026-10-22; the subtitle under the title dropped its "· elige el hotel que más te guste" ending the same day, now just "N noches con salida desde X"; its "COSTOS POR …" label drops to its own line, right-aligned, when both don't fit) with one card per option (badge, hotel, stars, "Habitación X · Plan Todo Incluido", price), then "Incluye · consulta con tu ejecutivo para más detalles" (label was "en todas las opciones" until 2026-10-22; rows with separator lines, as in the original template). The sidebar summary lists each option's total. With the 9 default includes it fits one page with up to two hotel names that wrap to 2 lines; more than that continues on a second page (see "Multi-page PDF" above). The page ends with the line "Consulta las políticas generales con tu ejecutivo AlvVaz." (2026-10-18).
  - Stored as `data.options` in the JSON column, so no migration. The `hotelName` column holds every option's hotel joined with " · " for the list and search.
  - Removed from the template: Destino/ubicación, Ciudad de origen, Asientos de avión, the chips row and the "Plan Todo Incluido" pill (the plan text is now on each card). Since 2026-10-22 that text is editable per option (`option.plan`, optional, not counted in "Faltan"): new options and quotes saved before start with "Plan Todo Incluido"; when cleared the card shows just "Habitación X".
  - Quotes saved before this load their single hotel as option A.
- **Stars:** clickable 1–5 selector next to each option's hotel name; click the current value to clear it.
- **Folio:** assigned by the DB on first save, starting at 1000, unique and never reused.
- **PDF:**
  - Every save regenerates it with headless Chrome from the same React component as the preview.
  - It's uploaded to the private `quotes` bucket.
  - If generation fails, the quote is still saved and **Generar PDF** retries.
  - Ver PDF and Enviar work like contracts.
  - File name (2026-10-18): `folio-cliente-título.pdf`, e.g. "1004-ALBERTO-FIN DE AÑO CANCUN.pdf" (`buildQuotePdfFileName`); empty parts are skipped and characters not allowed in file names are dropped. The download header sends the UTF-8 name (accents kept) plus an ASCII fallback. The stored copy in the bucket keeps its internal ASCII path.
  - PDFs are only served through the authenticated `/api/admin/quotes/[id]/pdf` route.
- **Fonts:** Manrope (body), Philosopher (display) and Montserrat ExtraBold, uppercase (trip title only; differs from the template). To change them later, edit `lib/quotes/fonts.ts` and swap the files in `public/fonts/`.
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
| DB | Prisma `Quote` model; all template fields stored in a `data` JSON column; `folio`, `clientName`, `hotelName` (the three option hotels joined) as columns for search | Template fields can change without new migrations |
| Stars in reference | The reference example renders no stars (bug in the sample); the template intends them | Stars are rendered; the selector controls them |

## Files

**New**
- `components/quotes/QuoteDocument.tsx`: the template as a React component
- `lib/quotes/types.ts`: types, default "Incluye" items, input validation (`parseQuoteData`)
- `lib/quotes/dates.ts`: calendar date helpers (travel range text, liquidation parts)
- `lib/quotes/derived.ts`: fills values that repeat other info (dates, noches, liquidación, reserva, auto "Incluye" lines, money commas)
- `lib/quotes/fonts.ts`: font stacks for preview and PDF, plus PDF font files
- `lib/quotes/render-pdf.ts`: HTML builder (fonts and logo embedded) + headless Chrome render
- `lib/quotes/db.ts`: Prisma list/get/create/update/delete
- `lib/quotes/storage.ts`: PDF generate/upload/download/remove
- `app/api/admin/quotes/route.ts`: GET list, POST create
- `app/api/admin/quotes/[id]/route.ts`: GET, PUT, DELETE
- `app/api/admin/quotes/[id]/pdf/route.ts`: GET stream (download name `folio-cliente-título.pdf`), POST regenerate
- `app/admin/cotizaciones/`: `layout.tsx`, `page.tsx`, `nueva/page.tsx`, `[id]/page.tsx`, `QuotesList.tsx`, `QuoteEditor.tsx`, `QuotePreview.tsx` (builds the edit slots), `InlineField.tsx` (text fields + shared popover), `DateFields.tsx` (calendars), `StarRating.tsx`
- `prisma/migrations/20261014120000_add_quotes/migration.sql`: **already applied; do not edit** (its checksum is recorded)
- `public/fonts/Manrope-Variable.ttf`, `Montserrat-Variable.ttf`, `Philosopher-Regular.ttf`, `Philosopher-Bold.ttf`, `Philosopher-Italic.ttf` (SIL Open Font License)

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

- **2026-10-16 to 2026-10-18:** every change was checked in the live editor and on the generated PDF with headless Chrome:
  - Page fit: one page with the default includes and up to two hotel names that wrap to 2 lines.
  - Single input per value: an automated pass found no value clickable in two places, for both types.
  - Download name: a real Chrome download keeps accents and ñ ("1004-ALBERTO-FIN DE AÑO CANCUN.pdf").
- **Before the 3-option redesign (2026-10-14/15), against the original one-hotel template:**

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

- `public/fonts/Montserrat-Bold.ttf`, `Montserrat-Regular.ttf` and both `Rubik-*.ttf` are saved GitHub HTML pages, not fonts. The contracts PDF loads the Montserrat ones. (The quotes use `Montserrat-Variable.ttf`, a real font.)
- The Clients and Settings pages type `searchParams` as a plain object; Next 16 expects a `Promise`, so `tsc` fails on them.
- The repo isn't Prettier-formatted; don't run `prettier --write` on existing files.

- `app/contratos/[id]/pdf/route.ts` has no auth check; anyone with a contract id can download that contract's PDF.
- The contracts bucket may be public (`getPublicUrl` is used).
- `next@16.1.1` has critical `npm audit` advisories, including proxy/middleware bypasses. Upgrade.
- Migration hygiene: add `DIRECT_URL` + `directUrl`; never apply schema changes by hand; Supabase CLI adoption is deferred (plan in `todo.md`).
