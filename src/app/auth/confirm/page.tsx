"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import SplashScreen from "@/components/SplashScreen";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

function useHashError() {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const errorCode = params.get("error_code");
    const errorDesc = params.get("error_description");
    if (!errorCode) return null;
    return errorCode === "otp_expired"
      ? "This invitation link has expired. Please ask your administrator to resend the invitation."
      : errorDesc?.replace(/\+/g, " ") || "Invalid invitation link.";
  }, []);
}

export default function ConfirmInvitePage() {
  const router = useRouter();
  const hashError = useHashError();

  useEffect(() => {
    if (hashError) return;

    // Listen for auth state changes (in case fragment is still being processed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace("/auth/confirm/set-password");
      } else if (event === "SIGNED_OUT") {
        router.replace("/login?error=invalid_invite");
      }
    });

    // Also check immediately — the fragment may have already been processed
    // before this listener was registered
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/auth/confirm/set-password");
      }
    });

    // Fallback timeout if nothing happens
    const timeout = setTimeout(() => {
      router.replace("/login?error=invalid_invite");
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, hashError]);

  if (hashError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm mx-auto space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Invitation Failed
            </h1>
            <p className="text-muted-foreground">{hashError}</p>
          </div>
          <Button
            onClick={() => router.push("/login")}
            className="w-full h-11"
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return <SplashScreen />;
}
