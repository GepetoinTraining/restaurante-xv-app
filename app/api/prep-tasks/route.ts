// PATH: app/api/prep-tasks/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { PrepTask, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for creating PrepTask
type PrepTaskCreateInput = {
    prepRecipeId: string;
    quantityRun: string | number; // How many units of the *output* were made
    locationId: string; // VenueObject ID where prep happened / output stored
    notes?: string;
}

/**
 * POST /api/prep-tasks
 * Executes a preparation task: Records the task and adjusts stock holdings.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // TODO: Define appropriate roles (COOK, BARTENDER, MANAGER?)
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const userId = session.user.id; // User performing the task

    try {
        const body: PrepTaskCreateInput = await req.json();
        const { prepRecipeId, quantityRun, locationId, notes } = body;

        if (!prepRecipeId || quantityRun === undefined || !locationId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ID da Receita de Preparo, Quantidade Produzida e Localização são obrigatórios." },
                { status: 400 }
            );
        }

        // Validate quantity produced
        let quantityRunDecimal: Decimal;
        try {
            quantityRunDecimal = new Decimal(quantityRun);
            if (quantityRunDecimal.isNegative() || quantityRunDecimal.isZero()) {
                throw new Error("Quantidade produzida deve ser positiva.");
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade produzida inválida: ${e.message}` }, { status: 400 });
        }

        // Fetch the PrepRecipe to get input ingredients and output details
        const prepRecipe = await prisma.prepRecipe.findUnique({
            where: { id: prepRecipeId },
            include: {
                inputs: { include: { ingredient: true } }, // Include full ingredient for unit info
                outputIngredient: true,
            }
        });

        if (!prepRecipe) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não encontrada." }, { status: 404 });
        }

        // Calculate how many times the base recipe was run
        const runs = quantityRunDecimal.dividedBy(prepRecipe.outputQuantity);
        if (!runs.isInteger()) {
            // This might be okay depending on use case, but for simplicity let's require whole runs for now
            // Or adjust logic to handle partial runs if needed
             console.warn(`Prep task for ${prepRecipe.name} resulted in partial recipe runs (${runs.toString()}). Input deduction might be fractional.`);
             // Allow fractional runs for now.
        }

        // --- Stock Adjustment Logic in Transaction ---
        const newPrepTask = await prisma.$transaction(async (tx) => {

            // 1. Deduct Input Ingredients
            for (const input of prepRecipe.inputs) {
                const requiredQuantity = input.quantity.times(runs); // Total needed for this task run
                let deductedAmount = new Decimal(0);

                // Find available stock holdings for this input ingredient at the specified location
                // Order by expiry or purchase date if needed (FIFO/LIFO) - simple deduction for now
                const holdings = await tx.stockHolding.findMany({
                    where: {
                        ingredientId: input.ingredientId,
                        venueObjectId: locationId,
                        quantity: { gt: 0 } // Only consider holdings with stock
                    },
                    orderBy: { createdAt: 'asc' } // Simple FIFO based on creation
                });

                for (const holding of holdings) {
                    const quantityToDeduct = Decimal.min(requiredQuantity.minus(deductedAmount), holding.quantity);

                    await tx.stockHolding.update({
                        where: { id: holding.id },
                        data: {
                            quantity: { decrement: quantityToDeduct }
                        }
                    });

                    deductedAmount = deductedAmount.plus(quantityToDeduct);
                    if (deductedAmount.gte(requiredQuantity)) {
                        break; // Deducted enough
                    }
                }

                // Check if enough stock was found and deducted
                if (deductedAmount.lt(requiredQuantity)) {
                    throw new Error(`Estoque insuficiente de "${input.ingredient.name}" (${input.ingredient.unit}) na localização selecionada. Necessário: ${requiredQuantity.toString()}, Disponível: ${deductedAmount.toString()}.`);
                }
            }

            // 2. Add/Update Output Ingredient StockHolding
            // Find existing holding or create a new one
            const existingOutputHolding = await tx.stockHolding.findFirst({
                 where: {
                     ingredientId: prepRecipe.outputIngredientId,
                     venueObjectId: locationId,
                     // Optional: Match purchase/expiry dates if managing batches strictly?
                     // For simplicity, add to any existing batch or create new if none.
                 },
                 // Consider ordering if multiple batches exist
            });

            // Calculate cost for the produced batch
            // Sum costs of inputs used. This is a simplified calculation.
            let totalInputCost = new Decimal(0);
             for (const input of prepRecipe.inputs) {
                 const inputCost = input.ingredient.costPerUnit.times(input.quantity.times(runs));
                 totalInputCost = totalInputCost.plus(inputCost);
             }
            const costPerOutputUnit = totalInputCost.dividedBy(quantityRunDecimal);


            if (existingOutputHolding) {
                await tx.stockHolding.update({
                    where: { id: existingOutputHolding.id },
                    data: {
                        quantity: { increment: quantityRunDecimal },
                        // Optional: Update cost? Average cost might be complex. Store cost with batch.
                        // costAtAcquisition: /* Recalculate average? */
                    }
                });
            } else {
                 await tx.stockHolding.create({
                    data: {
                        ingredientId: prepRecipe.outputIngredientId,
                        venueObjectId: locationId,
                        quantity: quantityRunDecimal,
                        // Set cost for this new batch
                        costAtAcquisition: costPerOutputUnit,
                        // Set purchaseDate to now, expiryDate maybe based on recipe?
                        purchaseDate: new Date(),
                    }
                });
            }

             // 3. Create the PrepTask record
            const task = await tx.prepTask.create({
                data: {
                    prepRecipeId,
                    quantityRun: quantityRunDecimal,
                    executedById: userId,
                    locationId,
                    notes,
                }
            });

            // Recalculate average cost for the output ingredient (if needed)
            // This could be done here or in a separate process/trigger
            const allHoldings = await tx.stockHolding.findMany({ where: { ingredientId: prepRecipe.outputIngredientId, quantity: { gt: 0 } } });
            let totalValue = new Decimal(0);
            let totalQuantity = new Decimal(0);
            allHoldings.forEach(h => {
                const cost = h.costAtAcquisition ?? prepRecipe.outputIngredient.costPerUnit; // Fallback?
                totalValue = totalValue.plus(h.quantity.times(cost));
                totalQuantity = totalQuantity.plus(h.quantity);
            });
            const newAverageCost = totalQuantity.isZero() ? new Decimal(0) : totalValue.dividedBy(totalQuantity);

             await tx.ingredient.update({
                 where: { id: prepRecipe.outputIngredientId },
                 data: { costPerUnit: newAverageCost }
             });


            return task;

        }); // End Transaction

        // Serialize Decimals for response
        const serializedTask = {
            ...newPrepTask,
            quantityRun: newPrepTask.quantityRun.toString(),
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedTask },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Error executing prep task:", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003') { // FK constraint failed
                 if (error.meta?.field_name?.toString().includes('prepRecipeId')) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não encontrada." }, { status: 404 });
                 }
                 if (error.meta?.field_name?.toString().includes('locationId')) {
                     return NextResponse.json<ApiResponse>({ success: false, error: "Localização não encontrada." }, { status: 404 });
                 }
                 if (error.meta?.field_name?.toString().includes('executedById')) {
                     return NextResponse.json<ApiResponse>({ success: false, error: "Usuário executor não encontrado." }, { status: 404 });
                 }
             }
             // P2025 can happen inside transaction if findUnique fails after initial check
             if (error.code === 'P2025') {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Um registro necessário não foi encontrado durante a transação." }, { status: 404 });
             }
        }
        // Catch specific error from transaction
        if (error.message.startsWith('Estoque insuficiente')) {
             return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao executar tarefa de preparo" },
            { status: 500 }
        );
    }
}

// GET /api/prep-tasks might be useful later for viewing history