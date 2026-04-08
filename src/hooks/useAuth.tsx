"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import SplashScreen from "@/components/SplashScreen";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<{ data: any; error: any }>;
  signIn: (
    email: string,
    password: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<{ data: any; error: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastProcessedUserId = useRef<string | null>(null);
  const isManualSignOut = useRef(false);
  // Cache profile from signIn to avoid duplicate fetch when onAuthStateChange fires
  const [prefetchedProfile, setPrefetchedProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role, department_id, position_id, is_active")
        .eq("id", userId)
        .single();
      return profile;
    };

    const updateUserWithProfile = async (session: Session | null) => {
      if (session?.user) {
        // Skip if we already processed this user (prevents duplicate fetches)
        if (lastProcessedUserId.current === session.user.id) {
          return;
        }
        lastProcessedUserId.current = session.user.id;

        // Skip is_active check during invite confirmation flow
        const currentPath = window.location.pathname;
        if (currentPath.startsWith("/auth/confirm")) {
          if (cancelled) return;
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }

        // Use prefetched profile from signIn if available, otherwise fetch
        let profile = prefetchedProfile;
        if (profile && profile.id === session.user.id) {
          setPrefetchedProfile(null);
        } else {
          profile = await fetchProfile(session.user.id);
        }

        if (cancelled) return;

        // Only clear cache when user actually changes
        setUser((prevUser) => {
          if (prevUser && prevUser.id !== session.user.id) {
            queryClient.clear();
          }
          return {
            ...session.user,
            user_metadata: {
              ...session.user.user_metadata,
              ...profile,
            },
          } as User;
        });
        setSession(session);

        // Redirect inactive/pending users to /inactive (keep session alive)
        if (profile?.is_active !== true) {
          router.push("/inactive");
        }
      } else {
        setSession(session);
        setUser(null);
        lastProcessedUserId.current = null;
      }
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        setUser(null);
        setSession(null);
        lastProcessedUserId.current = null;
        setLoading(false);
        return;
      }

      // Handle expired refresh token gracefully
      if (event === "TOKEN_REFRESHED" && !session) {
        toast.error("Session Expired", {
          description: "Your session has expired. Please sign in again.",
        });
        queryClient.clear();
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      updateUserWithProfile(session);
    });

    // Fallback: getSession() for cases where onAuthStateChange doesn't fire INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateUserWithProfile(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!session && pathname !== "/login" && pathname !== "/inactive" && !pathname.startsWith("/auth/confirm")) {
      // Only show session expired toast if the session was lost unexpectedly (not manual logout)
      if (pathname !== "/" && !isManualSignOut.current) {
        toast.error("Session Expired", {
          description: "Your session has expired. Please sign in again.",
        });
      }
      isManualSignOut.current = false;
      router.push("/login");
    }
  }, [session, loading, pathname, router]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    // Clear any leftover cache from a previous user session
    queryClient.clear();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return { data: null, error: authError };
    }

    // Check if user is approved (is_active = true)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, department_id, position_id, is_active")
      .eq("id", authData.user.id)
      .single();

    // Cache profile so onAuthStateChange skips the duplicate fetch
    setPrefetchedProfile(profile);

    // Inactive/pending users can log in but are redirected to /inactive
    if (profile?.is_active !== true) {
      router.push("/inactive");
    }

    const mergedData = {
      ...authData,
      user: {
        ...authData.user,
        user_metadata: {
          ...authData.user.user_metadata,
          ...profile,
        },
      },
    };

    return { data: mergedData, error: null };
  };

  const signInWithGoogle = async () => {
    // Clear any leftover cache from a previous user session
    queryClient.clear();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Mark as intentional so the redirect effect doesn't show "session expired" toast
    isManualSignOut.current = true;
    // Clear all cached data before signout to prevent leaking between users
    queryClient.clear();
    // Sign out from Supabase — onAuthStateChange SIGNED_OUT handler resets local state
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.push("/login");
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  if (loading) {
    return <SplashScreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
