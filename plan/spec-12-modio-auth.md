# Spec 12 - mod.io OAuth Authentication

## Goal

Allow users to log in with their own mod.io account via OAuth so the app no longer
depends on a build-time embedded API key. Once authenticated, the access token is used
for all mod.io API calls instead of the static key.

---

## Context

The current implementation reads a mod.io API key from a `modio-config.local.js` file
injected at build time (`globalThis.MODIO_API_KEY`). This works for development but is
not suitable for a public release because it requires the key to be bundled or kept out
of source control by each builder.

mod.io supports OAuth 2.0 Device Flow (no redirect URI required — ideal for desktop apps):
1. App requests a device code from mod.io.
2. App shows the user a URL + code to visit in a browser.
3. App polls mod.io until the user approves.
4. mod.io returns an access token.
5. All subsequent API calls use `Authorization: Bearer <token>` instead of `?api_key=`.

Reference: https://docs.mod.io/#email-authentication (Device/email OTP flow)

---

## Acceptance Criteria

### AC-01 mod.io auth service

- Add `modio-auth.service.ts` with pure, injectable functions:
  - `requestEmailCode(email, apiKey, fetchFn)` — POST to mod.io email auth endpoint.
  - `exchangeEmailCode(email, code, apiKey, fetchFn)` — POST security code, return access token string.
- Both functions throw on non-2xx HTTP responses.
- Service is fully unit-tested with injected fetch stubs.

### AC-02 Persist access token in settings

- Add `modioAccessToken: string` to `AppSettings` (default: `''`).
- Add `modioEmail: string` to `AppSettings` (default: `''`) for display purposes.
- Update `mergeSettings`, `DEFAULT_SETTINGS`, and all affected snapshot tests.

### AC-03 Settings page auth UI

- Settings page shows a "mod.io Account" section.
- If no token is stored: show email input + "Send code" button.
  - On submit: call `requestEmailCode`, show a code-entry field + "Verify" button.
  - On verify: call `exchangeEmailCode`, store token in settings, show success state.
- If token is stored: show the stored email and a "Sign out" button that clears token + email.
- Show inline error messages for bad email, bad code, or network failure.
- Loading state on both buttons while async calls are in-flight.

### AC-04 API key resolution priority

- Extract a `resolveModioApiKey(settings)` helper that returns:
  1. `settings.modioAccessToken` if non-empty (Bearer token path).
  2. `globalThis.MODIO_API_KEY` fallback (build-time key).
  3. Empty string if neither is set.
- Replace the inline `getModioApiKey()` function in `mods-page.component.ts` with this helper.
- `fetchModioCatalog` and `fetchAllModioCatalog` already accept `apiKey` — no changes needed there except callers use the resolved value.

### AC-05 Authenticated API calls

- When making mod.io requests with a Bearer token, use `Authorization: Bearer <token>`
  header instead of the `api_key` query parameter.
- Update `buildModioCatalogUrl` and `fetchModioCatalog` to accept an optional `authMode: 'apikey' | 'bearer'` param.
- Tests cover both auth modes.

### AC-06 Safety of existing flows

- If `modioAccessToken` is empty and `MODIO_API_KEY` is also empty, the Online tab
  shows a "Sign in to mod.io to browse mods" prompt instead of an error.
- All existing tests remain green.

---

## Out of Scope

- OAuth redirect URI flow (email/OTP Device Flow only).
- Token refresh (mod.io tokens are long-lived; user can re-auth if expired).
- Account-level subscription sync via authenticated API (next iteration).

---

## Test Files

- `src/app/modio-auth.service.spec.ts` — unit tests for `requestEmailCode` and `exchangeEmailCode`.
- `src/app/settings.persistence.spec.ts` — updated snapshots for new fields.
- `src/app/settings-page.component.spec.ts` — updated snapshots and new auth UI tests.
- `src/app/modio-catalog.service.spec.ts` — new tests for bearer auth mode.

---

## Notes

- mod.io email auth endpoints:
  - Request code: `POST https://g-306.modapi.io/v1/oauth/emailrequest`
    - body: `email=<email>&api_key=<key>`
  - Exchange code: `POST https://g-306.modapi.io/v1/oauth/emailexchange`
    - body: `security_code=<code>&api_key=<key>`
    - returns `{ "access_token": "..." }`
- The game-scoped base URL (`g-306.modapi.io`) is used for all calls.
