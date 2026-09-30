import { ReactNode } from "react";

export default function UnauthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="unauthenticated-layout min-h-screen">
      {/* Unauthenticated route group layout placeholder */}
      {children}
    </div>
  );
}
