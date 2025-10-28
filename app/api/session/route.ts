// File: app/api/session/route.ts
import { getSession } from "@/lib/auth";
import { ApiResponse, StaffSession } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/session
 * Returns the current staff session data if logged in.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();

    if (session.user?.isLoggedIn) {
        // Return only necessary, non-sensitive data
        const sessionData: StaffSession = {
            id: session.user.id,
            name: session.user.name,
            role: session.user.role,
            isLoggedIn: true,
        };
         return NextResponse.json<ApiResponse<StaffSession>>(
             { success: true, data: sessionData },
             { status: 200 }
         );
    } else {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Não autenticado" },
            { status: 401 }
        );
    }
}