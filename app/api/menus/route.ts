// PATH: app/api/menus/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Menu, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";

/**
 * GET /api/menus
 * Fetches all menus.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    try {
        const menus = await prisma.menu.findMany({
            include: {
                recipes: { select: { id: true, name: true } } // Include recipe names for display
            },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json<ApiResponse<Menu[]>>({ success: true, data: menus });
    } catch (error) {
        console.error("Error fetching menus:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/menus
 * Creates a new menu.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER', 'COOK'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, description, weekNumber, isActive, recipeIds } = body;

        if (!name) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Menu Name is required" }, { status: 400 });
        }

        const data: Prisma.MenuCreateInput = {
            name,
            description,
            weekNumber: weekNumber ? parseInt(weekNumber, 10) : null,
            isActive: isActive !== undefined ? !!isActive : true,
            recipes: recipeIds && recipeIds.length > 0
                ? { connect: recipeIds.map((id: string) => ({ id })) }
                : undefined,
        };

        const newMenu = await prisma.menu.create({
            data,
            include: {
                recipes: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json<ApiResponse<Menu>>({ success: true, data: newMenu }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating menu:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Menu name already exists" }, { status: 409 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
