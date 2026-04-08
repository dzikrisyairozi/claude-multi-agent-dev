/**
 * Post-migration script: Sync auth.users metadata with new role values
 *
 * The DB migration updated profiles.role but auth.users.user_metadata.role
 * still has old values (manager, employee, accountant).
 * This script reads each user's profile role and updates their auth metadata.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/sync-auth-metadata.ts
 *   # or via package.json:
 *   bun run sync-auth-metadata
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually (avoids dotenv dependency)
function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // file not found — env vars may already be set
  }
}

loadEnvFile(resolve(__dirname, "../.env.local"));

const ROLE_MAP: Record<string, string> = {
  platform_admin: "platform_admin",
  manager: "admin",
  employee: "requester",
  accountant: "accounting",
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Fetch all profiles with their current DB role
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, role");

  if (profilesError) {
    console.error("Failed to fetch profiles:", profilesError.message);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profiles to sync.\n`);

  // 2. Fetch all auth users
  const {
    data: { users },
    error: authError,
  } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("Failed to list auth users:", authError.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const profile of profiles) {
    const authUser = users.find((u) => u.id === profile.id);
    if (!authUser) {
      console.log(`  SKIP: No auth user for profile ${profile.id}`);
      skipped++;
      continue;
    }

    const currentMetaRole = authUser.user_metadata?.role;
    const dbRole = profile.role;

    // Check if metadata needs update
    const mappedRole = ROLE_MAP[currentMetaRole] || currentMetaRole;
    if (mappedRole === dbRole && currentMetaRole === dbRole) {
      console.log(
        `  OK: ${profile.email} - role already synced (${dbRole})`
      );
      skipped++;
      continue;
    }

    // Update auth metadata
    const { error: updateError } =
      await supabase.auth.admin.updateUserById(profile.id, {
        user_metadata: {
          ...authUser.user_metadata,
          role: dbRole,
        },
      });

    if (updateError) {
      console.error(
        `  ERROR: ${profile.email} - ${updateError.message}`
      );
      errors++;
    } else {
      console.log(
        `  UPDATED: ${profile.email} - ${currentMetaRole} → ${dbRole}`
      );
      updated++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors:  ${errors}`);
  console.log(`Total:   ${profiles.length}`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
