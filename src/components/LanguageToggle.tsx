"use client";

import { Languages, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "gap-2 h-9 px-2 text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <Languages className="w-4 h-4" />
          <span className="text-sm font-medium">
            {language === "en" ? "English" : "Japanese"}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("en")} className="gap-2">
          {language === "en" && <Check className="w-4 h-4" />}
          {language !== "en" && <span className="w-4" />}
          {t("language.english")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("ja")} className="gap-2">
          {language === "ja" && <Check className="w-4 h-4" />}
          {language !== "ja" && <span className="w-4" />}
          {t("language.japanese")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
