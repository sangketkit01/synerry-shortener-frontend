import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;
  const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://localhost:5000";

  try {
    const backendRes = await fetch(`${backendUrl}/s/${encodeURIComponent(shortCode)}`, {
      redirect: "manual",
      headers: {
        "x-forwarded-for":
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "127.0.0.1",
        "user-agent": request.headers.get("user-agent") || "Mozilla/5.0",
        "referer": request.headers.get("referer") || "",
      },
    });

    const redirectLocation = backendRes.headers.get("location");
    if (redirectLocation) {
      const targetUrl = redirectLocation.startsWith("http://") || redirectLocation.startsWith("https://")
        ? redirectLocation
        : new URL(redirectLocation, request.url).toString();
      return NextResponse.redirect(targetUrl, 302);
    }

    // If 404 or no location, redirect to not-found status page
    return NextResponse.redirect(new URL(`/status/not-found?code=${encodeURIComponent(shortCode)}`, request.url));
  } catch (error) {
    console.error("[Next.js /s route error]:", error);
    return NextResponse.redirect(new URL(`/status/not-found?code=${encodeURIComponent(shortCode)}`, request.url));
  }
}
