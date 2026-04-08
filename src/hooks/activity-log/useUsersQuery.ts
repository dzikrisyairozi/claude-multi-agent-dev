import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserOption = {
  id: string;
  name: string;
  role: string;
};

async function fetchUsers(): Promise<UserOption[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .order("first_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown",
    role: profile.role || "requester",
  }));
}

export function useUsersQuery() {
  const query = useQuery<UserOption[], Error>({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
  };
}
