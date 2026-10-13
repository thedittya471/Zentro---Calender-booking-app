# Authentication and session policy

## Decision

Use Better Auth hosted in the Express application, with its Drizzle PostgreSQL adapter. Support Google sign-in and email/password registration and sign-in. The user selected this combination to support hosts without Google accounts. Guests continue to book without an account.

Better Auth provides documented [Express integration](https://better-auth.com/docs/integrations/express) and a [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle). Keeping authentication data in the existing database avoids a separate managed identity service; we remain responsible for upgrades, credentials, abuse controls and recovery. Clerk was considered as a managed alternative but was not selected.

## Application boundary

Express owns the Better Auth instance and handlers under `/api/auth`. Mount the auth handler before body-parsing middleware according to the installed Express version. Next.js uses the browser client and authenticated API calls; it does not host a second auth server or access auth tables directly.

Use the established single public origin. Server rendering forwards the relevant request cookies to the API without caching private responses. API session resolution is authoritative, including for requests that pass frontend route guards. Each private operation also checks resource ownership.

Use the library's user, account, session and verification schema through reviewed Drizzle migrations. Link host application data to a stable internal user ID, never to a mutable email address. Do not implement password hashing, token generation or session cryptography ourselves.

## Sign-in and account policy

- Email/password registration requires email verification before authenticated host access. Disable automatic sign-in after registration. Return generic responses for duplicate registration and password recovery so responses do not reveal account existence.
- Accept passwords of 15–128 characters, allow password-manager paste, and avoid composition rules or silent trimming. Use the library's maintained password hashing implementation.
- Verification links expire after one hour; password-reset links expire after 30 minutes. Reset links are single use. Configure these values explicitly rather than relying on library defaults.
- Successful password reset or password change revokes all existing sessions; the user signs in again. No automatic sign-in after reset. Changes to an existing password require proof of the current password.
- Google sign-in uses the provider's stable identity and verified email claims. Reject identities that cannot establish verified email ownership. Request identity scopes only; sign-in does not grant calendar access.
- Disable automatic linking by email. An existing account must authenticate before explicitly linking a Google identity through the library's supported flow. A matching email alone must not grant access to another account.
- Authenticated profile changes do not change the login email. Login-email changes and additional authentication methods are outside the initial release.

Implementation references: [email/password](https://better-auth.com/docs/authentication/email-password), [Google](https://better-auth.com/docs/authentication/google), and [users and account linking](https://better-auth.com/docs/concepts/users-accounts). These are application requirements, not claims that every requirement is enabled by default.

## Sessions

Use opaque session cookies backed by PostgreSQL records. Set `expiresIn` to seven days and disable session refresh so activity does not extend expiry. Disable session cookie caching and secondary session storage: protected requests check database state, making committed revocation effective on subsequent checks. Never store bearer credentials in localStorage, Zustand or query-cache payloads.

Logout revokes the current session and clears its cookies and private client state. Revoke all sessions on account deletion or credential compromise. A request already authorized before revocation may finish; revocation is not cancellation of in-flight work. Missing, expired or revoked sessions return an unauthenticated response. A database failure denies protected access with a service-unavailable response rather than treating it as a valid or anonymous session.

Require a session created within the last 15 minutes for account deletion and identity linking; otherwise require sign-in again. Keep guest management tokens separate from host sessions.

Better Auth documents expiry, disabling refresh and revocation behavior in [session management](https://better-auth.com/docs/concepts/session-management). Verify these requirements against the pinned library version during implementation.

## Browser and request security

Production session cookies must be HttpOnly, Secure, SameSite=Lax and host-only, with bounded lifetime. Use the library's supported secure cookie configuration, not hand-written token cookies. HTTP localhost may use development-specific cookies; production must enforce HTTPS. See [cookie configuration](https://better-auth.com/docs/concepts/cookies).

Set an explicit auth base URL and exact trusted origins. Preserve the library's OAuth state/PKCE and request-origin protections. For application cookie-authenticated mutations, enforce origin checks and CSRF protection; SameSite alone is insufficient. Allow only local approved return paths, preventing open redirects.

Apply distributed throttling to sign-in, sign-up, reset and verification requests. Redact passwords, cookies, authorization headers, tokens and recovery URLs from logs and error reporting. Keep signing secrets and Google client secrets server-only and separate per environment. Unnecessary provider tokens must not become calendar credentials; any retained sensitive OAuth tokens require protected storage.

## Email dependency and operations

Verification and password recovery require a transactional email provider before email/password access is released. This dependency exists even before booking notifications are implemented. Select the provider and reliable delivery mechanism before enabling registration; do not use unmanaged fire-and-forget work that can disappear on process shutdown. Report delivery failures operationally without revealing account existence.

OAuth credentials, delivery credentials and deployment origins are provisioned outside source control. Pin and review the installed Better Auth/adapter versions and generated schema before release. Backup/restore includes authentication data; recovery must account for sessions previously revoked after a restored snapshot, such as invalidating restored sessions before serving traffic.

## Verification requirements

Check Google and password sign-in, unverified-email rejection, duplicate registration, expired/reused recovery links, password-reset session revocation and blocked automatic account linking. Check fixed session expiry, logout, cross-host authorization, CSRF/open redirects, database failure and production cookie attributes. Test actual authentication against isolated PostgreSQL and provider-controlled test fixtures; public production access requires real OAuth and email smoke checks.

This is an agreed design document. Authentication is not implemented or verified at runtime yet; email provider selection and operational rate-limit settings remain open.
