// PATH: app/api/stock-holdings/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { StockHolding, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

type RouteParams = {
  params: { id: string };
};

/**
 * PATCH /api/stock-holdings/[id]
 * Updates the quantity of a specific stock holding batch.
 * Accepts either 'quantity' (new total) or 'adjustment' (amount to add/subtract).
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    // TODO: Define appropriate roles
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
         return NextResponse.json<ApiResponse>({ success: false, error: "ID do lote de estoque é obrigatório" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { quantity, adjustment } = body;

        let updateData: Prisma.StockHoldingUpdateInput = {};
        let newQuantityDecimal: Decimal;

        if (quantity !== undefined) {
            // Set exact quantity
            try {
                newQuantityDecimal = new Decimal(quantity);
                 if (newQuantityDecimal.isNegative()) {
                    // Decide if negative stock is allowed. For now, prevent it.
                    return NextResponse.json<ApiResponse>({ success: false, error: "Quantidade não pode ser negativa." }, { status: 400 });
                 }
                updateData.quantity = newQuantityDecimal;
            } catch (e) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Formato de quantidade inválido" }, { status: 400 });
            }
        } else if (adjustment !== undefined) {
            // Adjust quantity
             try {
                const adjustmentDecimal = new Decimal(adjustment);
                 if (adjustmentDecimal.isZero()) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Ajuste não pode ser zero." }, { status: 400 });
                 }

                 // Fetch current quantity to calculate new total and prevent negative stock
                 const currentHolding = await prisma.stockHolding.findUnique({ where: { id } });
                 if (!currentHolding) {
                      return NextResponse.json<ApiResponse>({ success: false, error: "Lote de estoque não encontrado." }, { status: 404 });
                 }
                 newQuantityDecimal = currentHolding.quantity.plus(adjustmentDecimal);

                 if (newQuantityDecimal.isNegative()) {
                     // Prevent negative stock
                     return NextResponse.json<ApiResponse>({ success: false, error: "Ajuste resultaria em estoque negativo." }, { status: 400 });
                 }
                updateData.quantity = newQuantityDecimal; // Update with the calculated new quantity

            } catch (e) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Formato de ajuste inválido" }, { status: 400 });
            }
        } else {
             return NextResponse.json<ApiResponse>({ success: false, error: "É necessário fornecer 'quantity' ou 'adjustment'." }, { status: 400 });
        }


        const updatedHolding = await prisma.stockHolding.update({
            where: { id },
            data: updateData,
        });

        // Serialize Decimal for response
        const serializedHolding = {
            ...updatedHolding,
            quantity: updatedHolding.quantity.toString(),
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedHolding },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error updating stock holding ${id}:`, error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Lote de estoque não encontrado." }, { status: 404 });
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao atualizar lote de estoque" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/stock-holdings/[id]
 * Deletes a specific stock holding batch.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    // TODO: Define appropriate roles
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const id = params.id;
     if (!id) {
         return NextResponse.json<ApiResponse>({ success: false, error: "ID do lote de estoque é obrigatório" }, { status: 400 });
    }

    try {
        const deletedHolding = await prisma.stockHolding.delete({
            where: { id },
        });

        return NextResponse.json<ApiResponse<{ id: string }>>(
            { success: true, data: { id: deletedHolding.id } },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error deleting stock holding ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json<ApiResponse>({ success: false, error: "Lote de estoque não encontrado." }, { status: 404 });
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao excluir lote de estoque" },
            { status: 500 }
        );
    }
}