import { ReactNode } from "react";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="authenticated-layout min-h-screen">
      {/* Authenticated route group layout placeholder */}
      {children}
    </div>
  );
}
