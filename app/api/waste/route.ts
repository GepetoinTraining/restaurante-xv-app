// PATH: app/api/waste/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { WasteRecord, Prisma, StockHolding } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for the incoming waste data
type WasteInput = {
    ingredientId: string;
    venueObjectId: string; // Location where waste occurred/was deducted from
    quantity: string | number;
    reason: string; // e.g., 'Expired', 'Spoiled', 'Dropped', 'Burnt', 'Contaminated', 'Other'
    notes?: string;
}

// Type for the API response (includes calculated cost)
type WasteRecordResponse = Omit<WasteRecord, 'quantity' | 'cost'> & {
    quantity: string;
    cost: string;
    ingredient: { name: string; unit: string };
    location: { name: string };
    recordedBy: { name: string };
};


/**
 * POST /api/waste
 * Records a waste event, deducts stock, calculates cost.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // Allow roles that handle inventory or manage operations
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

        let quantityDecimal: Decimal;
        try {
            quantityDecimal = new Decimal(quantity);
            if (quantityDecimal.isNegative() || quantityDecimal.isZero()) {
                throw new Error("Quantidade deve ser positiva.");
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>( { success: false, error: `Formato de quantidade inválido: ${e.message}` }, { status: 400 });
        }

        if (String(reason).trim().length === 0) {
             return NextResponse.json<ApiResponse>( { success: false, error: "Motivo não pode ser vazio." }, { status: 400 });
        }

        // --- Transaction: Find holdings, Deduct stock, Calculate cost, Create record ---
        const [wasteRecord] = await prisma.$transaction(async (tx) => {
            // 1. Find Ingredient details (for unit and average cost fallback)
            const ingredient = await tx.ingredient.findUnique({
                 where: { id: ingredientId },
                 select: { name: true, unit: true, costPerUnit: true }
            });
            if (!ingredient) throw new Error("Ingrediente não encontrado.");

            // 2. Find relevant StockHoldings at the specified location
            const holdings = await tx.stockHolding.findMany({
                where: {
                    ingredientId: ingredientId,
                    venueObjectId: venueObjectId,
                    quantity: { gt: 0 } // Only consider holdings with stock
                },
                orderBy: {
                    // Decide deduction logic: FIFO (oldest first) or LIFO (newest first)?
                    // FIFO is generally preferred for food inventory.
                    createdAt: 'asc'
                }
            });

            // 3. Deduct quantity and calculate cost
            let remainingToDeduct = quantityDecimal;
            let totalCostOfWaste = new Decimal(0);
            let actualDeducted = new Decimal(0);

            for (const holding of holdings) {
                if (remainingToDeduct.isZero()) break;

                const quantityToDeductFromHolding = Decimal.min(remainingToDeduct, holding.quantity);
                const costPerUnit = holding.costAtAcquisition ?? ingredient.costPerUnit; // Use batch cost if available, else average

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
                // Not enough stock found across all batches at that location
                throw new Error(`Estoque insuficiente de "${ingredient.name}" (${ingredient.unit}) na localização selecionada. Necessário: ${quantityDecimal.toString()}, Disponível: ${actualDeducted.toString()}.`);
            }

            // 5. Create the WasteRecord
            const record = await tx.wasteRecord.create({
                data: {
                    ingredientId: ingredientId,
                    venueObjectId: venueObjectId,
                    userId: userId,
                    quantity: quantityDecimal, // The originally requested quantity
                    reason: reason,
                    notes: notes,
                    cost: totalCostOfWaste, // Calculated cost
                },
                include: { // Include related data for the response
                    ingredient: { select: { name: true, unit: true } },
                    location: { select: { name: true } },
                    recordedBy: { select: { name: true } },
                }
            });

            return [record];
        }, {
             maxWait: 10000, // Slightly longer timeout
             timeout: 20000,
        }); // End transaction

        // Serialize Decimals for the response
        const serializedRecord: WasteRecordResponse = {
            ...wasteRecord,
            quantity: wasteRecord.quantity.toString(),
            cost: wasteRecord.cost.toString(),
        };

        return NextResponse.json<ApiResponse<WasteRecordResponse>>(
            { success: true, data: serializedRecord },
            { status: 201 } // 201 Created
        );

    } catch (error: any) {
        console.error("Error recording waste:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003') { // Foreign key constraint
                 if (error.meta?.field_name?.toString().includes('ingredientId')) return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente não encontrado." }, { status: 404 });
                 if (error.meta?.field_name?.toString().includes('venueObjectId')) return NextResponse.json<ApiResponse>({ success: false, error: "Localização não encontrada." }, { status: 404 });
                 if (error.meta?.field_name?.toString().includes('userId')) return NextResponse.json<ApiResponse>({ success: false, error: "Usuário registrador não encontrado." }, { status: 404 });
             }
             if (error.code === 'P2025') { // Record to update not found (e.g., during stock deduction)
                  return NextResponse.json<ApiResponse>({ success: false, error: "Lote de estoque não encontrado durante a dedução." }, { status: 404 });
             }
        }
         if (error.message.startsWith('Estoque insuficiente') || error.message.includes('não encontrado')) {
             return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 400 }); // Bad request due to logic/data issue
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor: ${error.message}` },
            { status: 500 }
        );
    }
}