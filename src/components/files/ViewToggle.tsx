"use client";

import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "grid";

type ViewToggleProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg p-1 border border-figma-border bg-figma-white">
      <button
        onClick={() => onViewModeChange("grid")}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
          viewMode === "grid" ? "bg-figma-secondary text-figma-black" : "bg-transparent text-figma-light"
        )}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
          viewMode === "list" ? "bg-figma-secondary text-figma-black" : "bg-transparent text-figma-light"
        )}
        aria-label="List view"
      >
        <List className="h-5 w-5" />
      </button>
    </div>
  );
}
