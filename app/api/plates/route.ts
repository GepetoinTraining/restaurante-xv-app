// PATH: app/api/plates/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ClientPlate, Visit, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// --- Demo Configuration ---
const PLATE_TARE_WEIGHT_GRAMS = new Decimal(150); // Example tare weight
const BUFFET_PRICE_PER_KG = new Decimal(60.00); // Example R$ 60/kg

type PlateInput = {
    visitId: string;
    totalWeightGrams: string | number; // Weight from the scale including tare
    imageUrl?: string; // Optional image URL
    // estimatedContents can be added later if using image analysis
}

/**
 * POST /api/plates
 * Records a client's plate from the weigh station, calculates cost,
 * and potentially updates visit total. (Buffet pan deduction TBD).
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // Define roles allowed to operate weigh station
    if (!session.user?.isLoggedIn || !['CASHIER', 'SERVER', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const weighStationOperatorId = session.user.id;

    try {
        const body: PlateInput = await req.json();
        const { visitId, totalWeightGrams, imageUrl } = body;

        if (!visitId || totalWeightGrams === undefined) {
            return NextResponse.json<ApiResponse>({ success: false, error: "ID da Visita e Peso Total são obrigatórios." }, { status: 400 });
        }

        let totalWeightDecimal: Decimal;
        try {
            totalWeightDecimal = new Decimal(totalWeightGrams);
            if (totalWeightDecimal.lte(PLATE_TARE_WEIGHT_GRAMS)) {
                // Weight is less than or equal to tare, likely an empty plate or error
                throw new Error(`Peso total (${totalWeightDecimal.toString()}g) deve ser maior que o peso do prato (${PLATE_TARE_WEIGHT_GRAMS.toString()}g).`);
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Peso total inválido: ${e.message}` }, { status: 400 });
        }

        // --- Calculations ---
        const netWeightGrams = totalWeightDecimal.minus(PLATE_TARE_WEIGHT_GRAMS);
        const netWeightKg = netWeightGrams.dividedBy(1000);
        const calculatedCost = netWeightKg.times(BUFFET_PRICE_PER_KG);

        // --- Transaction: Find Visit, Create Plate, Update Visit Total ---
        const [newPlate, updatedVisit] = await prisma.$transaction(async (tx) => {
            // 1. Verify Visit exists and get clientId
            const visit = await tx.visit.findUnique({
                where: { id: visitId },
                select: { clientId: true, status: true } // Check status if needed
            });
            if (!visit) throw new Error("Visita não encontrada.");
            // Optional: Check if visit is active
            // if (visit.status !== 'ACTIVE') throw new Error("Visita não está ativa.");

            // 2. Create the ClientPlate record
            const plate = await tx.clientPlate.create({
                data: {
                    visitId: visitId,
                    clientId: visit.clientId,
                    weighedById: weighStationOperatorId,
                    totalWeightGrams: totalWeightDecimal,
                    tareWeightGrams: PLATE_TARE_WEIGHT_GRAMS,
                    netWeightGrams: netWeightGrams,
                    calculatedCost: calculatedCost,
                    imageUrl: imageUrl || null,
                    // estimatedContents: {} // Add later if needed
                }
            });

            // 3. Update Visit's totalSpent
            const visitUpdate = await tx.visit.update({
                where: { id: visitId },
                data: {
                    totalSpent: {
                        increment: calculatedCost
                    }
                }
            });

            // TODO: Deduct from BuffetPan(s)? This is complex without knowing contents.
            // Simplest approach: Don't deduct here, rely on manual refill records.
            // Advanced: Estimate contents, deduct average from relevant pans.

            return [plate, visitUpdate];
        });

        // Serialize Decimals for response
        const serializedPlate = {
            ...newPlate,
            totalWeightGrams: newPlate.totalWeightGrams.toString(),
            tareWeightGrams: newPlate.tareWeightGrams.toString(),
            netWeightGrams: newPlate.netWeightGrams.toString(),
            calculatedCost: newPlate.calculatedCost.toString(),
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedPlate },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Error creating client plate:", error);
        if (error instanceof Prisma.PrismaClientInitializationError || (error instanceof Error && error.message.includes("model"))){
             return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Modelos de Buffet/Plate não encontrados no schema Prisma." }, { status: 500 });
         }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Visita não encontrada." }, { status: 404 });
         }
         if (error.message.includes('Peso total') || error.message.includes('Visita não encontrada')) {
             return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 400 });
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor: ${error.message}` },
            { status: 500 }
        );
    }
}