# UTM Google access

The app permits verified Google Workspace accounts with an exact `@utm.my`
email and Google's `hd = utm.my` identity claim. This proves control of a UTM
Workspace account; it does not prove a current employment role. If UTM gives
these accounts to non-staff, add an administrator-managed staff allowlist or
connect an authoritative staff directory before describing access as staff-only.
There is no password or manual registration flow. The first Google sign-in
creates the underlying Supabase user record automatically.

## Enforcement

- Google `hd=utm.my` and `prompt=select_account` make choosing an account easier.
  They are hints, not the access control.
- The UI verifies the current user with `auth.getUser()` and checks the confirmed
  email and provider-owned identity. Editable `user_metadata` is never trusted.
- `before_utm_user_created` rejects new external/non-Google accounts.
- `utm_access_token` checks the canonical user and Google identity on every OAuth
  login and refresh, rejecting existing external users too. It adds the signed
  top-level `utm_access: true` claim. Only `supabase_auth_admin` can invoke hooks.
- Restrictive RLS policies require the same identity on every app-table request,
  in addition to existing ownership policies. The internal security-definer
  helper has no user-id argument and only checks `auth.uid()`.
- The documents bucket is private. Storage RLS also requires that the first path
  segment matches the caller's user ID. Signed URLs last one hour and should be
  treated as bearer links until they expire. Existing rows/files are preserved.
- The Python service validates Supabase JWT signature, issuer, audience, expiry,
  session ID, authenticated role, exact email domain and the trusted hook claim
  before generation or MPP processing. `/health` remains public. Tokens remain
  usable until expiry; RLS reads the current identity for database operations.

## Deployment order

1. Apply `supabase/migrations/20260923164838_restrict_utm_google_access.sql`.
2. Enable the two PostgreSQL hooks in Supabase Authentication → Hooks, or PATCH
   the Management API `/v1/projects/<ref>/config/auth` using the exact fields in
   `supabase/auth-hooks.json`. Do not replace the full auth configuration.
3. Deploy frontend and backend from the same commit. The backend adds the pinned
   PyJWT crypto dependency. Its default public `SUPABASE_URL` matches production;
   set `SUPABASE_URL` explicitly for other environments. No service-role key or
   Google secret belongs in the frontend.
4. Existing sessions may need a refresh or Google login. The gateway retries an
   authorization rejection once after refreshing. It never automatically
   replays an ambiguous failed generation POST.

Applied to production project `znbekksnzycpfitbgtgt` on 2026-09-24 (MYT): both
hooks enabled, the migration recorded, the bucket made private, and six
restrictive policies verified. Read-only checks confirmed all four existing UTM
accounts pass and the existing personal account fails. Data was not deleted.
The security advisor reports no database warnings; its remaining leaked-password
warning is unrelated to this Google-only app (email/password login is disabled).

## Verification

```sh
npm --prefix web run build
npm --prefix web/qa run check
node web/qa/auth.smoke.mjs
# From backend/, with requirements plus httpx installed:
python -m unittest discover -s tests -v
```

The backend suite signs real test JWTs and checks valid access, bad signatures,
expired/wrong-audience/wrong-issuer tokens, missing hook claims, profile metadata
spoofing, external domains, unauthenticated endpoints and verification outages.
Browser checks use isolated mocks and do not log in to real Google accounts.
Production SQL was tested in rolled-back transactions, including existing UTM
and external identities, ownership and storage checks under the authenticated
role, hook privileges, and lookalike domains. A full Google consent redirect
still requires a real authorized account.

For incident diagnosis, inspect Auth hook errors and token refreshes first.
Do not resolve login failures by removing RLS, making the bucket public, or
trusting editable profile data. Disabling a hook alone does not remove the
RLS/backend restrictions and does not constitute a complete rollback.

References: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[Supabase Auth hooks](https://supabase.com/docs/guides/auth/auth-hooks),
[custom access-token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook).
