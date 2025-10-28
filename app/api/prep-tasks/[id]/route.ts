// PATH: app/api/prep-tasks/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse, SerializedPrepTask } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// Import all needed models for typing
import { PrepTask, Prisma, PrepTaskStatus, Ingredient, PrepRecipe, User, VenueObject } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

type RouteParams = {
    params: { id: string };
};

// Type for PATCH request body
type PrepTaskUpdateInput = {
    status: PrepTaskStatus; // Required: New status
    assignedToUserId?: string | null; // For assigning/unassigning
    quantityRun?: string | number | null; // For completing
}

// --- START FIX: Define payload type ---
// Define the include object once
const prepTaskInclude = {
    prepRecipe: {
        select: {
            id: true,
            name: true,
            outputIngredient: { select: { name: true, unit: true } },
            estimatedLaborTime: true,
            outputQuantity: true
        }
    },
    assignedTo: { select: { id: true, name: true } },
    executedBy: { select: { id: true, name: true } },
    location: { select: { id: true, name: true } },
};

// Define the type of the task returned by the update
type UpdatedPrepTask = Prisma.PrepTaskGetPayload<{
    include: typeof prepTaskInclude
}>;
// --- END FIX ---


/**
 * PATCH /api/prep-tasks/[id]
 * Updates the status of a PrepTask (Claim, Start, Complete, Cancel).
 * Handles stock adjustments upon completion.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const userId = session.user.id; // User performing the action
    const userRole = session.user.role;
    const taskId = params.id;

    try {
        const body: PrepTaskUpdateInput = await req.json();
        const { status: newStatus, assignedToUserId, quantityRun } = body;

        if (!newStatus || !Object.values(PrepTaskStatus).includes(newStatus)) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Novo status inválido ou não fornecido." }, { status: 400 });
        }

        const task = await prisma.prepTask.findUnique({
            where: { id: taskId },
            include: {
                 prepRecipe: {
                    include: {
                        inputs: { include: { ingredient: true } },
                        outputIngredient: true
                    }
                },
                location: true, // Include location for stock logic
                assignedTo: true // Include for status change logic
            }
        });

        if (!task) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Tarefa de preparo não encontrada." }, { status: 404 });
        }
        // Ensure location is loaded for stock logic
        if (!task.location) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Localização da tarefa (locationId) não encontrada." }, { status: 500 });
        }

        // --- Authorization and State Transition Logic ---
        const currentStatus = task.status;
        let updateData: Prisma.PrepTaskUpdateInput = { status: newStatus };
        let requiresStockTransaction = false;
        let quantityRunDecimal: Decimal | null = null;

        switch (newStatus) {
            case PrepTaskStatus.ASSIGNED:
                // Manager/Owner assigns a PENDING task to someone
                if (currentStatus !== PrepTaskStatus.PENDING) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível atribuir uma tarefa com status ${currentStatus}.` }, { status: 400 });
                }
                if (!['MANAGER', 'OWNER'].includes(userRole)) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem atribuir tarefas." }, { status: 403 });
                }
                if (!assignedToUserId) { // Use the destructured variable
                     return NextResponse.json<ApiResponse>({ success: false, error: "Usuário para atribuição não fornecido." }, { status: 400 });
                }
                // Validate assigned user exists
                const assignedUser = await prisma.user.findUnique({ where: { id: assignedToUserId }});
                if (!assignedUser) return NextResponse.json<ApiResponse>({ success: false, error: "Usuário atribuído não encontrado." }, { status: 404 });

                // --- START FIX: Use relational update ---
                updateData.assignedTo = { connect: { id: assignedToUserId } };
                // --- END FIX ---
                updateData.assignedAt = new Date();
                break;

            case PrepTaskStatus.IN_PROGRESS:
                // Assigned user starts the task OR user claims a PENDING task
                if (currentStatus === PrepTaskStatus.PENDING) {
                    // Claiming
                    // --- START FIX: Use relational update ---
                    updateData.assignedTo = { connect: { id: userId } }; // Claim for self
                    // --- END FIX ---
                    updateData.assignedAt = new Date();
                    updateData.startedAt = new Date();
                } else if (currentStatus === PrepTaskStatus.ASSIGNED) {
                    // Starting assigned task
                    if (task.assignedToUserId !== userId && !['MANAGER', 'OWNER'].includes(userRole)) {
                         return NextResponse.json<ApiResponse>({ success: false, error: "Você não pode iniciar uma tarefa atribuída a outro usuário." }, { status: 403 });
                    }
                     updateData.startedAt = new Date();
                     // Ensure assignedTo user ID is set if not already
                     if (!task.assignedToUserId) {
                         // This case should be rare if logic is correct, but good to have
                         updateData.assignedTo = { connect: { id: userId } };
                     }
                } else {
                     return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível iniciar una tarefa com status ${currentStatus}.` }, { status: 400 });
                }
                break;

             case PrepTaskStatus.COMPLETED:
                 // User completes an IN_PROGRESS task
                if (currentStatus !== PrepTaskStatus.IN_PROGRESS) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível completar uma tarefa com status ${currentStatus}.` }, { status: 400 });
                }
                // Ensure the user completing is the one assigned or a manager/owner
                if (task.assignedToUserId !== userId && !['MANAGER', 'OWNER'].includes(userRole)) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Você não pode completar uma tarefa atribuída a outro usuário." }, { status: 403 });
                }
                if (quantityRun === undefined || quantityRun === null) {
                     return NextResponse.json<ApiResponse>({ success: false, error: "Quantidade produzida é obrigatória para completar." }, { status: 400 });
                }
                // Validate quantity produced
                try {
                    quantityRunDecimal = new Decimal(quantityRun);
                    if (quantityRunDecimal.isNegative()) {
                        throw new Error("Quantidade produzida deve ser zero ou positiva.");
                    }
                } catch (e: any) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade produzida inválida: ${e.message}` }, { status: 400 });
                }

                updateData.quantityRun = quantityRunDecimal;
                updateData.completedAt = new Date();
                // --- START FIX: Use relational update ---
                updateData.executedBy = { connect: { id: userId } }; // User who marked as complete
                // --- END FIX ---
                requiresStockTransaction = true; // Trigger stock logic
                break;

            case PrepTaskStatus.CANCELLED:
                 // Manager/Owner can cancel PENDING or ASSIGNED tasks
                 // --- START FIX: Use type-safe check ---
                 if (currentStatus !== PrepTaskStatus.PENDING && currentStatus !== PrepTaskStatus.ASSIGNED) {
                 // --- END FIX ---
                     return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível cancelar uma tarefa com status ${currentStatus}.` }, { status: 400 });
                 }
                 if (!['MANAGER', 'OWNER'].includes(userRole)) {
                     return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem cancelar tarefas." }, { status: 403 });
                 }
                 break;

            case PrepTaskStatus.PENDING:
                // Manager/Owner unassigns an ASSIGNED task
                if (currentStatus !== PrepTaskStatus.ASSIGNED) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível redefinir para Pendente uma tarefa com status ${currentStatus}.` }, { status: 400 });
                }
                 if (!['MANAGER', 'OWNER'].includes(userRole)) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem remover atribuição." }, { status: 403 });
                }
                // --- START FIX: Use relational update ---
                updateData.assignedTo = { disconnect: true };
                // --- END FIX ---
                updateData.assignedAt = null;
                break;

             default:
                return NextResponse.json<ApiResponse>({ success: false, error: `Transição de status inválida para ${newStatus}` }, { status: 400 });

        }


        // --- Execute Update (with or without stock transaction) ---
        // --- START FIX: Use correct type ---
        let updatedTask: UpdatedPrepTask;
        // --- END FIX ---

        if (requiresStockTransaction && quantityRunDecimal !== null) {
             // ** Perform stock update within a transaction **
             const finalQuantityRun = quantityRunDecimal; // Capture for use inside transaction
             updatedTask = await prisma.$transaction(async (tx) => {
                 // --- Stock Deduction Logic ---
                 if (!task.prepRecipe?.outputQuantity) throw new Error("Detalhes da receita (outputQuantity) não encontrados na tarefa.");
                 if (!task.prepRecipe?.inputs || task.prepRecipe.inputs.length === 0) throw new Error("Detalhes da receita (inputs) não encontrados na tarefa.");

                 const runs = finalQuantityRun.dividedBy(task.prepRecipe.outputQuantity);

                 for (const input of task.prepRecipe.inputs) {
                      if (!input.ingredient) throw new Error(`Detalhes do ingrediente de entrada (ID: ${input.ingredientId}) não encontrados.`);

                     const requiredQuantity = input.quantity.times(runs);
                     let deductedAmount = new Decimal(0);
                     const holdings = await tx.stockHolding.findMany({
                         where: { ingredientId: input.ingredientId, venueObjectId: task.locationId, quantity: { gt: 0 } },
                         orderBy: { createdAt: 'asc' }
                     });
                     for (const holding of holdings) {
                         const quantityToDeduct = Decimal.min(requiredQuantity.minus(deductedAmount), holding.quantity);
                         if (quantityToDeduct.lte(0)) continue;
                         await tx.stockHolding.update({ where: { id: holding.id }, data: { quantity: { decrement: quantityToDeduct } } });
                         deductedAmount = deductedAmount.plus(quantityToDeduct);
                         if (deductedAmount.gte(requiredQuantity)) break;
                     }
                     if (deductedAmount.lt(requiredQuantity)) {
                         throw new Error(`Estoque insuficiente de "${input.ingredient.name}" (${input.ingredient.unit}). Necessário: ${requiredQuantity.toFixed(3)}, Disponível: ${deductedAmount.toFixed(3)}.`);
                     }
                 }
                 // --- End Stock Deduction ---

                 // --- Stock Addition Logic ---
                 if (!task.prepRecipe.outputIngredientId) throw new Error("Detalhes da receita (outputIngredientId) não encontrados na tarefa."); // Check ID existence
                 if (!task.prepRecipe.outputIngredient) throw new Error("Detalhes da receita (outputIngredient) não encontrados na tarefa."); // Check full object existence

                 const existingOutputHolding = await tx.stockHolding.findFirst({
                      where: { ingredientId: task.prepRecipe.outputIngredientId, venueObjectId: task.locationId },
                 });
                 // Calculate cost
                 let totalInputCost = new Decimal(0);
                  for (const input of task.prepRecipe.inputs) {
                      if (!input.ingredient) throw new Error(`Detalhes do ingrediente de entrada (ID: ${input.ingredientId}) não encontrados para cálculo de custo.`);
                      const inputCost = input.ingredient.costPerUnit.times(input.quantity.times(runs));
                      totalInputCost = totalInputCost.plus(inputCost);
                  }
                 const costPerOutputUnit = finalQuantityRun.isZero() ? new Decimal(0) : totalInputCost.dividedBy(finalQuantityRun);

                 if (existingOutputHolding) {
                     await tx.stockHolding.update({ where: { id: existingOutputHolding.id }, data: { quantity: { increment: finalQuantityRun } } });
                 } else if (finalQuantityRun.gt(0)) {
                      await tx.stockHolding.create({
                         data: {
                             ingredientId: task.prepRecipe.outputIngredientId,
                             venueObjectId: task.locationId,
                             quantity: finalQuantityRun,
                             costAtAcquisition: costPerOutputUnit,
                             purchaseDate: new Date(),
                         }
                     });
                 }
                  // --- End Stock Addition ---

                 // --- Recalculate Average Cost ---
                const allHoldings = await tx.stockHolding.findMany({ where: { ingredientId: task.prepRecipe.outputIngredientId, quantity: { gt: 0 } } });
                let totalValue = new Decimal(0);
                let totalQuantity = new Decimal(0);
                allHoldings.forEach(h => {
                    if (!task.prepRecipe.outputIngredient) throw new Error("Detalhes do ingrediente de saída não encontrados para cálculo de custo médio.");
                    const cost = h.costAtAcquisition ?? task.prepRecipe.outputIngredient.costPerUnit;
                    totalValue = totalValue.plus(h.quantity.times(cost));
                    totalQuantity = totalQuantity.plus(h.quantity);
                });
                const newAverageCost = totalQuantity.isZero() ? new Decimal(0) : totalValue.dividedBy(totalQuantity);
                await tx.ingredient.update({ where: { id: task.prepRecipe.outputIngredientId }, data: { costPerUnit: newAverageCost } });
                // --- End Average Cost ---

                 // --- Finally, update the task status itself ---
                 return await tx.prepTask.update({
                     where: { id: taskId },
                     data: updateData, // Contains new status, completedAt, executedBy, quantityRun
                     // --- START FIX: Use include const ---
                     include: prepTaskInclude
                     // --- END FIX ---
                 });
             }, {
                 maxWait: 15000,
                 timeout: 30000,
             }); // End Transaction

        } else {
             // Just update the task status without stock changes
             updatedTask = await prisma.prepTask.update({
                 where: { id: taskId },
                 data: updateData, // Contains new status and potentially assignedTo, startedAt etc.
                 // --- START FIX: Use include const ---
                 include: prepTaskInclude
                 // --- END FIX ---
             });
        }


        // Serialize Decimals for response
        // --- START FIX: This block should now work correctly ---
        const serializedTask: SerializedPrepTask = {
            ...updatedTask,
            targetQuantity: updatedTask.targetQuantity.toString(),
            quantityRun: updatedTask.quantityRun ? updatedTask.quantityRun.toString() : null,
            prepRecipe: {
                id: updatedTask.prepRecipe.id,
                name: updatedTask.prepRecipe.name,
                outputIngredient: updatedTask.prepRecipe.outputIngredient, // This is { name, unit } | null
                estimatedLaborTime: updatedTask.prepRecipe.estimatedLaborTime,
                outputQuantity: updatedTask.prepRecipe.outputQuantity.toString(),
            },
            createdAt: updatedTask.createdAt.toISOString(),
            assignedAt: updatedTask.assignedAt?.toISOString() ?? null,
            startedAt: updatedTask.startedAt?.toISOString() ?? null,
            completedAt: updatedTask.completedAt?.toISOString() ?? null,
        };
        // --- END FIX ---

        return NextResponse.json<ApiResponse<SerializedPrepTask>>(
            { success: true, data: serializedTask },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error updating prep task ${taskId}:`, error);
        if (error.message.startsWith('Estoque insuficiente')) {
             return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 409 });
        }
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Tarefa ou registro relacionado não encontrado during a atualização." }, { status: 404 });
         }
         if (error.message.includes('Transaction API error') || error.message.includes('timed out')) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Erro de transação ou tempo limite. Verifique o estoque e tente novamente." }, { status: 504 });
         }
          if (error.message.includes('não encontrados na tarefa') || error.message.includes('Detalhes do ingrediente') || error.message.includes('Localização da tarefa')) {
             console.error("Data inconsistency error:", error.message);
             return NextResponse.json<ApiResponse>({ success: false, error: `Erro de dados internos: ${error.message}` }, { status: 500 });
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor ao atualizar tarefa: ${error.message}` },
            { status: 500 }
        );
    }
}