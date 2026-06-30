// Navbar — top navigation for all authenticated pages
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Upload, BarChart3, MessageSquare,
  Briefcase, Eye, GitCompare, Bell, Settings, LogOut, Shield,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-fg bg-fg-surface/80 backdrop-blur-xl">
      <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">FinGuard AI</span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "text-fg-muted hover:text-fg-text hover:bg-fg-surface-2"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-fg-text">{user.name}</span>
              <span className="text-xs text-fg-muted capitalize">{user.role.replace("_", " ")}</span>
            </div>
          )}
          <Link href="/settings" className="p-2 rounded-lg hover:bg-fg-surface-2 text-fg-muted hover:text-fg-text transition-colors">
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-red-500/10 text-fg-muted hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
