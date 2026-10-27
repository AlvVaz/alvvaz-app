# Analisis issues

Problems found in the contract filtering on `/admin/comisiones` (Analisis). Nothing has been fixed yet.

Files involved:
- `app/admin/comisiones/page.tsx` (data loading, cache)
- `app/admin/comisiones/AnalysisFilters.tsx` (Mes / Año / Asesor / Desde-Hasta controls)
- `app/admin/comisiones/AnalysisDashboard.tsx` (filtering, KPIs, charts, per-asesor lists)

## Confirmed in code

- [ ] **Mes and Año selects change the filter on focus.** `AnalysisFilters.tsx` lines 160-169 and 191-198 call `router.push` in `onFocus`, before the user picks anything.
  - In Año or Rango mode, clicking or tabbing into Mes jumps to the current calendar month.
  - In Rango mode, clicking Año drops the date range and switches to year mode.
  - After choosing "Todos", clicking Mes again jumps back to the current month.
  - In year mode, focusing Año triggers a navigation to the same URL.
- [ ] **Canceled contracts are counted as "pendientes" per asesor.** `AnalysisDashboard.tsx` lines 456-460: anything that isn't signed or paid goes to `pending`, canceled included. The top Pendientes KPI (lines 423-428) only counts `status === "pending"`, so the two numbers disagree. Canceled contracts also count toward each asesor's "N contratos", the "Acumulado" amount, and the header count (line 804). The Viajes Completados section (lines 589-594) already excludes canceled.
- [ ] **Asesor dropdown is missing users.** `page.tsx` line 46 only loads `admin` and `owner` roles. The contract form's organizer list (`app/admin/contratos/page.tsx` lines 48-56) includes every role, `tech` too. Contracts organized by a tech user can't be filtered, and an `?admin=` value for one silently falls back to "Todos" (`AnalysisDashboard.tsx` lines 313-316).
- [ ] **Name matching differs between sections.**
  - The main filter uses `normalizeOrganizerName` (lines 161-171): trim and lowercase, plus one hardcoded Miguel alias.
  - Viajes Completados uses `normalizeCurrentSeller` (lines 193-228): aliases and accent stripping, but only for a hardcoded list of 3 sellers (lines 580-582).
  - Results:
    - The same person can show up as two rows in "Contratos por asesor" (e.g. "Luis" vs "luis gutierrez", or accent variants), and the asesor filter misses the variants.
    - A seller outside the hardcoded list never appears in Viajes Completados.
    - Renaming a username leaves that person's older contracts under the old name.
- [ ] **Status changes reach Analisis late.** `app/api/admin/contracts/[id]/status/route.ts` doesn't call `revalidateTag(ADMIN_COMMISSIONS_CACHE_TAG)`, and that's the route the status buttons use (`app/admin/contratos/ContractStatusButtons.tsx` line 43). Analisis can show the old status for about 30s, and the first load after expiry can still be stale.
- [ ] **Changing asesor applies unconfirmed range dates.** `AnalysisFilters.tsx` lines 129-132 build the URL from the local Desde/Hasta inputs, not from the applied `rangeFrom` / `rangeTo`. Dates typed without pressing Aplicar get applied when the asesor changes.

## Depends on existing data (check the DB)

- [ ] **Slash dates are read as month first.** `parseReservationParts` (`AnalysisDashboard.tsx` lines 59-71) reads `05/03/2026` as May 3, not March 5. The contract form saves `YYYY-MM-DD`, so only older rows stored as `DD/MM/YYYY` would be affected.
- [ ] **Contracts without a reservation date are excluded from every filter.** Lines 391-392 drop rows where `reservationDate` can't be parsed. The import route saves `reservationDate: null` (`app/api/admin/contracts/import/route.ts` line 179). The import form isn't rendered anywhere right now, so this only affects contracts imported earlier. Those appear only in Viajes Completados, at $0 (`totalPrice` is also null).

To check: count contracts with a null or slash-formatted `reservationDate`, and list the distinct `seller` / `organizer` values against the `AdminUser` usernames.

## Minor

- [ ] **Charts cap at 12 months.** For ranges longer than 12 months, `getMonthBuckets` (lines 134-153) keeps only the last 12, while the KPIs count the whole range.
- [ ] **One-sided range shows the "apply" message.** With only Desde or only Hasta set, the page shows "Selecciona un rango y presiona aplicar" even after pressing Aplicar.
- [ ] **No check that Desde is before Hasta.** An inverted range just shows "No se encontró data".
