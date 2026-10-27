import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server";
import { checkUserOrganization } from "@/server/actions/onboarding";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasOrg, isCompleted } = await checkUserOrganization();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        onboardingCompleted: Boolean(hasOrg && isCompleted),
      },
    });
  } catch (error) {
    console.error("API /api/auth/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
