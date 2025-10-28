// PATH: app/api/waste/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// ---- START FIX: Import WasteReason ----
import { WasteRecord, Prisma, StockHolding, WasteReason } from "@prisma/client";
// ---- END FIX ----
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for the incoming waste data
type WasteInput = {
    ingredientId: string;
    venueObjectId: string; // Location where waste occurred/was deducted from
    quantity: string | number;
    reason: WasteReason; // e.g., 'SPOILAGE', 'PREPARATION', 'ACCIDENT'
    notes?: string;
}

// Type for the API response (includes calculated cost)
// ---- START FIX: Match schema fields ----
type WasteRecordResponse = Omit<WasteRecord, 'quantity' | 'costValue'> & {
    quantity: string;
    costValue: string;
// ---- END FIX ----
    ingredient: { name: string; unit: string } | null; // Can be null
    // location: { name: string }; // Location is not a direct relation in schema
    recordedBy: { name: string };
};


/**
 * POST /api/waste
 * Records a waste event, deducts stock, calculates cost.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['COOK', 'BARTENDER', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body: WasteInput = await req.json();
        const { ingredientId, venueObjectId, quantity, reason, notes } = body;

        if (!ingredientId || !venueObjectId || quantity === undefined || !reason) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Ingrediente, Localização, Quantidade e Motivo são obrigatórios." },
                { status: 400 }
            );
        }

        // ---- START FIX: Validate reason against enum ----
        if (!Object.values(WasteReason).includes(reason)) {
             return NextResponse.json<ApiResponse>( { success: false, error: "Motivo inválido." }, { status: 400 });
        }
        // ---- END FIX ----


        let quantityDecimal: Decimal;
        try {
            quantityDecimal = new Decimal(quantity);
            if (quantityDecimal.isNegative() || quantityDecimal.isZero()) {
                throw new Error("Quantidade deve ser positiva.");
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>( { success: false, error: `Formato de quantidade inválido: ${e.message}` }, { status: 400 });
        }

        // --- Transaction: Find holdings, Deduct stock, Calculate cost, Create record ---
        const [wasteRecord] = await prisma.$transaction(async (tx) => {
            // 1. Find Ingredient details
            const ingredient = await tx.ingredient.findUnique({
                 where: { id: ingredientId },
                 select: { name: true, unit: true, costPerUnit: true }
            });
            if (!ingredient) throw new Error("Ingrediente não encontrado.");

            // 2. Find relevant StockHoldings at the specified location
            const holdings = await tx.stockHolding.findMany({
                where: {
                    ingredientId: ingredientId,
                    venueObjectId: venueObjectId, // venueObjectId is correct for StockHolding
                    quantity: { gt: 0 }
                },
                orderBy: {
                    createdAt: 'asc' // FIFO
                }
            });

            // 3. Deduct quantity and calculate cost
            let remainingToDeduct = quantityDecimal;
            let totalCostOfWaste = new Decimal(0);
            let actualDeducted = new Decimal(0);

            for (const holding of holdings) {
                if (remainingToDeduct.isZero()) break;

                const quantityToDeductFromHolding = Decimal.min(remainingToDeduct, holding.quantity);
                const costPerUnit = holding.costAtAcquisition ?? ingredient.costPerUnit;

                await tx.stockHolding.update({
                    where: { id: holding.id },
                    data: { quantity: { decrement: quantityToDeductFromHolding } }
                });

                totalCostOfWaste = totalCostOfWaste.plus(quantityToDeductFromHolding.times(costPerUnit));
                remainingToDeduct = remainingToDeduct.minus(quantityToDeductFromHolding);
                actualDeducted = actualDeducted.plus(quantityToDeductFromHolding);
            }

            // 4. Check if enough stock was available
            if (remainingToDeduct.gt(0)) {
                throw new Error(`Estoque insuficiente de "${ingredient.name}" (${ingredient.unit}) na localização selecionada. Necessário: ${quantityDecimal.toString()}, Disponível: ${actualDeducted.toString()}.`);
            }

            // 5. Create the WasteRecord
            // ---- START FIX: Match WasteRecord schema ----
            const record = await tx.wasteRecord.create({
                data: {
                    recordedById: userId, // Use recordedById
                    ingredientId: ingredientId,
                    // productId: null, // Set if you support wasting products
                    // stockHoldingId: null, // Can't easily link to multiple holdings
                    quantity: quantityDecimal, 
                    unit: ingredient.unit, // Add the unit
                    reason: reason,
                    notes: notes,
                    costValue: totalCostOfWaste, // Use costValue
                },
                include: { 
                    ingredient: { select: { name: true, unit: true } },
                    // location is not a direct relation on WasteRecord
                    recordedBy: { select: { name: true } },
                }
            });
            // ---- END FIX ----

            return [record];
        }, {
             maxWait: 10000, 
             timeout: 20000,
        }); // End transaction

        // Serialize Decimals for the response
        // ---- START FIX: Match schema fields ----
        const serializedRecord: WasteRecordResponse = {
            ...wasteRecord,
            quantity: wasteRecord.quantity.toString(),
            costValue: wasteRecord.costValue.toString(),
        };
        // ---- END FIX ----

        return NextResponse.json<ApiResponse<WasteRecordResponse>>(
            { success: true, data: serializedRecord },
            { status: 201 } // 201 Created
        );

    } catch (error: any) {
        console.error("Error recording waste:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003') { 
                 if (error.meta?.field_name?.toString().includes('ingredientId')) return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente não encontrado." }, { status: 404 });
                 // if (error.meta?.field_name?.toString().includes('venueObjectId')) ... // Not a field on WasteRecord
                 if (error.meta?.field_name?.toString().includes('recordedById')) return NextResponse.json<ApiResponse>({ success: false, error: "Usuário registrador não encontrado." }, { status: 404 });
             }
             if (error.code === 'P2025') { 
                  return NextResponse.json<ApiResponse>({ success: false, error: "Lote de estoque não encontrado durante a dedução." }, { status: 404 });
             }
        }
         if (error.message.startsWith('Estoque insuficiente') || error.message.includes('não encontrado')) {
             return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 400 }); 
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor: ${error.message}` },
            { status: 500 }
        );
    }
}