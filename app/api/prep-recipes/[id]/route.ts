// PATH: app/api/prep-recipes/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { PrepRecipe, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

type RouteParams = {
  params: { id: string };
};

// Type for updating PrepRecipe (allows partial updates)
type PrepRecipeUpdateInput = {
    name?: string;
    outputIngredientId?: string;
    outputQuantity?: string | number;
    notes?: string;
    estimatedLaborTime?: number;
    // Inputs need special handling (delete old, create new)
    inputs?: {
        ingredientId: string;
        quantity: string | number;
    }[];
}

/**
 * GET /api/prep-recipes/[id]
 * Fetches a single preparation recipe definition by ID.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const id = params.id;
    try {
        const prepRecipe = await prisma.prepRecipe.findUnique({
             where: { id },
             include: {
                outputIngredient: { select: { id: true, name: true, unit: true } },
                inputs: {
                    include: {
                        ingredient: { select: { id: true, name: true, unit: true } }
                    },
                     orderBy: { ingredient: { name: 'asc' }}
                }
            },
        });

         if (!prepRecipe) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não encontrada." }, { status: 404 });
         }

        // Serialize Decimals
        const serializedRecipe = {
            ...prepRecipe,
            outputQuantity: prepRecipe.outputQuantity.toString(),
            inputs: prepRecipe.inputs.map(inp => ({
                ...inp,
                quantity: inp.quantity.toString(),
            }))
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedRecipe },
            { status: 200 }
        );

    } catch (error) {
        console.error(`Error fetching prep recipe ${id}:`, error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao buscar receita de preparo." },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/prep-recipes/[id]
 * Updates an existing preparation recipe definition.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    // TODO: Define appropriate roles (MANAGER, OWNER, COOK?)
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const id = params.id;

    try {
        const body: PrepRecipeUpdateInput = await req.json();
        const { name, outputIngredientId, outputQuantity, notes, estimatedLaborTime, inputs } = body;

        const updateData: Prisma.PrepRecipeUpdateArgs['data'] = {};

        if (name !== undefined) updateData.name = name;
        if (notes !== undefined) updateData.notes = notes;
        if (estimatedLaborTime !== undefined) updateData.estimatedLaborTime = estimatedLaborTime;

        // Validate output quantity if provided
        if (outputQuantity !== undefined) {
            try {
                const outputQuantityDecimal = new Decimal(outputQuantity);
                if (outputQuantityDecimal.isNegative() || outputQuantityDecimal.isZero()) {
                    throw new Error("Quantidade de saída deve ser positiva.");
                }
                updateData.outputQuantity = outputQuantityDecimal;
            } catch (e: any) {
                 return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade de saída inválida: ${e.message}` }, { status: 400 });
            }
        }

        // Validate output ingredient if provided
        if (outputIngredientId !== undefined) {
             const outputIngredient = await prisma.ingredient.findUnique({ where: { id: outputIngredientId }});
             if (!outputIngredient) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente de saída não encontrado." }, { status: 404 });
             }
             if (!outputIngredient.isPrepared) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente de saída deve ser marcado como 'preparado'." }, { status: 400 });
             }
             updateData.outputIngredientId = outputIngredientId;
        }


        // Handle inputs update (delete existing, create new)
        let inputsToCreate: Prisma.PrepRecipeInputCreateManyPrepRecipeInput[] | undefined = undefined;
        if (inputs !== undefined) {
             if (inputs.length === 0) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo deve ter pelo menos um ingrediente de entrada." }, { status: 400 });
             }
             inputsToCreate = [];
             for (const input of inputs) {
                if (!input.ingredientId || input.quantity === undefined) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Cada ingrediente de entrada deve ter ID e quantidade." }, { status: 400 });
                }
                try {
                    const inputQuantityDecimal = new Decimal(input.quantity);
                    if (inputQuantityDecimal.isNegative() || inputQuantityDecimal.isZero()) {
                        throw new Error(`Quantidade para o ingrediente ID ${input.ingredientId} deve ser positiva.`);
                    }
                    inputsToCreate.push({
                        ingredientId: input.ingredientId,
                        quantity: inputQuantityDecimal,
                    });
                } catch (e: any) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade de entrada inválida: ${e.message}` }, { status: 400 });
                }
             }
        }

        // Perform update in transaction if inputs are changing
        const updatedPrepRecipe = await prisma.$transaction(async (tx) => {
            if (inputsToCreate) {
                // Delete existing inputs for this recipe
                await tx.prepRecipeInput.deleteMany({
                    where: { prepRecipeId: id }
                });
                // Update recipe and create new inputs
                return await tx.prepRecipe.update({
                    where: { id },
                    data: {
                        ...updateData,
                        inputs: {
                            createMany: { data: inputsToCreate }
                        }
                    },
                     include: { inputs: { include: { ingredient: { select: { name: true, unit: true }}}}, outputIngredient: { select: { name: true, unit: true }} } // Include for response
                });
            } else {
                 // Only update basic fields, no input changes
                 return await tx.prepRecipe.update({
                    where: { id },
                    data: updateData,
                    include: { inputs: { include: { ingredient: { select: { name: true, unit: true }}}}, outputIngredient: { select: { name: true, unit: true }} }
                 });
            }
        });


        // Serialize Decimals for response
        const serializedRecipe = {
            ...updatedPrepRecipe,
            outputQuantity: updatedPrepRecipe.outputQuantity.toString(),
            inputs: updatedPrepRecipe.inputs.map(inp => ({
                ...inp,
                quantity: inp.quantity.toString(),
            }))
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedRecipe },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error updating prep recipe ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não encontrada." }, { status: 404 });
             }
             if (error.code === 'P2002' && error.meta?.target === 'PrepRecipe_name_key') {
                return NextResponse.json<ApiResponse>({ success: false, error: "Já existe uma receita de preparo com este nome." }, { status: 409 });
            }
              if (error.code === 'P2003') { // FK constraint
                if (error.meta?.field_name?.toString().includes('outputIngredientId')) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente de saída não encontrado." }, { status: 404 });
                }
                if (error.meta?.field_name?.toString().includes('ingredientId')) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Um ou mais ingredientes de entrada não foram encontrados." }, { status: 404 });
                }
            }
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao atualizar receita de preparo" },
            { status: 500 }
        );
    }
}


/**
 * DELETE /api/prep-recipes/[id]
 * Deletes a preparation recipe definition.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    // TODO: Define appropriate roles
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const id = params.id;

    try {
        // Check if any PrepTasks use this recipe
         const taskCount = await prisma.prepTask.count({ where: { prepRecipeId: id } });
         if (taskCount > 0) {
              return NextResponse.json<ApiResponse>(
                 { success: false, error: "Não é possível excluir. Esta receita já foi usada em tarefas de preparo registradas." },
                 { status: 409 } // Conflict
             );
         }


        // Deletion cascades to PrepRecipeInput via schema rule
        const deletedRecipe = await prisma.prepRecipe.delete({
            where: { id },
        });

        return NextResponse.json<ApiResponse<{ id: string }>>(
            { success: true, data: { id: deletedRecipe.id } },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error deleting prep recipe ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não encontrada." }, { status: 404 });
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao excluir receita de preparo" },
            { status: 500 }
        );
    }
}