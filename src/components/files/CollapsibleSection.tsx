"use client";

import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  itemCount?: number;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  itemCount,
  className,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("mb-6", className)}>
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 mb-4 hover:opacity-80 transition-opacity"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200 text-figma-light",
            !isExpanded && "-rotate-90"
          )}
        />
        <span className="text-sm font-medium text-figma-light">
          {title}
        </span>
      </button>

      {/* Collapsible Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}
