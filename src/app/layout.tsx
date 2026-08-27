import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { TrpcProvider } from "@/lib/trpc/client";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ADR-3 / security rulebook §5.1: this script MUST stay a fixed string literal — no
// user input, no request data, no interpolated variables. Its only effect is reading
// localStorage/matchMedia and toggling the `dark` class before first paint (FR-005).
// The storage key must match src/lib/theme/theme-context.tsx.
const themeBootstrapScript =
  '(function(){try{var t=localStorage.getItem("flowboard-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();';

export const metadata: Metadata = {
  title: "FlowBoard",
  description: "Kanban boards for teams",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the bootstrap script may add `dark` to <html> before
    // hydration, so the class can differ from the server-rendered output (ADR-3).
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <ThemeProvider>
          <SessionProvider>
            <TrpcProvider>{children}</TrpcProvider>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
