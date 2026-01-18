"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

interface NavbarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  return (
    <nav className="border-b border-border bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-semibold text-foreground tracking-tight">
              AGENT COMMAND
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/initiatives"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Initiatives
            </Link>
            <Link
              href="/tasks"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Tasks
            </Link>
            <Link
              href="/repos"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Repos
            </Link>
            <Link
              href="/billing"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Billing
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="text-muted hover:text-foreground transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>

            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full border border-border"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-card-elevated border border-border flex items-center justify-center">
                  <span className="text-xs font-medium text-muted">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                  </span>
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
