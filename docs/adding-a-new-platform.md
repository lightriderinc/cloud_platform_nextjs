# Adding a new Light Rider platform to SSO

Every Light Rider platform (Cloud, PQC, and whatever comes next) is a separate
Next.js App Router app that shares **one Logto tenant**, so a user signs in once
and is signed in everywhere — and signs out once and is signed out everywhere.

This is the complete checklist. Do the whole thing in one pass. The failure mode
this document exists to prevent is discovering the requirements one error at a
time: a missing redirect URI does not fail at build, it fails as a confusing
runtime redirect rejection, and a missing env var can present as a silent
"signed out" with nothing in the logs.

---

## 0. Decide the two URLs first

Before touching anything, write down:

| Thing | Example (PQC) | Yours |
| --- | --- | --- |
| Production origin | `https://pqc.lightriderinc.com` | |
| Stable Vercel alias | `https://lightriderpqc.vercel.app` | |
| Local dev port | `3000` | |

**Pin the local port.** Every app must have a different, fixed port, set in
`package.json`:

```json
"dev": "next dev -p 3002"
```

Currently allocated: **Cloud = 3001**, **PQC = 3000**. Pick the next free one.

A bare `next dev` picks 3000 and silently walks to 3001, 3002… when taken. That
produces an origin that does not match the registered redirect URI, and the
resulting failure looks nothing like a port problem.

> Never register per-deployment Vercel preview URLs (`*-git-branch-*.vercel.app`).
> They change per branch and you will be re-registering forever. Register the
> stable alias only.

---

## 1. Register the app in Logto

Logto Console → **Applications** → Create → **Traditional Web**.

Copy the **App ID** and **App Secret**.

### Redirect URIs — add all three now

```
http://localhost:<YOUR PINNED PORT>/callback
https://<your-production-domain>/callback
https://<your-stable-vercel-alias>/callback
```

### Post sign-out redirect URIs — add all three now

```
http://localhost:<YOUR PINNED PORT>/
https://<your-production-domain>/
https://<your-stable-vercel-alias>/
```

### Back-channel logout (optional — see §5)

Only if this app has a database to store revoked sessions in:

- **Backchannel logout URI**: `https://<your-stable-origin>/api/webhooks/logto`
- **Is session required**: **ON**

> "Is session required" controls whether Logto includes the `sid` claim in the
> logout token. The webhook handler keys its revocation records on `sid`, so
> with this OFF every logout token is rejected as "missing sid claim". If you
> register the webhook, this toggle is not optional.

---

## 2. Environment variables

These names are **canonical across all platforms**. Do not invent per-app
variants — divergence here has already cost real debugging time.

| Variable | What it is | Same for every app? |
| --- | --- | --- |
| `LOGTO_ENDPOINT` | `https://auth.lightriderinc.com/` | ✅ identical |
| `LOGTO_APP_ID` | This app's Logto App ID | ❌ per app |
| `LOGTO_APP_SECRET` | This app's Logto App Secret | ❌ per app |
| `LOGTO_COOKIE_SECRET` | Random 32 bytes, base64 | ❌ per app, must differ |
| `NEXT_BASE_URL` | **This app's own origin** | ❌ per app *and* per environment |

`NEXT_BASE_URL` is the single canonical name for the app's own origin. There is
no `LOGTO_BASE_URL` — if you find one in an env file it is dead weight from an
early draft and should be deleted.

Generate a cookie secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Set them in every Vercel environment in one pass

`NEXT_BASE_URL` is the one that differs per environment — this is the most
common thing to get wrong:

| Environment | `NEXT_BASE_URL` |
| --- | --- |
| Preview (our staging) | your stable Vercel alias |
| Production | your production domain |
| Development, *if the project has one* | `http://localhost:<pinned port>` |

Not every project here defines a Development environment — several use only
Preview and Production, with Preview serving as staging. Pull from whichever
environment actually exists:

```
vercel link                                          # first time only
vercel env pull .env.local --environment=preview     # or =development
```

> **Then fix `NEXT_BASE_URL` in the pulled `.env.local`.** Pulling from Preview
> brings down the *Vercel alias* as this app's origin, so a locally-running app
> would build `redirect_uri=https://<alias>/callback` while the browser sits on
> localhost — signing in locally would throw you over to the deployed site.
> Set it to `http://localhost:<pinned port>` locally. `.env.local` is gitignored,
> so the override never ships. (`logto.ts` also falls back to the pinned local
> port when the variable is absent, so deleting the line works too.)

Cloud-only extras (do **not** copy unless the app genuinely needs them):
`LOGTO_M2M_APP_ID`, `LOGTO_M2M_APP_SECRET`, `LOGTO_MANAGEMENT_ENDPOINT`,
`LOGTO_PRO_ROLE_ID`, `DATABASE_URL`, `DIRECT_URL`, `STRIPE_*`, `SUPABASE_*`.

---

## 3. Install the auth integration

```
npm i @logto/next
```

Copy these files verbatim from PQC (the smaller, dependency-free reference
implementation — Cloud's versions carry database-backed extras):

```
src/app/logto.ts                          Logto config (edit the dev-port fallback)
src/app/callback/route.ts                 OIDC redirect + login_required handling
src/app/actions/auth.ts                   signIn / signOut server actions
src/lib/auth/session.ts                   getSession, requireLogtoUser
src/lib/auth/silent-sso.ts                Silent-check policy + loop guard
src/app/api/auth/session/route.ts         Cheap auth-state endpoint for polling
src/app/api/auth/silent-check/route.ts    prompt=none initiator
src/components/auth/SessionSync.tsx       Client sync (load / return-to-tab / poll)
src/components/auth/SignInRequired.tsx    Friendly signed-out prompt for gated pages
src/proxy.ts                              Token refresh before RSC render
```

These files are deliberately app-agnostic and identical between apps, so they
can be lifted into a shared package later without rewriting. **Keep them
byte-identical across repos** — if you need app-specific behaviour, add it
outside these files, not inside them.

> If you ever add a NEW cookie here, namespace it with the Logto app id, the
> way `silentSsoCookieName()` does. Cookies are scoped by domain and ignore the
> port, so every platform running on localhost shares one cookie jar: a fixed
> name means one app silently suppresses another's checks. It only breaks local
> development (production hosts have separate jars), which is exactly where it
> is hardest to trust what you are seeing.

Then mount the sync component in `src/app/layout.tsx`:

```tsx
const { isAuthenticated } = await getSession();
// ...
<SessionSync initialAuthenticated={isAuthenticated} />
```

> The root layout must be `async` for this. `SessionSync` is what keeps the
> header from going stale: Next.js does not re-render layouts on client-side
> navigation, so without it, layout-rendered auth UI can disagree with the page
> body indefinitely.

---

## 4. How session sync works (and what to expect)

- **Signed in on another app → this app picks it up automatically.** On page
  load and tab focus, a signed-out visitor is sent through a top-level
  `prompt=none` redirect. If the shared Logto session is alive it comes back
  signed in, with no login screen and no click.
- **Signed out anywhere → this app follows.** A cheap poll catches local and
  back-channel revocations; the `prompt=none` check catches sign-outs that
  happened on a different app.
- **Never an iframe.** The iframe version of this pattern depends on
  third-party cookies and is being broken across browsers industry-wide.

Timings live in `src/lib/auth/silent-sso.ts`. Only the PAGE-LOAD trigger can
re-fire itself unattended, so it carries the strict cooldown (30s signed-out,
10min signed-in). Returning to a tab after being away >=3s cannot spin — it
costs a deliberate tab switch each time — so it re-checks almost immediately
(5s floor). That asymmetry is what makes "sign in on the other platform, switch
back, be recognised at once" work without reopening loop risk.

Two Logto answers matter, and they mean opposite things:

- `login_required` -> there is genuinely no session. Stay signed out, and drop
  any stale local cookie. This is how sign-out propagates.
- `consent_required` -> the user IS signed in; Logto grants scopes per session,
  so an app the user did not sign in through has no grant yet. `prompt=none`
  can never fix this (it is barred from showing UI), so the callback retries
  exactly once WITHOUT `prompt=none`. Do not "simplify" this away — without it,
  whichever app you did not sign in through never syncs.

---

## 5. Optional: instant sign-out via back-channel logout

Requires a database. Skip it if the app has none; `prompt=none` already covers
sign-out propagation, just with a delay rather than instantly.

If you do want it, copy from Cloud:

```
prisma/schema.prisma                        model RevokedLogtoSession
src/lib/logto/backchannel-logout.ts         Logout-token verification + store
src/app/api/webhooks/logto/route.ts         The webhook endpoint
```

and add the revocation check to `getSession`/`requireLogtoUser`.

> Keep ONE code path for "am I signed in?". An earlier version had a cheap
> cookie-only variant alongside `getSession()`; after a revocation the two
> disagreed (cookie still decoded fine, userinfo returned 401), the polling
> endpoint reported signed-in while the UI rendered signed-out, and cross-app
> sign-in propagation silently stopped working.

**Then actually create the table in every database the app talks to:**

```
npx dotenv -e .env.local -- npx prisma migrate deploy
vercel env pull .env.preview --environment=preview
npx dotenv -e .env.preview -- npx prisma migrate deploy
```

The build script is `prisma generate && next build` — it does **not** run
migrations. A missing table here presents as users being silently signed out,
because a failed revocation lookup used to be swallowed. `isSessionRevoked`
now fails open and logs loudly, but the feature still will not work until the
table exists.

---

## 6. Pre-flight checklist

- [ ] Dev port pinned in `package.json`, unique across platforms
- [ ] All 3 redirect URIs registered
- [ ] All 3 post sign-out redirect URIs registered
- [ ] `NEXT_BASE_URL` set correctly in **every** Vercel environment the project
      has (Preview and Production at minimum), AND overridden to
      `http://localhost:<pinned port>` in the local `.env.local`
- [ ] `LOGTO_COOKIE_SECRET` generated fresh (not copied from another app)
- [ ] `SessionSync` mounted in the root layout, layout is `async`
- [ ] A nav entry to the account page that is reachable when signed in (the
      secondary sidebar only appears once you are already under /settings)
- [ ] `npm run dev` → sign in works locally
- [ ] Sign in on another platform, open this one → signed in with no click
- [ ] Sign out on another platform, return to this one → signed out with no click
- [ ] If back-channel logout was registered: "Is session required" is ON **and**
      the migration has been applied to the Preview and Production databases
