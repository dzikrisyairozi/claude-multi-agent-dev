import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await autoFillProfileName(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

/**
 * Auto-fill profile first_name/last_name from OAuth metadata (e.g. Google's
 * given_name/family_name) when the profile fields are empty.
 * Runs fire-and-forget style — auth flow is not blocked by failures here.
 */
async function autoFillProfileName(
  supabase: Awaited<ReturnType<typeof supabaseServer>>
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const meta = user.user_metadata ?? {};
    const fullName = meta.full_name || meta.name || null;
    let firstName = meta.given_name ?? meta.first_name ?? null;
    let lastName = meta.family_name ?? meta.last_name ?? null;
    // Google OAuth often only provides full_name — split as fallback
    if (!firstName && !lastName && fullName) {
      const parts = fullName.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
    }
    if (!firstName && !lastName) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();
    if (!profile) return;

    const updates: Record<string, string> = {};
    if (!profile.first_name && firstName) updates.first_name = firstName;
    if (!profile.last_name && lastName) updates.last_name = lastName;
    if (Object.keys(updates).length === 0) return;

    await supabase.from("profiles").update(updates).eq("id", user.id);
  } catch {
    // Non-critical — don't block the auth callback
  }
}
