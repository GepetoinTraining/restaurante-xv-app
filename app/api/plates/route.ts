// PATH: app/api/plates/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { ClientPlate, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

/**
 * POST /api/plates
 * Records a new client plate from the weigh station.
 * SIMPLIFIED: Does not require visitId or clientId.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['CASHIER', 'MANAGER', 'OWNER', 'SERVER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body = await req.json();
        const { totalWeightGrams, tareWeightGrams, calculatedCost, notes } = body;

        // Check for required fields
        if (totalWeightGrams === undefined || tareWeightGrams === undefined || calculatedCost === undefined) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Pesos e Custo são obrigatórios." }, { status: 400 });
        }

        let totalWeightDecimal: Decimal;
        let tareWeightDecimal: Decimal;
        let costDecimal: Decimal;
        let netWeightDecimal: Decimal;

        try {
            totalWeightDecimal = new Decimal(totalWeightGrams);
            tareWeightDecimal = new Decimal(tareWeightGrams);
            costDecimal = new Decimal(calculatedCost);
            
            netWeightDecimal = totalWeightDecimal.minus(tareWeightDecimal);
            if (netWeightDecimal.isNegative()) {
                throw new Error("Peso líquido não pode ser negativo.");
            }
            if (costDecimal.isNegative()) {
                throw new Error("Custo não pode ser negativo.");
            }

        } catch (e: any) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Valores numéricos inválidos: ${e.message}` }, { status: 400 });
        }
        
        // Create the plate (with no visitId or clientId)
        const newPlate = await prisma.clientPlate.create({
            data: {
                weighedById: userId,
                totalWeightGrams: totalWeightDecimal,
                tareWeightGrams: tareWeightDecimal,
                netWeightGrams: netWeightDecimal,
                calculatedCost: costDecimal,
                notes: notes,
            },
            include: {
                weighedBy: { select: { name: true } }
            }
        });

        const serializedPlate = {
            ...newPlate,
            totalWeightGrams: newPlate.totalWeightGrams.toString(),
            tareWeightGrams: newPlate.tareWeightGrams.toString(),
            netWeightGrams: newPlate.netWeightGrams.toString(),
            calculatedCost: newPlate.calculatedCost.toString(),
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedPlate }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating plate:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
    }
}


/**
 * GET /api/plates
 * Fetches recently weighed plates.
 * SIMPLIFIED: Does not include client or visit.
 */
export async function GET(req: NextRequest) {
     const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    try {
        const plates = await prisma.clientPlate.findMany({
            take: 50, // Get last 50 plates
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                weighedBy: { select: { name: true } }
            }
        });

        // Serialize Decimals
        const serializedPlates = plates.map(plate => ({
            ...plate,
            totalWeightGrams: plate.totalWeightGrams.toString(),
            tareWeightGrams: plate.tareWeightGrams.toString(),
            netWeightGrams: plate.netWeightGrams.toString(),
            calculatedCost: plate.calculatedCost.toString(),
        }));

        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedPlates }, { status: 200 });

    } catch (error: any) {
         console.error("Error fetching plates:", error);
         return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
    }
}