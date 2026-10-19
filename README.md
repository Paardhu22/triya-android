# Triya Manager — Android

The Expo Android client for the PG/co-living management system in
`../triya-manager`. It uses the web application's PostgreSQL database and
business actions for occupancy, tenants, collections, invoices, complaints,
expenses and property settings. There are no seeded accounts or simulated
business writes in the app.

## Local setup

1. In `../triya-manager`, run `npm run dev:local` to use the existing
   `triya-postgres` Docker database. This preserves its properties, tenants and
   files and leaves the cloud `.env` configuration unchanged. Use `npm run dev`
   instead when your configured database connection works.
2. During development Android automatically uses Metro's hostname with port
   3000 for the backend. An optional `EXPO_PUBLIC_API_URL` overrides this; set it
   to the **server origin**, without `/api`. The Android emulator needs
   `http://10.0.2.2:3000`. A physical phone on Wi-Fi needs a reachable LAN address.
3. Run `npm install` and `npx expo start --android`.
4. Select your existing account and use the same password as Triya Manager web.

The three active local properties are Cozy Gowlidoddy, Frieden Co-Living and
Joystayz. The Android client loads them from the backend; it does not recreate
them or seed replacement data.

Deploy the backend changes in this workspace before pointing the app at a
hosted server. Production API URLs should use HTTPS. Expo public environment
variables are bundled into the app; never put credentials or server secrets in
these variables. Restart Metro after changing the URL.

The added SecureStore, image/document picker, filesystem and sharing modules
require rebuilding an existing native development/release build. The Android
bundle export validates JavaScript; it does not produce an installable APK.

## USB-connected Android phone

If Expo Go reports **Failed to download remote update**, the phone may not
be able to reach the computer's advertised Wi-Fi address. Enable USB debugging,
connect and authorize the phone, then run:

```bash
npm run android:usb
```

This forwards Metro and the local backend over USB. It uses a dedicated Metro
port (8082), binds localhost on IPv4, and advertises only localhost, then opens
Expo Go with `exp://127.0.0.1:8082`. Keep this terminal running. USB forwarding
is restored automatically when the phone reconnects; accept the debugging
authorization prompt if Android shows one. The backend on port 3000 is selected
automatically when no API URL override is set. Remove an old LAN/emulator URL
from `.env.local`, or set `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000`, and restart
Metro after changing it. Use `ANDROID_SERIAL` when several phones are
connected, or `TRIYA_METRO_PORT` to choose another Metro port.

If Expo Go closes immediately after downloading the bundle, check SDK package
compatibility with `npx expo install --check`; use `npx expo install --fix` to
install the recommended versions, then restart Metro with its cache cleared.
This project uses Reanimated 4.5.1 and Worklets 0.10.1 with Expo Go 57.0.9.
The older animation packages caused a native Hermes/Worklets startup crash.

If USB forwarding is listed but downloads still fail, restart the Android SDK's
ADB server (`adb kill-server`, then `adb start-server`) and rerun the USB launcher.
This repaired a stale ADB connection on the Samsung test device; the launcher
restores both Metro and backend forwarding.

## Stack and behavior

Expo SDK 57, React Native 0.86, React 19, Expo Router, TypeScript, Reanimated,
and the web application's blue/cool-neutral palette with Manrope.

Native sign-in tokens live in Expo SecureStore. Server sessions expire after
30 days, can be revoked on sign-out, and check the account and property on
requests. Browser preview keeps tokens only in memory. The mobile API is
intended for native clients; cross-origin browser previews require a
same-origin proxy or explicit backend CORS configuration.

Reads load an authenticated, property-scoped snapshot into memory and derive
screen view models from it. Writes call existing backend actions, then
invalidate the snapshot. Pull-to-refresh and returning to the app reload data.
Switching properties remounts the authenticated navigator; sign-out clears
personal and financial data from memory. Offline business writes are not
supported.

The dashboard includes occupied/available directories with search and floor
filters. Floors use the same schematic rooms, bed status colors, doors and
corridors as the web app, with scrolling and zoom on phones. Property logos and
tenant photos resolve through authenticated file access. Upload types and size
limits come from the backend. Android uses the shared local/Supabase storage
driver through the API; storage credentials stay on the server.

## Checks

```bash
npx tsc --noEmit
npx eslint .
node --import tsx scripts/check-ui-models.ts
npm run check:runtime
npx expo export --platform android
```

The integration suites use an **isolated local database named
`mobile_api_test`**, never the normal application database:

1. Apply `triya-manager` migrations to that disposable database.
2. Apply migrations and start the backend on port 3109 with both `DATABASE_URL`
   and `DIRECT_URL` pointing there, `STORAGE_MAX_FILE_MB=2`, a disposable
   `STORAGE_LOCAL_DIR`, and WhatsApp credentials disabled.
3. From `triya-manager`, run:
   `DATABASE_URL=<isolated-local-url> npx tsx scripts/check-mobile-api.ts`.
4. From this project, run:
   `EXPO_PUBLIC_API_URL=http://127.0.0.1:3109 npx tsx scripts/check-data.ts`.

The backend suite clears only the guarded disposable database. It verifies
real authentication, role/property access, paise conversion, partial/split
collections, deposits, receipts, KYC uploads, file access and session revocation.
The Android suite checks the resulting screen view models, reports, filters,
CSV escaping and cache clearing.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for delivered features and remaining work.
See [PERFORMANCE_REVIEW.md](PERFORMANCE_REVIEW.md) for the latest functionality
checks, performance measurements and remaining profiling work.
