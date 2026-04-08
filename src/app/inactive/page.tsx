"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";
import clockLoopAnimation from "../../../public/clock_loop.json";

export default function InactivePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 relative overflow-hidden">
      <div className="z-10 flex flex-col items-center max-w-lg text-center space-y-8">
        {/* Lottie Animation */}
        <div className="w-48 h-48 md:w-64 md:h-64 relative">
          <div className="absolute inset-0 bg-orange-100/50 rounded-full blur-xl scale-75" />
          <Lottie
            animationData={clockLoopAnimation}
            loop={true}
            className="relative z-10"
          />
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
            Your account has been created, and is currently awaiting
            administrator approval
          </h1>
          <p className="text-gray-500 text-lg">
            You'll receive an email once your account has been approved and is
            ready to use.
          </p>
        </div>

        {/* Button */}
        <Button
          onClick={() => router.push("/login")}
          className="bg-[#40B5E6] hover:bg-[#369bc4] text-white px-8 py-6 text-lg rounded-md transition-colors duration-200"
        >
          Back to Sign In
        </Button>
      </div>
    </div>
  );
}
