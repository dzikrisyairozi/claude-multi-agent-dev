import { AuthForm } from "@/components/auth/AuthForm";
import Image from "next/image";

export default function Auth() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Hero/Decorative */}
      <div className="w-1/2 hidden lg:flex p-5">
        <div className="w-full h-full flex justify-center items-center relative bg-primary overflow-hidden text-primary-foreground rounded-2xl">
          <div className="flex flex-col items-center px-5">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Welcome to AI Management Assistant
              </h1>
              <p className="text-primary-foreground/80 text-lg">
                Manage documents. Automate approvals. Make informed decisions.
              </p>
            </div>

            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Using the mascot image found in public folder */}
              <Image
                src="/images/login-mascot.png"
                alt="AI Management Assistant Mascot"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-semibold">
                Smarter Business Decisions
              </h2>
              <p className="text-primary-foreground/80 text-center">
                Drop a document — the AI understands context, extracts key
                information, and supports approvals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-background">
        <AuthForm />
      </div>
    </div>
  );
}
