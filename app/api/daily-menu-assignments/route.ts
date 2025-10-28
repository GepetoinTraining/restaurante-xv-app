// PATH: app/api/daily-menu-assignments/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { DailyMenuAssignment, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";

/**
 * GET /api/daily-menu-assignments
 * Fetches daily menu assignments, optionally filtered by date or company.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // Expecting YYYY-MM-DD
    const companyClientId = searchParams.get("companyClientId");

    try {
        const where: Prisma.DailyMenuAssignmentWhereInput = {};
        if (date) {
            // Filter for assignments on a specific date
            const targetDate = new Date(date + 'T00:00:00.000Z'); // Ensure UTC start of day
            where.assignmentDate = {
                gte: targetDate,
                lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Less than the next day
            };
        }
        if (companyClientId) {
            where.companyClientId = companyClientId;
        }

        const assignments = await prisma.dailyMenuAssignment.findMany({
            where,
            include: {
                companyClient: { select: { companyName: true } },
                menu: { select: { name: true } }
            },
            orderBy: [{ assignmentDate: 'asc' }, { companyClient: { companyName: 'asc' } }],
        });

        // Convert Date objects to strings for JSON
        const serializedAssignments = assignments.map(a => ({
            ...a,
            assignmentDate: a.assignmentDate.toISOString().split('T')[0], // Return as YYYY-MM-DD string
        }));


        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedAssignments });
    } catch (error) {
        console.error("Error fetching daily menu assignments:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/daily-menu-assignments
 * Assigns a menu to a company for a specific date.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // Assuming MANAGER or OWNER can assign menus
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { assignmentDate, companyClientId, menuId } = body; // Expecting date as YYYY-MM-DD string

        if (!assignmentDate || !companyClientId || !menuId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Date, Company Client ID, and Menu ID are required" }, { status: 400 });
        }

        const dateObject = new Date(assignmentDate + 'T00:00:00.000Z'); // Ensure UTC date without time component for DB

        // Upsert logic: If assignment exists, update menu; otherwise, create.
        const assignment = await prisma.dailyMenuAssignment.upsert({
            where: {
                assignmentDate_companyClientId: {
                    assignmentDate: dateObject,
                    companyClientId: companyClientId,
                }
            },
            update: { menuId: menuId },
            create: {
                assignmentDate: dateObject,
                companyClientId: companyClientId,
                menuId: menuId,
            },
            include: { // Include related data in the response
                companyClient: { select: { companyName: true } },
                menu: { select: { name: true } }
            }
        });

         const serializedAssignment = {
            ...assignment,
            assignmentDate: assignment.assignmentDate.toISOString().split('T')[0],
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedAssignment }, { status: 201 }); // 201 Created or 200 OK if updated
    } catch (error: any) {
        console.error("Error creating/updating daily menu assignment:", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003' || error.code === 'P2025') { // FK constraint or record not found
                return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Company Client ID or Menu ID provided" }, { status: 400 });
             }
         }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
