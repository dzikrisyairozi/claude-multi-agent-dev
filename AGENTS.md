# AI Agent Codebase Guidelines

This document provides guidelines for AI code agents working on this Next.js + Supabase project.

## Project Overview

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS
- **Forms**: Formik + Yup validation
- **State Management**: TanStack Query for server state

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Auth-related routes (login, register, etc.)
│   ├── superadmin/        # Admin dashboard routes
│   └── api/               # API routes (being migrated to server actions)
├── components/
│   └── ui/                # shadcn/ui components (DO NOT MODIFY)
├── hooks/                 # Custom React hooks
├── integrations/
│   └── supabase/          # Supabase client configurations
├── lib/                   # Utility functions
├── providers/             # React context providers
├── service/               # Server actions and business logic
└── types/                 # TypeScript type definitions
```

---

## Core Patterns

### 1. Types Must Be in `/src/types/`

**IMPORTANT**: All TypeScript interfaces and types MUST be defined in the `/src/types/` directory, NOT in service files.

```typescript
// ✅ CORRECT: Types in src/types/user.ts
export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  is_active: boolean | null;
}

// ❌ WRONG: Types defined in service files
// src/service/user.ts
export interface Profile { ... }  // DO NOT DO THIS
```

Service files should import and re-export types:

```typescript
// src/service/admin/user.ts
import { Profile, UpdateUserParams } from "@/types/user";
export type { Profile, UpdateUserParams };
```

### 2. Supabase Client Usage

There are TWO Supabase clients with different purposes:

#### `supabaseServer` (Factory Function)

- Located: `@/integrations/supabase/server`
- **Purpose**: RLS-enforced database operations
- **Usage**: All standard CRUD operations
- **Must be awaited**: Creates fresh client per request

```typescript
import { supabaseServer } from "@/integrations/supabase/server";

export async function getUsers() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("profiles").select("*");
}
```

#### `supabaseAdmin` (Lazy Singleton)

- Located: `@/integrations/supabase/admin`
- **Purpose**: Admin-level auth operations ONLY
- **Usage**: User management (invite, delete, update auth metadata)
- **Direct access**: No await needed

```typescript
import { supabaseAdmin } from "@/integrations/supabase/admin";

// For auth admin operations
await supabaseAdmin.auth.admin.inviteUserByEmail(email, options);
await supabaseAdmin.auth.admin.deleteUser(userId);
```

> ⚠️ **NEVER** use `supabaseAdmin` for regular database operations. Always use `supabaseServer` for CRUD.

### 3. Server Actions Pattern

All server actions MUST:

1. Start with `"use server"` directive
2. Authenticate the user
3. Check authorization (role-based)
4. Return a consistent response structure: `{ data: T | null, error: string | null }`

```typescript
"use server";

import { supabaseServer } from "@/integrations/supabase/server";

export async function getData(): Promise<{
  data: SomeType[] | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    // 1. Authenticate
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    // 2. Perform operation
    const { data, error } = await supabase.from("table").select("*");

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Operation failed", error);
    return { data: null, error: "Failed to fetch data" };
  }
}
```

### 4. Activity Logging

Log user activities for audit trail using fire-and-forget pattern:

```typescript
import { logActivity } from "@/service/activityLog/activityLog";

// After successful operation (fire-and-forget, no await needed)
if (currentUser) {
  logActivity(supabase, currentUser.id, {
    action: "user_approve", // See ActivityAction type for valid values
    entity_type: "user",
    entity_id: userId,
    entity_name: userName,
    old_values: { status: "pending" },
    new_values: { status: "active" },
  });
}
```

### 5. Service File Organization

Services should be organized in folders by domain:

```
src/service/
├── admin/
│   └── user.ts           # Admin user management
├── approvalRequest/
│   └── approvalRequest.ts
├── activityLog/
│   └── activityLog.ts
└── document/
    └── document.ts
```

### 6. Component Patterns

#### Page Components (`page.tsx`)

- Use `"use client"` for interactive pages
- Fetch data using TanStack Query hooks
- Handle loading/error states

#### Sheet/Modal Components

- Use Formik for forms with Yup validation
- Follow the naming pattern: `EditXxxSheet`, `CreateXxxSheet`
- Import types from `@/types/`

#### Table Components

- Use shadcn/ui Table components
- Include pagination using `usePagination` hook
- Support filtering and search

### 7. UI Components

Use shadcn/ui components from `@/components/ui/`. To add new components:

```bash
npx shadcn@latest add <component-name> --yes
```

Available components include: Button, Input, Select, Sheet, Table, Dialog, Switch, etc.

---

## Code Style Guidelines

### Naming Conventions

- **Files**: kebab-case for components (`user-table.tsx`), camelCase for services (`approvalRequest.ts`)
- **Types/Interfaces**: PascalCase (`ApprovalRequest`, `UserRole`)
- **Functions**: camelCase (`getUsers`, `updateApprovalRequest`)
- **Constants**: UPPER_SNAKE_CASE for module-level constants

### Import Order

1. React and Next.js
2. External libraries
3. Internal components (`@/components/`)
4. Services (`@/service/`)
5. Types (`@/types/`)
6. Utils (`@/lib/`)

### Error Handling

- Always wrap async operations in try-catch
- Return structured errors: `{ data: null, error: "message" }`
- Log errors to console with context

---

## Common Tasks

### Adding a New Feature

1. **Define types** in `src/types/<feature>.ts`
2. **Create service** in `src/service/<feature>/<feature>.ts`
3. **Create components** in `src/app/<route>/_components/`
4. **Add UI components** using `npx shadcn@latest add <component>`

### Modifying User Schema

When adding fields to user profiles:

1. Update `Profile` interface in `src/types/user.ts`
2. Update `UpdateUserParams` if field is editable
3. Update `updateUser` service to handle the field
4. Update UI components (table columns, edit forms)

### Adding Activity Logging

1. Import `logActivity` from `@/service/activityLog/activityLog`
2. Define action type in `ActivityAction` if new
3. Call after successful operations (fire-and-forget)

---

## Don'ts

- ❌ Don't define types in service files
- ❌ Don't use `supabaseAdmin` for database queries
- ❌ Don't skip authentication checks in server actions
- ❌ Don't modify shadcn/ui components in `src/components/ui/`
- ❌ Don't use API routes for new features (use server actions instead)
- ❌ Don't forget to add `"use server"` directive in server action files

---

## Quick Reference

| Task                 | Location                       |
| -------------------- | ------------------------------ |
| Add types            | `src/types/`                   |
| Add server action    | `src/service/<domain>/`        |
| Add page             | `src/app/<route>/page.tsx`     |
| Add component        | `src/app/<route>/_components/` |
| Add shadcn component | `npx shadcn@latest add <name>` |
| Auth check           | `supabase.auth.getUser()`      |
| Admin auth ops       | `supabaseAdmin.auth.admin.*`   |
| Database CRUD        | `supabaseServer()`             |
