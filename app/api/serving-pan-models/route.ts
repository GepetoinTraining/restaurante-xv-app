// PATH: app/api/serving-pan-models/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { ServingPanModel, Prisma } from "@prisma/client";
// --- START FIX: Removed Decimal import as schema uses Float (number) ---
// import { Decimal } from "@prisma/client/runtime/library";
// --- END FIX ---
import { getSession } from "@/lib/auth";

/**
 * GET /api/serving-pan-models
 * Fetches all serving pan models.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    try {
        const models = await prisma.servingPanModel.findMany({
            orderBy: { name: 'asc' },
        });

        // --- START FIX: Serialize correct fields from schema ---
        const serializedModels = models.map(m => ({
            ...m,
            capacityL: m.capacityL?.toString(),
            tareWeightG: m.tareWeightG?.toString(),
        }));
        // --- END FIX ---

        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedModels });
    } catch (error) {
        console.error("Error fetching serving pan models:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/serving-pan-models
 * Creates a new serving pan model.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        // --- START FIX: Use correct fields from schema ---
        const { name, capacityL, material, tareWeightG, notes, dimensions } = body;
        // --- END FIX ---

        // --- START FIX: Validate correct field ---
        if (!name || tareWeightG === undefined) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Model Name and Tare Weight (Grams) are required" }, { status: 400 });
        }
        // --- END FIX ---

        // --- START FIX: Validate as number (Float) ---
        let tareWeightNumber: number;
        try {
            tareWeightNumber = parseFloat(tareWeightG);
            if (tareWeightNumber < 0) throw new Error();
        } catch {
             return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Tare Weight (Grams) format" }, { status: 400 });
        }
        
        let capacityNumber: number | null = null;
        if (capacityL !== undefined && capacityL !== null) {
            try {
                capacityNumber = parseFloat(capacityL);
                if (capacityNumber < 0) throw new Error();
            } catch {
                return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Capacity (Liters) format" }, { status: 400 });
            }
        }
        // --- END FIX ---

        // --- START FIX: Use correct fields for create input ---
        const data: Prisma.ServingPanModelCreateInput = {
            name,
            capacityL: capacityNumber,
            material,
            tareWeightG: tareWeightNumber,
            dimensions,
            notes,
        };
        // --- END FIX ---

        const newModel = await prisma.servingPanModel.create({ data });

        // --- START FIX: Serialize correct fields ---
        const serializedModel = {
            ...newModel,
            capacityL: newModel.capacityL?.toString(),
            tareWeightG: newModel.tareWeightG?.toString(),
        };
        // --- END FIX ---

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedModel }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating serving pan model:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Serving pan model name already exists" }, { status: 409 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}