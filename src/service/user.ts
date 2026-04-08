"use server";

import { supabaseServer } from "@/integrations/supabase/server";

export async function getCurrentUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    name:
      profile?.first_name || profile?.last_name
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : user.user_metadata?.first_name || user.user_metadata?.last_name
          ? `${user.user_metadata.first_name || ""} ${user.user_metadata.last_name || ""
            }`.trim()
          : "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
    role: profile?.role || user.user_metadata?.role || "requester",
  };
}

export async function getUserRole() {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) return null;
  
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
      
    return profile?.role || "requester";
}
