import { LogOut, User as UserIcon, ChevronDown, Menu, Wrench } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/providers/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import NotificationBell from "@/components/layout/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileMenu } from "@/providers/MobileMenuProvider";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { setTheme } = useTheme();
  const { open: openMobileMenu } = useMobileMenu();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 h-16">
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        {/* LEFT - Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={openMobileMenu}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {/* Dev Tools */}
          {process.env.NEXT_PUBLIC_DEV_TOOLS === "true" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dev-tools">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                    >
                      <Wrench className="h-4 w-4" />
                      <span className="sr-only">Dev Tools</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Dev Tools</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Language */}
          <LanguageToggle />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() =>
              setTheme((theme) => (theme === "dark" ? "light" : "dark"))
            }
          >
            <Moon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Sun className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Profile */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 pl-2 border-l ml-2 cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar className="h-9 w-9 bg-muted">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {(
                        user.user_metadata?.full_name?.[0] ||
                        user.email?.[0] ||
                        "U"
                      ).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col text-left">
                    <div className="flex items-center gap-2 justify-end">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-semibold truncate max-w-[120px]">
                              {user.user_metadata?.full_name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.user_metadata?.full_name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1 bg-sky-100 text-sky-600 hover:bg-sky-100"
                      >
                        <UserIcon className="w-2 h-2 mr-0.5" />
                        {user.user_metadata?.role
                          ? user.user_metadata.role.charAt(0).toUpperCase() + user.user_metadata.role.slice(1)
                          : "User"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 justify-start text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-500 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
