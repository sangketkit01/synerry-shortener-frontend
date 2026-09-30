"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Clock, ArrowLeft } from "lucide-react";
import { useDomainHost } from "@/utils";

function ExpiredContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const domainHost = useDomainHost();

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-lg p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
          <Clock className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-semibold text-neutral-900 tracking-tight mb-2">
          Link Has Expired
        </h1>

        <p className="text-xs text-neutral-500 leading-relaxed mb-6">
          The short link <span className="font-mono text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">{domainHost}/s/{code}</span> has passed its validity date and is no longer active.
        </p>

        <div className="pt-4 border-t border-neutral-100 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-[11px] text-neutral-400">
        Synerry URL Shortener Platform
      </div>
    </div>
  );
}

export default function ExpiredPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-neutral-400">Loading...</div>}>
      <ExpiredContent />
    </Suspense>
  );
}
