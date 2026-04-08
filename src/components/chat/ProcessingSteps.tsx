"use client";

import { CheckCircle2, Loader2, Circle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessingStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "completed";
};

interface ProcessingStepsProps {
  steps: ProcessingStep[];
  title?: string;
}

export const ProcessingSteps = ({
  steps,
  title = "Processing...",
}: ProcessingStepsProps) => {
  const activeIndex = steps.findIndex((s) => s.status === "active");
  const progress =
    activeIndex === -1 ? 100 : ((activeIndex + 0.5) / steps.length) * 100;

  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-primary">
        <Bot className="w-5 h-5" />
      </div>
      <div className="bg-white border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm max-w-md">
        <p className="text-sm text-muted-foreground mb-3">{title}</p>

        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2">
              {step.status === "completed" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              {step.status === "active" && (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              )}
              {step.status === "pending" && (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  step.status === "completed" && "text-emerald-600",
                  step.status === "active" && "text-primary font-medium",
                  step.status === "pending" && "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary to-primary/60 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
