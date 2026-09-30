"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { ArrowRight, Link2, Shield, BarChart3, QrCode } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Navbar */}
      <header className="h-14 border-b border-neutral-200 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#E30A27] flex items-center justify-center text-white font-bold text-xs tracking-wider">
            S
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900">
            Synerry <span className="font-normal text-neutral-500">Shortener</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? null : user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-[11px] font-medium text-neutral-600 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E30A27]"></span>
          <span>Enterprise Grade Short URL & Analytics Platform</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 max-w-2xl leading-tight">
          Simple, high-performance URL shortening and deep analytics
        </h1>

        <p className="mt-3 text-sm text-neutral-500 max-w-lg leading-relaxed">
          Built with Cloudflare-inspired minimalism, sub-20ms 302 redirection, QR code styling, and dedicated OLAP analytics.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-white bg-[#E30A27] hover:bg-[#C80820] shadow-sm transition-colors"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-neutral-700 hover:text-neutral-900 border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
          >
            <span>Create Account</span>
          </Link>
        </div>

        {/* Feature Grid Minimalist */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-5 border border-neutral-200 rounded-lg bg-neutral-50/50">
            <Link2 className="w-5 h-5 text-[#E30A27] mb-2.5" />
            <h3 className="text-xs font-semibold text-neutral-900">High-Speed Redirection</h3>
            <p className="mt-1 text-xs text-neutral-500 leading-normal">
              HTTP 302 redirection with asynchronous click stream logging.
            </p>
          </div>

          <div className="p-5 border border-neutral-200 rounded-lg bg-neutral-50/50">
            <QrCode className="w-5 h-5 text-[#E30A27] mb-2.5" />
            <h3 className="text-xs font-semibold text-neutral-900">Custom QR Codes</h3>
            <p className="mt-1 text-xs text-neutral-500 leading-normal">
              Instant generation and vector SVG/PNG high-resolution downloads.
            </p>
          </div>

          <div className="p-5 border border-neutral-200 rounded-lg bg-neutral-50/50">
            <BarChart3 className="w-5 h-5 text-[#E30A27] mb-2.5" />
            <h3 className="text-xs font-semibold text-neutral-900">Star Schema Analytics</h3>
            <p className="mt-1 text-xs text-neutral-500 leading-normal">
              OLAP data warehouse powered by Python ETL and sub-5ms aggregations.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400">
        Synerry Corporation Assessment Short URL Platform
      </footer>
    </div>
  );
}
