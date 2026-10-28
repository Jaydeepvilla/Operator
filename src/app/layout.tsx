import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth/client";
import { currentUser } from "@/lib/auth/server";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ToastProvider } from "@/components/shared/toast";
import { ConfirmProvider } from "@/components/shared/confirm-dialog";
import { MotionProvider } from "@/components/motion";
import { MazeSnippet } from "@/components/shared/maze-snippet";
import { Analytics } from "@vercel/analytics/next";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import "./globals.css";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: "Operator | 24/7 AI That Books, Qualifies & Answers",
  description:
    "Deploy Operator AI to answer calls, book appointments, capture leads, and support customers 24/7 — for dental clinics, law firms, salons, and service businesses.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  const initialUser = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name || null,
        avatar: user.avatar || null,
      }
    : null;

  return (
    <AuthProvider initialUser={initialUser}>
      <html
        lang="en"
        className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          <MazeSnippet />
        </head>
        <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground antialiased font-sans">
          <ThemeProvider>
            <ToastProvider>
              <ConfirmProvider>
                <MotionProvider>{children}</MotionProvider>
              </ConfirmProvider>
            </ToastProvider>
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </AuthProvider>
  );
}
