"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, X, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Contains 1 uppercase letter")
      .regex(/[a-z]/, "Contains 1 lowercase letter")
      .regex(/[0-9]/, "Contains 1 number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function SetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const passwordValue = watch("password");

  const onSubmit = async (data: PasswordValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error("Failed to set password", {
          description: error.message,
        });
        return;
      }

      // Sign out so user goes through normal login flow (with is_active check)
      await supabase.auth.signOut();
      toast.success("Password set successfully! Please wait for admin approval.");
      router.push("/inactive");
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement = ({
    met,
    text,
  }: {
    met: boolean;
    text: string;
  }) => (
    <div
      className={cn(
        "flex items-center gap-2 text-xs transition-colors duration-200",
        met ? "text-green-600" : "text-muted-foreground/50"
      )}
    >
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div className="space-y-2 text-start">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Set Your Password
          </h1>
          <p className="text-muted-foreground">
            Create a password for your account to complete the registration.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                className={cn(
                  "pl-9 pr-10",
                  errors.password &&
                    "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="space-y-1 mt-2 p-2 bg-muted/30 rounded-lg">
              <PasswordRequirement
                met={passwordValue?.length >= 8}
                text="Minimum 8 characters"
              />
              <PasswordRequirement
                met={
                  /[A-Z]/.test(passwordValue || "") &&
                  /[a-z]/.test(passwordValue || "")
                }
                text="Contains 1 uppercase and lowercase letter"
              />
              <PasswordRequirement
                met={/[0-9]/.test(passwordValue || "")}
                text="Contains 1 number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                className={cn(
                  "pl-9 pr-10",
                  errors.confirmPassword &&
                    "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("confirmPassword")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
            disabled={loading}
          >
            {loading ? "Setting Password..." : "Set Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
