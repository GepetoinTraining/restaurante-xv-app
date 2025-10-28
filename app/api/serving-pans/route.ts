// PATH: app/api/serving-pans/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { ServingPan, ServingPanStatus, Prisma } from "@prisma/client";
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
    const status = searchParams.get("status") as ServingPanStatus | null;
    const modelId = searchParams.get("modelId");

    try {
        const where: Prisma.ServingPanWhereInput = {};
        if (status && Object.values(ServingPanStatus).includes(status)) {
            where.status = status;
        }
        if (modelId) {
            where.modelId = modelId;
        }

        const pans = await prisma.servingPan.findMany({
            where,
            include: {
                model: true // Include model details
            },
            orderBy: { uniqueIdentifier: 'asc' },
        });

        // Serialize model decimals
         const serializedPans = pans.map(pan => ({
            ...pan,
            model: {
                ...pan.model,
                capacityKg: pan.model.capacityKg?.toString(),
                tareWeightKg: pan.model.tareWeightKg.toString(),
            }
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
    // Assuming MANAGER or OWNER can add physical inventory
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { uniqueIdentifier, modelId, status, notes } = body;

        if (!uniqueIdentifier || !modelId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Unique Identifier and Model ID are required" }, { status: 400 });
        }

        const data: Prisma.ServingPanCreateInput = {
            uniqueIdentifier,
            model: { connect: { id: modelId } },
            status: (status as ServingPanStatus) || ServingPanStatus.AVAILABLE,
            notes,
        };

        const newPan = await prisma.servingPan.create({
            data,
            include: { model: true }
        });

        const serializedPan = {
             ...newPan,
             model: {
                ...newPan.model,
                capacityKg: newPan.model.capacityKg?.toString(),
                tareWeightKg: newPan.model.tareWeightKg.toString(),
            }
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedPan }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating serving pan:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && error.meta?.target === 'ServingPan_uniqueIdentifier_key') {
                return NextResponse.json<ApiResponse>({ success: false, error: "Unique identifier already exists" }, { status: 409 });
            }
            if (error.code === 'P2025') { // Foreign key constraint failed on connect
                 return NextResponse.json<ApiResponse>({ success: false, error: "Serving pan model not found" }, { status: 404 });
            }
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
