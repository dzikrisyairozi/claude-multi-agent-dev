# Issue: Page Reload Causes Forever Skeleton Loading

**Status**: Open
**Severity**: High
**Affected Pages**: All admin pages using server actions with TanStack Query (`/admin/approval-routes`, `/admin/categories`, etc.)
**Date**: 2026-03-29

---

## Symptom

When doing a hard page reload (Ctrl+R / F5) on any admin page, the skeleton loading state persists forever. The actual data never loads. However, navigating to the same page via client-side navigation (clicking sidebar links) works perfectly.

**Pattern observed:**
- Reload `/admin/approval-routes` → forever skeleton. Click "Categories Type" → loads instantly.
- Reload `/admin/categories` → forever skeleton. Click "Approval Routes" → loads instantly.
- The first page after reload always hangs. Subsequent client-side navigations work fine.

## Network Tab Evidence

On reload, the network shows:
- `login?_rsc=ntlbm` × 2 (RSC page loads — 200 OK)
- `profiles?select=*` × 1 (auth profile fetch — 200 OK)
- `users` × 2 (server action — 200 OK, but these are from another page)
- **NO** `approval-routes` POST — the server action for the current page **never fires**

The server action call is blocked client-side. The TanStack Query has `enabled: !!user` but `user` remains null during the critical window.

## Root Cause Analysis

### The Auth Flow on Reload:
1. Page renders as SSR → admin layout checks `useAuth()` → `user` is null, `loading` is true
2. Supabase `onAuthStateChange` fires `INITIAL_SESSION` event
3. `updateUserWithProfile()` fetches profile from DB (`profiles?select=*`)
4. Profile fetch succeeds, but `setUser()` may not trigger a re-render fast enough
5. The page component's `useQuery` has `enabled: !!user` — but by the time `user` resolves, the component may have already committed its render cycle

### Why Client-Side Navigation Works:
When navigating via Link/router.push, the `user` is already set from the previous page's auth context. The `useQuery` immediately has `enabled: true` and fires the server action.

### What Was Tried (Did Not Fix):
1. ~~`Promise.race` timeout on `supabase.auth.getUser()` in server action~~ — Reverted, wrong approach
2. ~~Remove `getSession()` and rely only on `onAuthStateChange`~~ — Made it worse (INITIAL_SESSION not always firing)
3. ~~Add `getSession()` back with `lastProcessedUserId` dedup~~ — Still hangs
4. `enabled: !!user` on TanStack Query — Correct approach but `user` never becomes truthy on reload
5. `staleTime: 60_000` + `refetchOnWindowFocus: false` — Reduces re-fetches but doesn't fix the initial load

### Possible Root Causes:
- **Supabase SSR cookie conflict**: Two Supabase project cookies exist (`sb-rjwvbmdhseathxkiuwcl-*` and `sb-uqbuurxicvateyryeqld-*`). The old project's cookie may cause `getUser()` to hang during token refresh.
- **`onAuthStateChange` timing**: The event may fire before the React tree is ready to receive the state update.
- **Server action cold start**: The Next.js server action may take longer than expected on first call, and the client gives up waiting.

## Attempted Fixes in Code

### `src/hooks/useAuth.tsx`:
- Added `lastProcessedUserId` ref to prevent duplicate profile fetches
- Added `getSession()` fallback alongside `onAuthStateChange`
- Changed `queryClient.clear()` to only fire on actual user change

### `src/app/admin/approval-routes/page.tsx`:
- Added `enabled: !!user` to TanStack Query
- Added `staleTime: 60_000`, `refetchOnWindowFocus: false`

### `src/app/admin/categories/page.tsx`:
- Same pattern as approval-routes

### `src/app/admin/layout.tsx`:
- Removed separate profile DB query, use `user_metadata.role` instead

### `next.config.ts`:
- Disabled `reactStrictMode` to prevent double-mounting

## Potential Solutions to Investigate

1. **Remove `enabled: !!user` and let the server action handle auth independently** — The server action already checks `isAdminOrSuper()`. If it returns `{ data: null, error: "Unauthorized" }`, the query should just show empty state, not hang. The hang might be in the server action itself, not the query.

2. **Add Next.js middleware for auth** — Use `middleware.ts` to refresh the Supabase session on every request, ensuring server-side cookies are always fresh before the page renders.

3. **Clear stale Supabase cookies** — Remove the old project's cookie (`sb-rjwvbmdhseathxkiuwcl-*`) that may be interfering.

4. **Use `supabase.auth.getSession()` on the server side** instead of `getUser()` — `getSession()` reads from the cookie without making a network call to refresh, which would be faster.

5. **Investigate the actual hang point** — Add `console.log` timestamps in `useAuth` to determine exactly where the flow stalls on reload vs client-side navigation.

## Related Files

- `src/hooks/useAuth.tsx` — Auth context provider
- `src/app/admin/layout.tsx` — Admin layout with role check
- `src/service/auth/authorization.ts` — Server-side auth helpers
- `src/integrations/supabase/server.ts` — Server Supabase client
- `src/app/admin/approval-routes/page.tsx` — Affected page
- `src/app/admin/categories/page.tsx` — Affected page

## Environment

- Next.js 16, React 19
- Supabase SSR (`@supabase/ssr`)
- TanStack Query v5.90
- Two Supabase projects with cookies present (potential conflict)
