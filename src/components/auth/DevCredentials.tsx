"use client";

import { useState } from "react";
import { Copy, Check, Shield, Briefcase, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DevCredentialsProps {
  onFill: (email: string, pass: string) => void;
}

const CREDENTIALS = [
  {
    role: "Platform Admin",
    name: "Platform Admin",
    email: "superadmin@gmail.com",
    password: "Superadmin123!",
    color: "bg-red-100 text-red-700",
    icon: Shield,
  },
  {
    role: "Admin",
    name: "Admin",
    email: "admin@gmail.com",
    password: "Admin123!",
    color: "bg-orange-100 text-orange-700",
    icon: Shield,
  },
  {
    role: "Approver",
    name: "Approver",
    email: "approver@gmail.com",
    password: "Approver123!",
    color: "bg-purple-100 text-purple-700",
    icon: Briefcase,
  },
  {
    role: "Requester",
    name: "Requester",
    email: "requester@gmail.com",
    password: "Requester123!",
    color: "bg-green-100 text-green-700",
    icon: User,
  },
  {
    role: "Accounting",
    name: "Accounting",
    email: "accounting@gmail.com",
    password: "Accounting123!",
    color: "bg-blue-100 text-blue-700",
    icon: Briefcase,
  },
];

export function DevCredentials({ onFill }: DevCredentialsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Only show in development environment
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

  if (!isDev) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFill = (email: string, pass: string) => {
    onFill(email, pass);
    setOpen(false); // Close dialog on selection
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          tabIndex={-1}
          className="w-full mt-8 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
        >
          <Shield className="mr-2 h-4 w-4" />
          Development Credentials
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            Development Credentials
          </DialogTitle>
          <DialogDescription className="text-orange-600/80 bg-orange-50 p-2 rounded-md mt-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            For Development Environment Only
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {CREDENTIALS.map((cred, idx) => (
            <div
              key={idx}
              className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "px-2 py-0.5 font-medium border-0",
                      cred.color,
                    )}
                  >
                    {cred.role}
                  </Badge>
                  <span className="font-medium text-slate-900">
                    {cred.name}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm group">
                  <span className="text-slate-500 w-16">Email:</span>
                  <div className="flex-1 flex items-center justify-between bg-white px-2 py-1.5 rounded border border-slate-100">
                    <code className="text-slate-700 text-xs sm:text-sm">
                      {cred.email}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(cred.email, `email-${idx}`);
                      }}
                    >
                      {copied === `email-${idx}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm group">
                  <span className="text-slate-500 w-16">Pass:</span>
                  <div className="flex-1 flex items-center justify-between bg-white px-2 py-1.5 rounded border border-slate-100">
                    <code className="text-slate-700 text-xs sm:text-sm">
                      ••••••••
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(cred.password, `pass-${idx}`);
                      }}
                    >
                      {copied === `pass-${idx}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 hover:text-slate-900 border-0 shadow-none"
                onClick={() => handleFill(cred.email, cred.password)}
              >
                Auto Fill Form
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
