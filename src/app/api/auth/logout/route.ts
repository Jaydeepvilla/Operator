import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (token) {
      await deleteSession(token);
    }
    const response = NextResponse.json({ success: true });
    response.cookies.delete("session_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("active_org_id");
    return response;
  } catch (error) {
    console.error("API /api/auth/logout POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (token) {
      await deleteSession(token);
    }
  } catch (error) {
    console.error("API /api/auth/logout GET error:", error);
  }

  let redirectUrl = request.nextUrl.searchParams.get("redirect") || "/sign-in?logout=true";
  if (redirectUrl.startsWith("/sign-in") && !redirectUrl.includes("logout=true")) {
    redirectUrl += (redirectUrl.includes("?") ? "&" : "?") + "logout=true";
  }

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  response.cookies.set("session_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("active_org_id", "", { maxAge: 0, path: "/" });
  response.cookies.delete("session_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("active_org_id");
  return response;
}
