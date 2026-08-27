// Second-model adversarial review B2: next-auth/jwt's getToken() defaults secureCookie to
// false, so it looks for the unprefixed "authjs.session-token" cookie and derives its
// decryption salt from that name. NextAuth itself writes the cookie with the "__Secure-"
// prefix whenever the resolved URL is HTTPS (@auth/core's own useSecureCookies default) —
// so under HTTPS, every getToken() call here would silently look for the wrong cookie and
// find nothing. This must be passed identically everywhere getToken() is called
// server-side (lib/auth/session.ts, app/api/trpc/[trpc]/route.ts) so it can't drift.
export const isSecureCookie = process.env.NODE_ENV === "production";
