# Triya Manager — Android

The official native Android app for **Triya Manager**, the PG / co-living
management system. Property staff manage occupancy (floor → room → bed),
tenants, rent collections, WhatsApp invoices, complaints and expenses —
always scoped to one active property.

The web application (`../triya-manager`, Next.js + Prisma) is the source of
truth for business logic, terminology and design; this app is its mobile
counterpart, not a redesign. Current build runs on realistic mock data with
the API swap isolated to one layer — see [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Stack

- **Expo SDK 57** (React Native 0.86, React 19, New Architecture + React Compiler)
- **Expo Router** file-based navigation
- **TypeScript** (strict)
- **Reanimated 4** for motion
- **Sora** brand typeface

## Run it

```bash
npm install
npx expo start        # scan the QR with Expo Go / dev build
npx expo start --android
```

Sign in with a seeded account, e.g. **Triya Admin / Admin@12345** (admins
pick a property; property managers land straight on their dashboard).

## Checks

```bash
npx tsc --noEmit                 # types
npx eslint .                     # lint
npx tsx scripts/check-mocks.ts   # mock-layer invariants
npx expo export --platform android  # bundle smoke test
```

## Where things live

- `src/app` — routes · `src/screens` — feature UI · `src/components` —
  design system · `src/mocks` — data layer (the API swap point) ·
  `src/theme` — tokens ported from the web app · `src/utils` — shared
  business rules (money in integer paise, 15-day notice, invoice totals)

Full architecture, feature checklist and integration notes:
[PROJECT_STATUS.md](PROJECT_STATUS.md).
