// PATH: app/api/auth/route.ts
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { getSession, sessionOptions, UserSession } from "@/lib/auth"; // Import UserSession from auth
import { ApiResponse } from "@/lib/types"; // Keep ApiResponse, it's a generic wrapper
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/auth
 * Handles User login by PIN
 */
export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "PIN é obrigatório" },
        { status: 400 }
      );
    }

    // Find all active users.
    // This is still not highly performant, but required if PINs are not unique.
    // If PINs are unique, this can be changed to a single findUnique query.
    const userList = await prisma.user.findMany({ where: { isActive: true } });
    let authenticatedUser = null;

    for (const user of userList) {
      // Use the new 'pin' field on the 'User' model
      if (user.pin && (await compare(pin, user.pin))) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "PIN inválido ou usuário inativo" },
        { status: 401 }
      );
    }

    // --- Login successful ---
    const session = await getSession();

    // Save user data in the session
    session.user = {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      role: authenticatedUser.role, // Use the new 'role' field
      isLoggedIn: true,
    };
    await session.save();

    return NextResponse.json<ApiResponse<UserSession>>(
      { success: true, data: session.user },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth
 * Handles User logout
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    session.destroy(); // Clear the session cookie

    // Also tell Next.js to clear its cache of the cookie
    cookies().delete(sessionOptions.cookieName);

    return NextResponse.json<ApiResponse>(
      { success: true, data: "Logout successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}