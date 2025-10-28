// PATH: app/api/serving-pan-models/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { ServingPanModel, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
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

        const serializedModels = models.map(m => ({
            ...m,
            capacityKg: m.capacityKg?.toString(),
            tareWeightKg: m.tareWeightKg.toString(),
        }));

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
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) { // Assuming only managers/owners define models
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, capacityKg, material, tareWeightKg, notes } = body;

        if (!name || tareWeightKg === undefined) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Model Name and Tare Weight are required" }, { status: 400 });
        }

        let tareWeightDecimal: Decimal;
        try {
            tareWeightDecimal = new Decimal(tareWeightKg);
            if (tareWeightDecimal.isNegative()) throw new Error();
        } catch {
             return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Tare Weight format" }, { status: 400 });
        }
        let capacityDecimal: Decimal | null = null;
        if (capacityKg !== undefined && capacityKg !== null) {
            try {
                capacityDecimal = new Decimal(capacityKg);
                if (capacityDecimal.isNegative()) throw new Error();
            } catch {
                return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Capacity format" }, { status: 400 });
            }
        }


        const data: Prisma.ServingPanModelCreateInput = {
            name,
            capacityKg: capacityDecimal,
            material,
            tareWeightKg: tareWeightDecimal,
            notes,
        };

        const newModel = await prisma.servingPanModel.create({ data });

        const serializedModel = {
            ...newModel,
            capacityKg: newModel.capacityKg?.toString(),
            tareWeightKg: newModel.tareWeightKg.toString(),
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedModel }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating serving pan model:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Serving pan model name already exists" }, { status: 409 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
