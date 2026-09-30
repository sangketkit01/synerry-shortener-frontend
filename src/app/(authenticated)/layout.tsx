"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      // Instant redirect to login if not authenticated
      window.location.replace("/login");
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
