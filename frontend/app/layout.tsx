import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinGuard AI — Enterprise Financial Risk Intelligence",
  description:
    "Upload any annual report and get an institutional-grade risk assessment, fraud analysis, and investment intelligence powered by Open Models on Nebius Token Factory.",
  keywords: ["financial analysis", "fraud detection", "AI", "annual report", "risk intelligence", "ESG"],
  openGraph: {
    title: "FinGuard AI",
    description: "Enterprise Financial Risk Intelligence Platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-fg-bg text-fg-text`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
