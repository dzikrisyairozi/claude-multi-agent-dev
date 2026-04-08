# QA Audit: Authentication Flow Checklist

Full E2E verification of the authentication flow — not new development, but QA audit.

## Acceptance Criteria vs Current System

### 1. New user can register via email invitation and set password
**Status: Implemented**

- `user.ts` uses `supabaseAdmin.auth.admin.inviteUserByEmail()` to send invitations
- `AuthForm.tsx` handles registration with password validation (8+ chars, uppercase, lowercase, number)
- New profiles auto-created via DB trigger with `is_active = NULL` (pending)

### 2. User receives registration email (check spam, delivery timing)
**Status: Relies on Supabase defaults**

- No custom email templates in the codebase — uses Supabase's built-in SMTP
- No invitation expiry tracking or resend mechanism
- **QA concern**: Needs manual verification of delivery & spam folder behavior

### 3. Email/password login works with correct role-based redirect
**Status: Implemented**

- `useAuth.tsx` checks `is_active` after login, then redirects:
  - `admin` / `platform_admin` → `/admin/users`
  - Other roles → `/c`
- `proxy.ts` enforces route protection server-side

### 4. Google OAuth login works end-to-end
**Status: Implemented**

- OAuth redirects to `/auth/callback` → `route.ts` exchanges code for session
- Auto-fills first/last name from Google metadata (fire-and-forget)
- **QA concern**: Profile name update is async — not guaranteed before first page load

### 5. Logout clears ALL cached data (no data leak between users)
**Status: Implemented**

- `signOut()` calls `queryClient.clear()` (full TanStack Query cache wipe)
- Local state reset: `setUser(null)`, `setSession(null)`
- Recent fix (commit `be0e17b`) addressed stale data after re-login
- **QA concern**: Cache clear happens before signout completes — brief race condition possible

### 6. Inactive/pending user redirected to `/inactive`
**Status: Implemented**

- Checked on every auth state change AND on login
- Distinguishes pending (`is_active = NULL`) vs rejected (`is_active = FALSE`)
- `inactive/page.tsx` shows appropriate message with Lottie animation
- **QA concern**: JWT is not revoked — only UI redirect. A determined user with the token could still hit APIs

### 7. Invalid credentials show appropriate error messages
**Status: Partially implemented**

- Supabase returns generic auth errors
- Custom messages for inactive vs rejected users
- **QA concern**: No failed login attempt logging for audit trail

### 8. Session expiry handled gracefully
**Status: Implicit only**

- Relies on Supabase's auto-refresh via refresh tokens in cookies
- `onAuthStateChange` listener catches logout events
- **QA concern**: No explicit expired-token handling — if refresh token expires, user may see an unclear error state

---

## Key Gaps Found

| Priority   | Gap                                                   | Risk              |
| ---------- | ----------------------------------------------------- | ----------------- |
| **High**   | Inactive users not truly locked out (JWT still valid)  | Security          |
| **High**   | No rate limiting on login/signup                       | Brute force       |
| **High**   | No failed login audit logging                          | Compliance        |
| **Medium** | Cache cleared before auth completes                    | Transient data loss |
| **Medium** | OAuth profile sync is fire-and-forget                  | UX glitch on first load |
| **Medium** | No invitation expiry or resend                         | Ops friction      |
| **Low**    | No concurrent session prevention                       | Account security  |
| **Low**    | No explicit session expiry UX                          | User confusion    |
