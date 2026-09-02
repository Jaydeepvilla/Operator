import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Google OAuth has been disabled per configuration. Redirect to standard sign-in.
  return NextResponse.redirect(new URL("/sign-in", request.url));
}
