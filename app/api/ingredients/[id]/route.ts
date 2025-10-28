// PATH: app/api/ingredients/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Ingredient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

type RouteParams = {
  params: { id: string };
};

/**
 * PATCH /api/ingredients/[id]
 * Updates an existing ingredient definition (name, unit, cost for raw, isPrepared).
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    // TODO: Define appropriate roles
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const id = params.id;

    try {
        const body = await req.json();
        // Allow updating name, unit, costPerUnit (only if not prepared), isPrepared
        const { name, unit, costPerUnit, isPrepared } = body;

        const updateData: Prisma.IngredientUpdateInput = {};
        let inputError: string | null = null;

        // Fetch current ingredient data to validate cost update
        const currentIngredient = await prisma.ingredient.findUnique({ where: { id } });
        if (!currentIngredient) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente não encontrado." }, { status: 404 });
        }

        if (name !== undefined) {
             if (String(name).trim().length < 2) inputError = "Nome deve ter pelo menos 2 caracteres";
             else updateData.name = String(name).trim();
        }
        if (unit !== undefined) {
             if (String(unit).trim().length < 1) inputError = "Unidade não pode ser vazia";
             else updateData.unit = String(unit).trim();
        }
        if (isPrepared !== undefined) {
            updateData.isPrepared = !!isPrepared;
            // If changing to prepared, force cost to 0 (will be calculated)
            // If changing *from* prepared, allow cost to be set (needs costPerUnit in body)
            if (!!isPrepared) {
                 updateData.costPerUnit = new Decimal(0);
            } else if (currentIngredient.isPrepared && !isPrepared) {
                // Changing FROM prepared TO raw - require cost input
                 if (costPerUnit === undefined) {
                     inputError = "Custo por unidade é obrigatório ao mudar de 'Preparado' para 'Comprado'.";
                 } else {
                     // Validate cost provided
                      try {
                        const costDecimal = new Decimal(costPerUnit);
                        if (costDecimal.isNegative()) throw new Error();
                        updateData.costPerUnit = costDecimal;
                    } catch {
                        inputError = "Formato de custo inválido ou negativo.";
                    }
                 }
            }
        }
        // Only allow updating cost if the item IS NOT and WILL NOT BE prepared
        if (costPerUnit !== undefined && !currentIngredient.isPrepared && (isPrepared === undefined || !isPrepared)) {
             try {
                const costDecimal = new Decimal(costPerUnit);
                if (costDecimal.isNegative()) throw new Error();
                updateData.costPerUnit = costDecimal;
            } catch {
                inputError = "Formato de custo inválido ou negativo.";
            }
        }

        if (inputError) {
             return NextResponse.json<ApiResponse>({ success: false, error: inputError }, { status: 400 });
        }
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Nenhum dado fornecido para atualização." }, { status: 400 });
        }

        // Perform the update
        const updatedIngredient = await prisma.ingredient.update({
            where: { id },
            data: updateData,
        });

        // Serialize Decimal for response
        const serializedIngredient = {
            ...updatedIngredient,
            costPerUnit: updatedIngredient.costPerUnit.toString(),
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedIngredient },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error updating ingredient ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') { // Record to update not found
                 return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente não encontrado." }, { status: 404 });
             }
             if (error.code === 'P2002' && error.meta?.target === 'Ingredient_name_key') {
                return NextResponse.json<ApiResponse>({ success: false, error: "Já existe um ingrediente com este nome." }, { status: 409 });
            }
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao atualizar ingrediente." },
            { status: 500 }
        );
    }
}

// GET /api/ingredients/[id] could be added if needed to fetch a single definition