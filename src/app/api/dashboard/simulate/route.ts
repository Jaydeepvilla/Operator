import { NextResponse } from "next/server";

/**
 * DEPRECATED & DISABLED:
 * This endpoint previously created simulated appointments and conversations for mock testing.
 * It is permanently deactivated to prevent fake records from polluting user databases.
 */
export async function POST() {
  return NextResponse.json(
    { 
      success: true, 
      disabled: true, 
      message: "Simulation mode has been disabled. Use /widget or /settings/voice for live receptionist testing." 
    },
    { status: 200 }
  );
}
