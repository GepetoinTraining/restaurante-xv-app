// PATH: app/api/buffet/pans/[id]/refill/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { BuffetPan, StockHolding, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

type RouteParams = {
    params: { id: string }; // Pan ID
};

type RefillInput = {
    quantityToAdd: string | number;
    sourceLocationId: string; // VenueObject ID where the source stock is
}

/**
 * POST /api/buffet/pans/[id]/refill
 * Refills a buffet pan, deducting stock from a source location.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    // Define roles allowed to refill
    if (!session.user?.isLoggedIn || !['COOK', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const panId = params.id;

    try {
        const body: RefillInput = await req.json();
        const { quantityToAdd, sourceLocationId } = body;

        if (!quantityToAdd || !sourceLocationId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Quantidade e Localização de Origem são obrigatórios." }, { status: 400 });
        }

        let quantityToAddDecimal: Decimal;
        try {
            quantityToAddDecimal = new Decimal(quantityToAdd);
            if (quantityToAddDecimal.isNegative() || quantityToAddDecimal.isZero()) {
                throw new Error("Quantidade a adicionar deve ser positiva.");
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade inválida: ${e.message}` }, { status: 400 });
        }

        // --- Transaction: Find Pan, Deduct Stock, Update Pan ---
        const updatedPan = await prisma.$transaction(async (tx) => {
            // 1. Get Pan details (including ingredientId and capacity)
            const pan = await tx.buffetPan.findUnique({
                where: { id: panId },
                include: { ingredient: { select: { id: true, name: true, unit: true } } } // Include ingredient for error message
            });
            if (!pan) throw new Error("Cuba do buffet não encontrada.");
            if (!pan.ingredient) throw new Error(`Cuba ${panId} não tem um ingrediente associado.`);

            // Ensure refill doesn't exceed capacity (optional, maybe allow overfilling slightly?)
            // const newQuantity = pan.currentQuantity.plus(quantityToAddDecimal);
            // if (newQuantity.gt(pan.capacity)) {
            //     throw new Error(`Quantidade excede a capacidade da cuba (${pan.capacity.toString()} ${pan.ingredient.unit}).`);
            // }

            // 2. Deduct from StockHolding at sourceLocationId
            const ingredientId = pan.ingredientId;
            const requiredQuantity = quantityToAddDecimal;
            let deductedAmount = new Decimal(0);
            const holdings = await tx.stockHolding.findMany({
                where: { ingredientId, venueObjectId: sourceLocationId, quantity: { gt: 0 } },
                orderBy: { createdAt: 'asc' } // FIFO
            });

            for (const holding of holdings) {
                const quantityToDeduct = Decimal.min(requiredQuantity.minus(deductedAmount), holding.quantity);
                await tx.stockHolding.update({ where: { id: holding.id }, data: { quantity: { decrement: quantityToDeduct } } });
                deductedAmount = deductedAmount.plus(quantityToDeduct);
                if (deductedAmount.gte(requiredQuantity)) break;
            }

            if (deductedAmount.lt(requiredQuantity)) {
                throw new Error(`Estoque insuficiente de "${pan.ingredient.name}" na origem. Necessário: ${requiredQuantity.toString()}, Disponível: ${deductedAmount.toString()}.`);
            }

            // 3. Update BuffetPan quantity
            return await tx.buffetPan.update({
                where: { id: panId },
                data: {
                    currentQuantity: {
                        increment: quantityToAddDecimal
                    }
                },
                 include: { ingredient: { select: { id: true, name: true, unit: true } } } // Include for response
            });

        }, { timeout: 15000 }); // Increase timeout slightly

         // Serialize Decimal fields
        const serializedPan = {
             ...updatedPan,
             currentQuantity: updatedPan.currentQuantity.toString(),
             capacity: updatedPan.capacity.toString(),
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedPan },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error refilling buffet pan ${panId}:`, error);
         if (error instanceof Prisma.PrismaClientInitializationError || (error instanceof Error && error.message.includes("model"))){
             return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Modelos de Buffet não encontrados no schema Prisma." }, { status: 500 });
         }
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Cuba do buffet ou localização de estoque não encontrada." }, { status: 404 });
         }
         if (error.message.startsWith('Estoque insuficiente') || error.message.startsWith('Cuba do buffet não encontrada') || error.message.includes('capacidade da cuba')) {
             return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 400 }); // Bad request due to business logic
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor: ${error.message}` },
            { status: 500 }
        );
    }
}