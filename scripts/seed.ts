/**
 * Seeder script for EB-FILEMG
 *
 * Seeds: departments, positions, and syncs auth user metadata.
 * Requires ENV="develop" in .env.local as a safety guard.
 *
 * Usage:
 *   bun run seed
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ============================================================
// Env loader
// ============================================================
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
    // file not found
  }
}

loadEnvFile(resolve(__dirname, "../.env.local"));

// ============================================================
// Safety guard
// ============================================================
function checkEnv() {
  const env = process.env.ENV;
  if (env !== "develop") {
    console.error(`\n  ABORT: ENV="${env}" — seeder only runs when ENV="develop"`);
    console.error(`  Set ENV="develop" in .env.local to proceed.\n`);
    process.exit(1);
  }
}

// ============================================================
// Supabase client
// ============================================================
function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================
// Seed departments
// ============================================================
// Old JP-only names → new bilingual names (for upsert matching)
const DEPT_OLD_NAMES = [
  "経営企画部", "総務部", "人事部", "経理部", "営業部",
  "マーケティング部", "開発部", "情報システム部", "法務部", "品質管理部",
];

const DEPARTMENTS = [
  { name: "経営企画部 / Corporate Planning", description: "経営戦略・事業計画の策定 / Management strategy and business planning" },
  { name: "総務部 / General Affairs", description: "社内管理・庶務全般 / Internal administration and general affairs" },
  { name: "人事部 / Human Resources", description: "採用・労務・人材開発 / Recruitment, labor, and talent development" },
  { name: "経理部 / Accounting", description: "財務会計・経費管理 / Financial accounting and expense management" },
  { name: "営業部 / Sales", description: "顧客開拓・売上管理 / Customer acquisition and revenue management" },
  { name: "マーケティング部 / Marketing", description: "市場分析・ブランド戦略 / Market analysis and brand strategy" },
  { name: "開発部 / Engineering", description: "ソフトウェア開発・技術研究 / Software development and technical research" },
  { name: "情報システム部 / IT", description: "社内システム・インフラ管理 / Internal systems and infrastructure" },
  { name: "法務部 / Legal", description: "契約管理・コンプライアンス / Contract management and compliance" },
  { name: "品質管理部 / Quality Assurance", description: "品質保証・テスト管理 / Quality assurance and testing" },
];

async function seedDepartments(supabase: SupabaseClient) {
  console.log("\n=== Seeding Departments ===");

  let created = 0;
  let updated = 0;

  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const dept = DEPARTMENTS[i];
    const oldName = DEPT_OLD_NAMES[i];

    // Check if old JP-only name exists (for migration) or new name already exists
    const { data: existingOld } = await supabase
      .from("departments")
      .select("id")
      .eq("name", oldName)
      .maybeSingle();

    const { data: existingNew } = await supabase
      .from("departments")
      .select("id")
      .eq("name", dept.name)
      .maybeSingle();

    if (existingNew) {
      console.log(`  OK: ${dept.name}`);
      continue;
    }

    if (existingOld) {
      // Update old JP-only name to bilingual
      const { error } = await supabase
        .from("departments")
        .update({ name: dept.name, description: dept.description })
        .eq("id", existingOld.id);

      if (error) {
        console.error(`  ERROR updating ${oldName}: ${error.message}`);
      } else {
        console.log(`  UPDATED: ${oldName} → ${dept.name}`);
        updated++;
      }
      continue;
    }

    // Create new
    const { error } = await supabase.from("departments").insert({
      name: dept.name,
      description: dept.description,
      is_active: true,
    });

    if (error) {
      console.error(`  ERROR: ${dept.name} - ${error.message}`);
    } else {
      console.log(`  CREATED: ${dept.name}`);
      created++;
    }
  }

  console.log(`  → Created: ${created}, Updated: ${updated}`);
}

// ============================================================
// Seed positions
// ============================================================
// Old JP-only names → for upsert matching
const POS_OLD_NAMES = [
  "スタッフ", "主任", "係長", "課長", "次長",
  "部長", "本部長", "取締役", "代表取締役",
];

const POSITIONS = [
  { name: "スタッフ / Staff", level: 1, description: "一般社員 / General Employee" },
  { name: "主任 / Senior Staff", level: 2, description: "主任・チーフ / Chief" },
  { name: "係長 / Section Chief", level: 3, description: "チームリーダー / Team Lead" },
  { name: "課長 / Manager", level: 4, description: "セクションマネージャー / Section Manager" },
  { name: "次長 / Deputy GM", level: 5, description: "副部長 / Deputy General Manager" },
  { name: "部長 / General Manager", level: 6, description: "部門長 / Department Head" },
  { name: "本部長 / Division Head", level: 7, description: "事業本部長 / Executive General Manager" },
  { name: "取締役 / Director", level: 8, description: "役員 / Board Member" },
  { name: "代表取締役 / CEO", level: 9, description: "最高経営責任者 / Representative Director" },
];

async function seedPositions(supabase: SupabaseClient) {
  console.log("\n=== Seeding Positions ===");

  let created = 0;
  let updated = 0;

  for (let i = 0; i < POSITIONS.length; i++) {
    const pos = POSITIONS[i];
    const oldName = POS_OLD_NAMES[i];

    const { data: existingOld } = await supabase
      .from("positions")
      .select("id")
      .eq("name", oldName)
      .maybeSingle();

    const { data: existingNew } = await supabase
      .from("positions")
      .select("id")
      .eq("name", pos.name)
      .maybeSingle();

    if (existingNew) {
      console.log(`  OK: ${pos.name}`);
      continue;
    }

    if (existingOld) {
      const { error } = await supabase
        .from("positions")
        .update({ name: pos.name, description: pos.description })
        .eq("id", existingOld.id);

      if (error) {
        console.error(`  ERROR updating ${oldName}: ${error.message}`);
      } else {
        console.log(`  UPDATED: ${oldName} → ${pos.name}`);
        updated++;
      }
      continue;
    }

    const { error } = await supabase.from("positions").insert({
      name: pos.name,
      level: pos.level,
      description: pos.description,
      is_active: true,
    });

    if (error) {
      console.error(`  ERROR: ${pos.name} - ${error.message}`);
    } else {
      console.log(`  CREATED: ${pos.name} (level ${pos.level})`);
      created++;
    }
  }

  console.log(`  → Created: ${created}, Updated: ${updated}`);
}

// ============================================================
// Seed dev users (one per role)
// ============================================================
const DEV_USERS = [
  { email: "superadmin@gmail.com", password: "Superadmin123!", role: "platform_admin" },
  { email: "admin@gmail.com", password: "Admin123!", role: "admin" },
  { email: "approver@gmail.com", password: "Approver123!", role: "approver" },
  { email: "requester@gmail.com", password: "Requester123!", role: "requester" },
  { email: "accounting@gmail.com", password: "Accounting123!", role: "accounting" },
];

async function seedDevUsers(supabase: SupabaseClient) {
  console.log("\n=== Seeding Dev Users ===");

  let created = 0;
  let skipped = 0;

  for (const user of DEV_USERS) {
    // Check if user already exists by listing and searching
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.find((u) => u.email === user.email);

    if (existing) {
      // Ensure profile role and is_active are correct
      await supabase
        .from("profiles")
        .update({ role: user.role, is_active: true })
        .eq("id", existing.id);
      console.log(`  SKIP: ${user.email} (already exists, role ensured: ${user.role})`);
      skipped++;
      continue;
    }

    // Create auth user (email_confirm: true so they can login immediately)
    const { data: created_user, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        role: user.role,
        first_name: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        last_name: "User",
      },
    });

    if (createError) {
      console.error(`  ERROR: ${user.email} - ${createError.message}`);
      continue;
    }

    // The handle_new_user trigger creates the profile,
    // but ensure role and is_active are set correctly
    if (created_user?.user) {
      await supabase
        .from("profiles")
        .update({ role: user.role, is_active: true })
        .eq("id", created_user.user.id);
    }

    console.log(`  CREATED: ${user.email} (${user.role})`);
    created++;
  }

  console.log(`  → Created: ${created}, Skipped: ${skipped}`);
}

// ============================================================
// Sync auth metadata
// ============================================================
const ROLE_MAP: Record<string, string> = {
  platform_admin: "platform_admin",
  manager: "admin",
  employee: "requester",
  accountant: "accounting",
};

async function syncAuthMetadata(supabase: SupabaseClient) {
  console.log("\n=== Syncing Auth Metadata ===");

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, role");

  if (profilesError) {
    console.error(`  Failed to fetch profiles: ${profilesError.message}`);
    return;
  }

  const {
    data: { users },
    error: authError,
  } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error(`  Failed to list auth users: ${authError.message}`);
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const authUser = users.find((u) => u.id === profile.id);
    if (!authUser) {
      skipped++;
      continue;
    }

    const currentMetaRole = authUser.user_metadata?.role;
    const dbRole = profile.role;
    const mappedRole = ROLE_MAP[currentMetaRole] || currentMetaRole;

    if (mappedRole === dbRole && currentMetaRole === dbRole) {
      console.log(`  OK: ${profile.email} (${dbRole})`);
      skipped++;
      continue;
    }

    const { error } = await supabase.auth.admin.updateUserById(profile.id, {
      user_metadata: { ...authUser.user_metadata, role: dbRole },
    });

    if (error) {
      console.error(`  ERROR: ${profile.email} - ${error.message}`);
    } else {
      console.log(`  UPDATED: ${profile.email} — ${currentMetaRole || "null"} → ${dbRole}`);
      updated++;
    }
  }

  console.log(`  → Updated: ${updated}, Skipped: ${skipped}`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  checkEnv();
  console.log('Seeder running (ENV="develop")');

  const supabase = getClient();

  await seedDepartments(supabase);
  await seedPositions(supabase);
  await seedDevUsers(supabase);
  await syncAuthMetadata(supabase);

  console.log("\n=== Seeding Complete ===\n");
}

main().catch((err) => {
  console.error("Seeder failed:", err);
  process.exit(1);
});
