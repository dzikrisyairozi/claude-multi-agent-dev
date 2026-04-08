import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import TanstackProvider from "@/providers/TanstackProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/providers/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI File Management Copilot",
  description:
    "Chat-first workspace for uploading files, asking questions, and managing documentation with an AI assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <Toaster richColors />
          <TanstackProvider>
            <AuthProvider>{children}</AuthProvider>
          </TanstackProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
