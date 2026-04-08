import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialized admin client - only created when first accessed
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Convenience getter for cleaner usage
export const supabaseAdmin = {
  get client() {
    return getSupabaseAdmin();
  },
  from: (table: string) => getSupabaseAdmin().from(table),
  auth: {
    get admin() {
      return getSupabaseAdmin().auth.admin;
    },
  },
};
