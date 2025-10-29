// PATH: app/api/serving-pans/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// --- START FIX: Corrected Enum import ---
import { ServingPan, PanStatus, Prisma } from "@prisma/client";
// --- END FIX ---
import { getSession } from "@/lib/auth";

/**
 * GET /api/serving-pans
 * Fetches all serving pans, optionally filtered by status or model.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // --- START FIX: Use correct Enum ---
    const status = searchParams.get("status") as PanStatus | null;
    // --- END FIX ---
    const modelId = searchParams.get("modelId");

    try {
        const where: Prisma.ServingPanWhereInput = {};
        // --- START FIX: Use correct Enum ---
        if (status && Object.values(PanStatus).includes(status)) {
            where.status = status;
        }
        // --- END FIX ---
        if (modelId) {
            where.panModelId = modelId; // Corrected field name
        }

        const pans = await prisma.servingPan.findMany({
            where,
            include: {
                panModel: true // Corrected relation name
            },
            orderBy: { uniqueIdentifier: 'asc' },
        });

        // Serialize model decimals
         const serializedPans = pans.map(pan => ({
            ...pan,
            // --- START FIX: Use correct relation and field names ---
            panModel: {
                ...pan.panModel,
                capacityL: pan.panModel.capacityL?.toString(),
                tareWeightG: pan.panModel.tareWeightG?.toString(),
            }
            // --- END FIX ---
         }));


        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedPans });
    } catch (error) {
        console.error("Error fetching serving pans:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/serving-pans
 * Creates a new serving pan instance.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        // --- START FIX: Use correct field name ---
        const { uniqueIdentifier, panModelId, status, notes } = body;
        // --- END FIX ---

        // --- START FIX: Use correct field name ---
        if (!uniqueIdentifier || !panModelId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Unique Identifier and Model ID are required" }, { status: 400 });
        }
        // --- END FIX ---

        const data: Prisma.ServingPanCreateInput = {
            uniqueIdentifier,
            // --- START FIX: Use correct relation and Enum ---
            panModel: { connect: { id: panModelId } },
            status: (status as PanStatus) || PanStatus.AVAILABLE,
            // --- END FIX ---
            notes,
        };

        const newPan = await prisma.servingPan.create({
            data,
            include: { panModel: true } // Corrected relation name
        });

        const serializedPan = {
             ...newPan,
             // --- START FIX: Use correct relation and field names ---
             panModel: {
                ...newPan.panModel,
                capacityL: newPan.panModel.capacityL?.toString(),
                tareWeightG: newPan.panModel.tareWeightG?.toString(),
            }
            // --- END FIX ---
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedPan }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating serving pan:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && error.meta?.target === 'ServingPan_uniqueIdentifier_key') {
                return NextResponse.json<ApiResponse>({ success: false, error: "Unique identifier already exists" }, { status: 409 });
            }
            if (error.code === 'P2025') { 
                 return NextResponse.json<ApiResponse>({ success: false, error: "Serving pan model not found" }, { status: 404 });
            }
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}