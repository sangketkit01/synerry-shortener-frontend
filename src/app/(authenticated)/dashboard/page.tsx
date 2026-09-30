"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { LogOut, Loader2, ShieldCheck, User as UserIcon } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  // If not logged in, redirect to login
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/40">
      {/* Cloudflare-style Top Navbar */}
      <header className="h-14 border-b border-neutral-200 bg-white px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#E30A27] flex items-center justify-center text-white font-bold text-xs tracking-wider">
            S
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900">
            Synerry <span className="font-normal text-neutral-500">Shortener</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 text-xs font-medium">
            {user.role === "ADMIN" ? (
              <ShieldCheck className="w-3.5 h-3.5 text-[#E30A27]" />
            ) : (
              <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span>{user.email}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200">
              {user.role}
            </span>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="border border-neutral-200 rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900 mb-1">
            Authentication Verified
          </h1>
          <p className="text-xs text-neutral-500">
            Welcome, you are logged in as <strong className="text-neutral-800">{user.email}</strong> with role{" "}
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 border border-neutral-200 rounded text-neutral-800">
              {user.role}
            </span>
            . If you try to visit <code className="text-neutral-700 bg-neutral-100 px-1 py-0.5 rounded text-xs">/login</code>, you will be redirected here automatically.
          </p>
        </div>
      </main>
    </div>
  );
}
