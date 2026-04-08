"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, X, Mail, User, Lock, CircleCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DevCredentials } from "./DevCredentials";

// Validation Schemas
const passwordSchema = z
  .string()
  .min(8, "Minimum 8 characters")
  .regex(/[A-Z]/, "Contains 1 uppercase letter")
  .regex(/[a-z]/, "Contains 1 lowercase letter")
  .regex(/[0-9]/, "Contains 1 number");

const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type SignInValues = z.infer<typeof signInSchema>;

function mapAuthError(message: string): { title: string; description: string } {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return { title: "Invalid Credentials", description: "The email or password you entered is incorrect." };
  }
  if (lower.includes("email not confirmed")) {
    return { title: "Email Not Verified", description: "Please check your inbox and verify your email before signing in." };
  }
  if (lower.includes("user not found")) {
    return { title: "Account Not Found", description: "No account found with this email address." };
  }
  if (lower.includes("email rate limit exceeded") || lower.includes("rate limit")) {
    return { title: "Too Many Attempts", description: "Please wait a moment before trying again." };
  }
  if (lower.includes("user already registered")) {
    return { title: "Email Already Registered", description: "An account with this email already exists. Try signing in instead." };
  }
  if (lower.includes("pending approval")) {
    return { title: "Account Pending", description: message };
  }
  if (lower.includes("deactivated")) {
    return { title: "Account Deactivated", description: message };
  }

  return { title: "Authentication Error", description: message || "An error occurred during authentication." };
}

export const AuthForm = () => {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const { signUp, signIn, signInWithGoogle } = useAuth();

  const form = useForm<SignUpValues | SignInValues>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setFocus,
  } = form;

  const passwordValue = watch("password");

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    reset();
    setShowPassword(false);
  };

  const onSubmit = async (data: SignUpValues | SignInValues) => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { fullName, email, password } = data as SignUpValues;
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setSignUpSuccess(true);
      } else {
        const { email, password } = data as SignInValues;
        const { data: authData, error } = await signIn(email, password);
        if (error) throw error;

        toast.success("Welcome back!");

        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error
            ? String((error as { message: string }).message)
            : "";

      const { title, description } = mapAuthError(rawMessage);
      toast.error(title, { description });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error("Error", { description: error.message });
      }
    } catch {
      toast.error("Error", { description: "An unexpected error occurred." });
    }
  };

  const handleDevFill = (email: string, pass: string) => {
    setIsSignUp(false);
    reset();
    setTimeout(() => {
      form.setValue("email", email, { shouldValidate: true });
      form.setValue("password", pass, { shouldValidate: true });
      setFocus("password");
    }, 100);
    toast.info("Credentials filled!");
  };

  // Password Requirement Checker Component
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
        met ? "text-green-600" : "text-muted-foreground/50",
      )}
    >
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );

  if (signUpSuccess) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CircleCheck className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Account Created
          </h1>
          <div className="space-y-2 text-muted-foreground">
            <p>Please check your email to verify your account.</p>
            <p>After verification, an administrator will review and approve your account.</p>
          </div>
        </div>
        <Button
          className="w-full h-11 text-base font-medium"
          onClick={() => {
            setSignUpSuccess(false);
            setIsSignUp(false);
            reset();
          }}
        >
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-8">
      <div className="space-y-2 text-start">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isSignUp ? "Sign Up" : "Sign In"}
        </h1>
        <p className="text-muted-foreground">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                onClick={toggleMode}
                className="font-medium text-foreground hover:underline underline-offset-4"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={toggleMode}
                className="font-medium text-foreground hover:underline underline-offset-4"
              >
                Sign Up
              </button>
            </>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="Enter Full Name"
                className={cn(
                  "pl-9",
                  ("fullName" in errors && errors.fullName) &&
                    "border-red-500 focus-visible:ring-red-500",
                )}
                {...register("fullName")}
              />
            </div>
            {"fullName" in errors && errors.fullName && (
              <p className="text-xs text-red-500">
                {errors.fullName.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="Enter Email Address"
              className={cn(
                "pl-9",
                errors.email && "border-red-500 focus-visible:ring-red-500",
              )}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

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
                errors.password && "border-red-500 focus-visible:ring-red-500",
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
          {/* For Sign In, just show error */}
          {!isSignUp && errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}

          {/* For Sign Up, show requirements checklist */}
          {isSignUp && (
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
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
          disabled={loading}
        >
          {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">OR</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-11 font-medium bg-background hover:bg-muted/50 transition-all"
        onClick={handleGoogleSignIn}
        type="button"
      >
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isSignUp ? "Sign up with Google" : "Sign in with Google"}
        </span>
      </Button>

      <DevCredentials onFill={handleDevFill} />
    </div>
  );
};
