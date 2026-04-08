# TASK A — 認証E2Eフロー確認 / Auth End-to-End Flow Verification

**Priority**: Low
**Assignee**: TBD
**Effort**: S (Small) — QA verification, not new development
**Status**: Already implemented, needs E2E detail check

---

## Current State

The auth system is fully implemented:
- `src/components/auth/AuthForm.tsx` — Sign In/Up toggle with email+password and Google OAuth
- `src/app/login/page.tsx` — Split-pane login page (decorative left + form right)
- `src/app/auth/callback/route.ts` — OAuth callback, auto-fills profile `first_name`/`last_name` from Google metadata
- `src/hooks/useAuth.tsx` — Auth context with `is_active` check, `queryClient.clear()` on sign out
- `src/app/inactive/page.tsx` — Pending approval page with Lottie animation
- Password validation: 8+ chars, uppercase, lowercase, number
- Role-based redirect: `platform_admin`/`admin` → `/admin/dashboard`, others → `/c`

## Scope

This is a **QA verification task**, not new development. The assignee is responsible for ensuring the entire auth flow works flawlessly end-to-end.

### Flows to Verify

1. **Sign Up via Email Invitation**
   - Admin invites user from `/admin/users` → user receives email → clicks link → sets password → account created
   - Verify email actually arrives (check spam/junk, delivery timing)
   - Verify Supabase email template renders correctly

2. **Sign Up via Registration Form**
   - New user fills Sign Up form (fullName, email, password)
   - Account created with `is_active = null` → redirected to `/inactive`
   - Admin approves → user can log in

3. **Sign In (Email/Password)**
   - Correct credentials → redirect based on role
   - Wrong password → error message shown
   - Non-existent email → appropriate error

4. **Sign In (Google OAuth)**
   - Click "Sign in with Google" → OAuth flow → callback → profile auto-fill → redirect
   - First-time Google user → account created, `is_active` checked

5. **Logout**
   - Click logout → session cleared → TanStack Query cache cleared → redirect to `/login`
   - **Critical regression check**: Log in as User A, logout, log in as User B → verify User B sees ONLY their data (not User A's cached data)

6. **Edge Cases**
   - Expired session token → graceful redirect to login
   - Concurrent sessions in multiple tabs
   - Network error during auth → user-friendly error message
   - Inactive user attempts login → redirected to `/inactive`

## Acceptance Criteria

- [ ] New user can register via email invitation and set password
- [ ] User receives registration email within 2 minutes (check spam)
- [ ] Email/password login works with correct role-based redirect
- [ ] Google OAuth login works end-to-end (new user + returning user)
- [ ] Logout clears ALL cached data (no data leak between users)
- [ ] Inactive/pending user is redirected to `/inactive` page
- [ ] Invalid credentials show appropriate error messages (not generic)
- [ ] Session expiry is handled gracefully (no blank page)
- [ ] Sign Up password validation works (8+ chars, uppercase, lowercase, number)

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Sign up with valid email + password | Account created, redirect to `/inactive` |
| 2 | Sign up with weak password (no uppercase) | Validation error shown |
| 3 | Sign in with correct credentials (admin) | Redirect to `/admin/dashboard` |
| 4 | Sign in with correct credentials (requester) | Redirect to `/c` |
| 5 | Sign in with wrong password | "Invalid login credentials" error |
| 6 | Google OAuth first time | Account created, profile auto-filled |
| 7 | Google OAuth returning user | Logged in, redirect based on role |
| 8 | Logout then login as different user | No cached data from previous user |
| 9 | Inactive user login | Redirect to `/inactive` with animation |
| 10 | Expired token page reload | Redirect to `/login` |

## Edge Cases & Gotchas

- **Cache bug (fixed 2026-03-24)**: `queryClient.clear()` is called on `signOut`, `signIn`, `signInWithGoogle`, and `SIGNED_OUT` auth event. Regression test this specifically.
- **Profile auto-fill**: OAuth callback does fire-and-forget profile update — may fail silently. Verify `first_name`/`last_name` are populated.
- **Dev credentials**: `AuthForm` shows dev credentials in dev mode — ensure this is hidden in production.
- **Supabase email config**: Check SMTP settings in Supabase dashboard if emails aren't arriving.

## Code References

| File | Purpose |
|------|---------|
| `src/components/auth/AuthForm.tsx` | Main auth form with sign in/up toggle |
| `src/app/login/page.tsx` | Login page layout |
| `src/app/auth/callback/route.ts` | OAuth callback handler |
| `src/hooks/useAuth.tsx` | Auth context + is_active check + cache clear |
| `src/app/inactive/page.tsx` | Pending approval page |
| `src/service/admin/user.ts` | User invitation service |

## Permission Matrix Reference

- SYS-001: Manage members & invite users (Admin, Platform Admin only)

## Dependencies

- None — independent QA task
