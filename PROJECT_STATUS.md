# Triya Android status

Updated 19 October 2026.

The Android application now uses `../triya-manager` as its backend. The
retired mock generator, seeded credentials, synthetic payments/invoices,
simulated delivery outcomes and mock-only checks have been removed.

## Delivered in this update

- Confirmed all three real local properties remain active: Cozy Gowlidoddy,
  Frieden Co-Living and Joystayz. No application records were removed or reseeded.
- Updated branding, login account picker, canvas/navigation colors and dashboard
  stat layout to follow the current web UI. Occupied/available directories support
  search, floor filters, tenant links and navigation to the relevant floor.
- Replaced floor tiles with the web-style schematic plan: wood rooms, corridors,
  windows, doors, individual bed status markers, scrolling and zoom. Bed taps open
  tenant/check-in sheets; room taps open room details.
- Connected property logos and tenant photos to authenticated private file URLs.
  The existing local/Supabase backend storage driver handles files; Android now
  reads its allowed MIME types and configured upload size from the session API.
- Added `triya-manager`'s `dev:local` command to use the existing Docker database
  without modifying cloud configuration. Blank optional integration keys no
  longer prevent startup. Android defaults to Metro's host on backend port 3000.
- Real email/password login; native token persistence with Expo SecureStore;
  session restoration/loading state, expiration handling and server revocation.
- Backend `/api/mobile` endpoints for sessions, property-scoped snapshots,
  actions, documents and short-lived file URLs. Existing Prisma `Session`
  rows hold token hashes; no new database migration is needed.
- Server-enforced account status, property ownership and role permissions.
  The existing browser Auth.js flow remains supported by the shared actions.
- Live dashboard, floor/room views, tenants, rent collections/reports,
  invoices, complaints, expenses and settings. All money crosses the mobile
  boundary in integer paise, with explicit conversion for web actions that
  accept rupees. The mobile net-deposit field preserves the existing reserve rule.
- Coalesced snapshot loads, stale-response protection, mutation invalidation,
  foreground/pull refresh, cache clearing on sign-out and property switches.
- Real camera/gallery picks, check-in KYC photos, typed tenant document
  uploads, expense receipts, and opening stored documents/invoice PDFs.
- Native expense date picking; vendor, amount, date-range, receipt and sort
  filters; category/subcategory CRUD for admins/managers.
- File-based CSV exports for the filtered tenants, expenses and rent reports.
  Exports escape quoted/newline content and neutralize spreadsheet formulas.
- Retry/missing-record states for detail screens, floors, reports and rent
  collection; loading feedback while restoring a session; form resets and
  loading animations updated for the current React lint rules.
- Existing Manrope/blue/cool-neutral UI retained and extended with the same
  components and touch patterns.

## Architecture

### Functionality and performance review, 19 October

- Removed hardcoded login accounts; account-load failures now offer retry and
  manual email entry without inventing a successful response.
- Focused screens and visible sheets own subscriptions and refreshes. Hidden
  screens stop computing view models. Query input changes hide the previous
  floor, month or record while the new query loads.
- Property switches and mutation invalidation cancel obsolete snapshot requests.
  File URL signing coalesces duplicate requests, and stored images include the
  current account/property in their resolution scope.
- Indexed relations and receipt totals once per snapshot, preserving integer
  paise calculations. Bounded notification formatting to the newest 100 records.
  Local notification read markers no longer reload the property snapshot.
- Invoice previews subscribe to current data; expense forms and notifications
  show loading/retry states. Stable callbacks and memoization keep opening a bed
  sheet from redrawing the floor SVG.
- Imported only the used icon family and Manrope weights: exported assets fell
  from 5.85 MB to 2.89 MB. The existing standalone startup animation is retained.

Verified TypeScript, lint, Android Hermes export, 202 geometry/upload checks,
new deterministic runtime regressions, 51 backend and 14 Android integration
checks against a disposable database, browser flows, and read-only Samsung
SM_S938B navigation. See `PERFORMANCE_REVIEW.md` for measurements and limits.

```
screens → hooks → src/data view models + volatile snapshot
                 ↓ fetch /api/mobile
triya-manager → authenticated mobile context → existing actions / Prisma
```

`src/data/client.ts` owns HTTP transport and request scope. `db.ts` holds only
real server rows in memory; `queries.ts` derives screen shapes and `actions.ts`
forwards writes. Native services handle secure storage, media and file sharing.
The snapshot covers one property's history and is currently fetched as a unit;
very large properties would benefit from paginated feature-specific endpoints.

The notification screen is an activity feed derived from actual payment and
complaint records. Read markers last for the current app session. Push delivery
and server-persisted read markers are not implemented.

## Verification

- TypeScript checks for both clients/backend changes.
- Android lint and lint of changed/new backend code.
- Android Hermes export.
- 51 real backend integration checks using an isolated local PostgreSQL database.
- 14 Android data/view-model integration checks against that server.
- 202 geometry/upload-policy checks.
- Browser smoke check at phone dimensions using the real local backend: all three
  properties, dashboard vacancy directory, floor plan, zoom and bed check-in sheet.
  No browser page errors. This checks presentation and web interaction, not native
  Android gestures or permissions.

On 18 October, Android crash logs identified a SIGSEGV in Hermes/Worklets during
startup. Updated the project to Expo 57.0.30, React Native 0.86.3, Reanimated 4.5.1,
Worklets 0.10.1 and the other SDK-recommended packages. Expo's compatibility check
now passes. Cleared Metro's cache and restarted a stale ADB server that had also
prevented USB downloads.

Verified on the Samsung SM_S938B with Expo Go 57.0.9: the app loads, restores its
session, displays all three real properties and opens the live dashboard. No new
native or JavaScript errors were logged during this check. The phone disconnected
before the floor-navigation check completed. Permission dialogs, camera/gallery,
native share sheets and the remaining screen interactions still need testing.
The USB launcher uses IPv4 localhost on port 8082 and restores forwarding when
the phone reconnects.
No production deployment or live-data mutation was performed.
The configured cloud database connection is currently rejected by Supabase.
Local development works against the existing Docker database. Live Supabase
storage uploads require working cloud credentials and have not been verified.

## Remaining work

- Mobile admin surface for staff/property/structure management; desktop import.
- Expense PDF export and dedicated month/year shortcuts.
- Push notifications and persistent activity read markers.
- Offline persistence/queueing, dark theme and tablet layouts.
- Native device smoke testing and release APK/AAB build.

See the README and `.env.example` for backend URL and development setup.
