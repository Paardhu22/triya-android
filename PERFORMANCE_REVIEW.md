# Android functionality and performance review

19 October 2026. Existing local changes were preserved. No real property,
tenant, payment or document records were edited during verification.

## Fixed

- Login used a hardcoded account list when the server failed. It now loads real
  accounts, reports failures, supports retry and preserves manually entered email.
- Every mounted query subscribed to foreground/database updates, including hidden
  tabs and closed sheets. Only focused screens and enabled sheets now subscribe.
- Query results could temporarily belong to the previous floor, month or tenant.
  Results now carry a query identity, with separate loading and completed-null
  states. Old asynchronous results cannot replace the current query.
- Property switches and writes invalidated responses without cancelling network
  work. Obsolete snapshot requests now abort; concurrent reads still share a fetch.
- Tenant/floor/collection queries repeatedly scanned tenancy and receipt history.
  Snapshot-scoped indexes now resolve relations and monthly collections once,
  retaining exact integer paise, split receipts and earlier-dues calculations.
- Activity formatting visited every receipt and repeatedly searched tenant rows.
  It now formats only the newest candidates and uses a tenant-name index.
- Marking notifications read fetched a full snapshot. Local updates now publish
  directly, including when the network cache has expired.
- Concurrent images signed the same file multiple times. Signing requests now
  coalesce; image resolution also checks account and property scope.
- Invoice previews memoized mutable snapshot data without subscribing to changes.
  They now refresh current data, expose retry states and disable submission while
  fetching. Expense/category and notification loading errors have explicit UI.
- Opening a bed sheet redrew the floor SVG. Stable callbacks and a memoized floor
  plan avoid that work when its data and layout are unchanged.
- Broad icon/font imports bundled unused families and weights. Direct imports
  retain the existing visuals while removing unused assets.
- Checkbox previews exposed a checkbox role without its checked state in the
  browser accessibility tree. Explicit ARIA state now matches the visual state.

## Measurements

Synthetic, test-only property: 600 active tenants and 14,400 paid receipts across
24 billing months. Average of three selector calls on this development computer,
including initial index creation. Timings vary by machine and runtime.

| Query | Before (ms) | After (ms) |
| --- | ---: | ---: |
| Tenant list | 42.04 | 5.48 |
| Full floor layout | 44.43 | 2.18 |
| Collections, including earlier dues | 84.37 | 14.47 |
| Occupancy directory | 4.98 | 0.42 |

Compared Android exports immediately before and after narrowing imports:

| Artifact | Before | After |
| --- | ---: | ---: |
| Asset files | 54 | 34 |
| Asset bytes | 5,848,293 | 2,885,685 |
| Hermes bundle bytes | 5,045,287 | 4,854,628 |

The asset reduction is about 51%. These are exported artifact sizes, not APK
sizes or cold-start measurements.

## Verification

- `npm run typecheck` and `npx eslint .` passed.
- SDK compatibility checked against the installed Expo 57 dependency map.
- `npm run check:runtime` passed: request coalescing, cancellation, stale-property
  protection, invalidation, image signing, malformed responses, refreshed indexes
  and financial arithmetic. The script also runs the synthetic benchmark.
- `npm run check:ui-models`: 202 geometry and upload-policy checks passed.
- 51 backend checks and 14 Android data checks passed using only the guarded
  `mobile_api_test` database and temporary file storage.
- Phone-sized browser checks passed login, tenant search/profile/documents,
  floor/bed navigation, collection empty states, expense/category loading,
  reports, local read markers after cache expiry and property switching. No page
  errors were recorded. A separate simulated outage verified manual login and
  account-list retry without fake fallback accounts.
- Browser check-in persisted a tenant in the disposable database and refreshed
  the floor; the invoice preview loaded the current room charges. A ₹1,000.01
  collection updated the visible ledger. Invoice delivery was explicitly disabled
  and asserted in the request payload, with messaging credentials disabled on the
  test server. No outbound messages were sent.
- On the Samsung SM_S938B with Expo Go, verified restored startup, floor loading
  and zoom/reset, tenant list, collections, expenses, reports, hardware Back and
  return to the loaded dashboard. No JavaScript or Android crash errors appeared
  in the current Expo process log. Native checks only read application records.
- Final Android Hermes export passed (1,994 modules).

## Remaining limits

- A property still downloads its complete history as one snapshot. Very large
  histories will require feature-specific, paginated backend endpoints.
- Cold-start, frame-rate and memory profiling in a release APK remains necessary;
  Expo Go/development runs include development overhead. Selector timings above
  do not measure native frame rate or network latency.
- Native camera/gallery permissions, share sheets and release packaging still
  need dedicated device acceptance checks. Offline writes, push notifications,
  and the remaining admin features retain their existing implementation status.
- Production database/storage credentials and deployment are separate outstanding
  setup work; this review used the local backend.
