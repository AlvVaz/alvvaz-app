# TODO

## Security

- [ ] **Contract PDF route has no auth.** `app/contratos/[id]/pdf/route.ts` lives outside `/admin` and `/api/admin`, so `proxy.ts` does not check the session. Anyone with a contract id can download that contract's PDF. Move it under a protected path or add an admin check in the handler.
- [ ] **Contracts bucket may be public.** `app/api/admin/contracts/[id]/pdf/route.ts` calls `getPublicUrl` and stores the result in `fileUrl`. Check in the Supabase dashboard whether the contracts bucket is public. If it is, make it private and serve files only through signed URLs or the authenticated route.

## Database migrations

- [ ] **Adopt Supabase CLI without resetting the DB.** Deferred. Decide first:
  - A) CLI handles only the Supabase-side tables (`contract_transactions`, `transaction_attachments`, `payment_plans`, `payment_installments`), and Prisma keeps the rest.
  - B) CLI takes over the whole schema, and Prisma is used only as the client.

  Safe steps:
  1. Back up the database (`supabase db dump` / `pg_dump`).
  2. Install the CLI with `brew install supabase/tap/supabase`.
  3. Run `supabase init`.
  4. Link the project with `supabase login` + `supabase link`, or skip linking and pass `--db-url` (session pooler, port 5432).
  5. Run `supabase migration list` (read-only). Verify the tables, indexes and policies from both SQL files exist on the remote.
  6. Run `supabase migration repair --status applied 20260511120000 20260513120000`.
  7. Before every real push, run `supabase db push --dry-run`.
- [ ] **Never** run `supabase db reset --linked` or `prisma migrate dev` against the remote DB. The Supabase tables look like drift to Prisma, so `migrate dev` may offer a reset.
- [ ] **Keep the Supabase CLI access token out of the repo.** It has access to every project on the account. Store it as a CI secret (`SUPABASE_ACCESS_TOKEN`) if CI is added.
- [ ] **Clean up the Prisma migration history.**
  - `20260203212904_npx_prisma_migrate_deploy` has a command as its name.
  - `MagazineIssue_sortOrder_idx` is dropped in three migrations: `20260203212904`, `20260203220000` and `20260204021057`.
  - Two migrations are both named `add_trip_prep_stage`.

  Don't rewrite applied migrations. Document the history, or squash it into a baseline later.
- [ ] **Migration history drift.** `20260512120000_add_contract_general_notes` was applied by hand but never recorded. If it's still pending, mark it applied with `prisma migrate resolve --applied 20260512120000_add_contract_general_notes` before running `migrate deploy`. Going forward, always ship schema changes as a migration and apply them with `migrate deploy`, never by hand.
- [ ] **Prisma CLI can't run migrations with the current env setup.** It only reads `.env`, and `DATABASE_URL` in `.env.local` points at the transaction pooler (port 6543), which `prisma migrate` doesn't support. Add a `DIRECT_URL` (session pooler, port 5432) and `directUrl = env("DIRECT_URL")` to `schema.prisma`.
- [ ] **Deploys don't run migrations.** `build` only runs `prisma generate`. Apply migrations by hand, or add a `prisma migrate deploy` step to CI.
- [ ] **Decide what to do with `db/schema.sql`.** It's an old draft schema that nothing uses. Remove it or mark it as legacy.

## Cotizaciones (quoting tool)

Merged to master (PRs #12, #13). Setup is done: `quotes` bucket, migration, `CHROME_EXECUTABLE_PATH`, and local save + PDF all work (5 quotes saved, all with PDFs).

- [x] Create the private `quotes` bucket.
- [x] Apply the `20261014120000_add_quotes` migration.
- [x] Add `CHROME_EXECUTABLE_PATH` to `.env.local`.
- [x] Test saving and PDF generation locally.
- [ ] Commit the 2026-10-18 round on `feat/quoting` (quote types, terrestre list, Punto de salida, Menores, phone, file name, footer line, logo), merge master in, open the PR.
- [ ] On a Vercel preview deploy, check PDF generation (Chromium bundle size, cold start, the 60s `maxDuration`).
- [ ] Ask the agency: on terrestre, keep the room type in "# noches de hospedaje", or drop it?
- [ ] Ask the agency for the final aéreo baggage ("1 maleta de 15 kg…") and Traslados wording.
- [ ] Later (deferred): WhatsApp "Enviar" straight to the client's number (`clientPhone`). A wa.me link can't attach the PDF; pick between open chat + download, an expiring PDF link, or the WhatsApp Business API.

## Code health

- [ ] **Existing lint errors.** `npm run lint` reports 23 errors and 26 warnings, in these files:
  - `app/api/admin/contracts/[id]/pdf/route.ts` (9 errors)
  - `PromotionFields.tsx`, `AddAdminCard.tsx`, `app/page.tsx`
  - `ClientsDashboard.tsx`, `MagazineIssuesManager.tsx`, `MagazineItemsManager.tsx`, `NewIssueForm.tsx`
  - `PromocionesGrid.tsx`, `navbar.tsx`, `themed-select.tsx`
- [ ] **Existing type errors.** `npx tsc --noEmit` fails on the Clients and Settings pages: `searchParams` must be a `Promise` (Next 15+ page props).
- [ ] **Broken font files.** `public/fonts/Montserrat-Bold.ttf`, `Montserrat-Regular.ttf` and both `Rubik-*.ttf` are saved GitHub HTML pages, not fonts. The contracts PDF loads the Montserrat ones, so it likely falls back to a default font. Replace them with the real files from google/fonts.

## Dependencies

- [ ] **Upgrade Next.js.** `next@16.1.1` has critical advisories in `npm audit`, including proxy/middleware bypasses, and `proxy.ts` is what protects `/admin`. Also flagged: `xlsx` (prototype pollution, ReDoS), plus dev-only tooling. All were already there before this branch.
