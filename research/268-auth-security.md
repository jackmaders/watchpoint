# Issue #268 authentication security findings

## Sources

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [Better Auth options](https://better-auth.com/docs/reference/options)
- [Better Auth session management](https://better-auth.com/docs/concepts/session-management)
- [Better Auth security](https://better-auth.com/docs/reference/security)

## Decisions resolved by security guidance

- Registration gating must be enforced server-side. Better Auth supports disabling email/password sign-up; the application gate should be an explicit server-only configuration value and must not rely on hiding a UI control.
- Public browsing may remain anonymous, but every training start/read/write boundary and ownership query must enforce authentication and authorization on the server.
- Authentication errors should avoid exposing whether an account exists. Use generic externally visible responses and detailed structured server logs only where appropriate.
- Sessions must use the framework's secure cookie/session mechanism, have server-enforced expiry, and be invalidated server-side on logout and expiry. Better Auth defaults to a seven-day session with refresh after its update age; the application should explicitly choose values appropriate to this beta rather than silently relying on defaults.
- Sign-out should revoke the current session. A separate all-device/session-management action is not required by issue #268 unless product scope expands.
- Account identity must be derived from the verified server session, never from a client-supplied user ID. Attempt/history ownership filters must be applied in the repository or server boundary.
- The `is_test_account` marker should be server-controlled and excluded from production player analytics/history according to the existing repository policy; it must not be writable from public registration input.

## Remaining UX/UI decisions for grilling

- Where should sign-in and registration live in the public navigation?
- After authentication, should the player return to the originally requested VOD/training entry point?
- What copy and inline states should be shown when registration is disabled, when credentials are invalid, and when a session expires?
- Should sign-up automatically sign the player in, or return them to sign-in after registration?
