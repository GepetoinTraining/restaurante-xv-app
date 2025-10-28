// PATH: app/api/prep-tasks/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse, SerializedPrepTask } from "@/lib/types"; // Import SerializedPrepTask
import { NextRequest, NextResponse } from "next/server";
import { PrepTask, Prisma, PrepTaskStatus } from "@prisma/client"; // Added PrepTaskStatus
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
                }
            }
        });

        if (!task) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Tarefa de preparo não encontrada." }, { status: 404 });
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
                if (!assignedToUserId) {
                     return NextResponse.json<ApiResponse>({ success: false, error: "Usuário para atribuição não fornecido." }, { status: 400 });
                }
                // Validate assigned user exists
                const assignedUser = await prisma.user.findUnique({ where: { id: assignedToUserId }});
                if (!assignedUser) return NextResponse.json<ApiResponse>({ success: false, error: "Usuário atribuído não encontrado." }, { status: 404 });

                updateData.assignedToUserId = assignedToUserId;
                updateData.assignedAt = new Date();
                break;

            case PrepTaskStatus.IN_PROGRESS:
                // Assigned user starts the task OR user claims a PENDING task
                if (currentStatus === PrepTaskStatus.PENDING) {
                    // Claiming
                    updateData.assignedToUserId = userId; // Claim for self
                    updateData.assignedAt = new Date();
                    updateData.startedAt = new Date();
                } else if (currentStatus === PrepTaskStatus.ASSIGNED) {
                    // Starting assigned task
                    if (task.assignedToUserId !== userId && !['MANAGER', 'OWNER'].includes(userRole)) {
                         return NextResponse.json<ApiResponse>({ success: false, error: "Você não pode iniciar uma tarefa atribuída a outro usuário." }, { status: 403 });
                    }
                     updateData.startedAt = new Date();
                     // Ensure assignedToUserId remains if manager starts it for someone else
                     if (!updateData.assignedToUserId) updateData.assignedToUserId = task.assignedToUserId;
                } else {
                     return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível iniciar uma tarefa com status ${currentStatus}.` }, { status: 400 });
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
                    if (quantityRunDecimal.isNegative()) { // Allow zero? Maybe for waste reporting later. For now, positive.
                        throw new Error("Quantidade produzida deve ser zero ou positiva.");
                    }
                } catch (e: any) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade produzida inválida: ${e.message}` }, { status: 400 });
                }

                updateData.quantityRun = quantityRunDecimal;
                updateData.completedAt = new Date();
                updateData.executedById = userId; // User who marked as complete
                requiresStockTransaction = true; // Trigger stock logic
                break;

            case PrepTaskStatus.CANCELLED:
                 // Manager/Owner can cancel PENDING or ASSIGNED tasks
                 if (![PrepTaskStatus.PENDING, PrepTaskStatus.ASSIGNED].includes(currentStatus)) {
                     return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível cancelar uma tarefa com status ${currentStatus}.` }, { status: 400 });
                 }
                 if (!['MANAGER', 'OWNER'].includes(userRole)) {
                     return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem cancelar tarefas." }, { status: 403 });
                 }
                 // Maybe add a reason field later?
                 // updateData.notes = "Cancelled: " + (reason || "");
                 break;

            // Add case for PENDING if needed (e.g., manager unassigning)
            case PrepTaskStatus.PENDING:
                // Manager/Owner unassigns an ASSIGNED task
                if (currentStatus !== PrepTaskStatus.ASSIGNED) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível redefinir para Pendente uma tarefa com status ${currentStatus}.` }, { status: 400 });
                }
                 if (!['MANAGER', 'OWNER'].includes(userRole)) {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem remover atribuição." }, { status: 403 });
                }
                updateData.assignedToUserId = null;
                updateData.assignedAt = null;
                break;

             default:
                return NextResponse.json<ApiResponse>({ success: false, error: `Transição de status inválida para ${newStatus}` }, { status: 400 });

        }


        // --- Execute Update (with or without stock transaction) ---
        let updatedTask: PrepTask;

        if (requiresStockTransaction && quantityRunDecimal !== null) {
             // ** Perform stock update within a transaction **
             const finalQuantityRun = quantityRunDecimal; // Capture for use inside transaction
             updatedTask = await prisma.$transaction(async (tx) => {
                 // --- Stock Deduction Logic (Copied and adapted from old POST /prep-tasks) ---
                 const runs = finalQuantityRun.dividedBy(task.prepRecipe.outputQuantity); // Use actual quantity produced
                 if (!task.prepRecipe.inputs) throw new Error("Detalhes da receita (inputs) não encontrados na tarefa."); // Should not happen

                 for (const input of task.prepRecipe.inputs) {
                     const requiredQuantity = input.quantity.times(runs);
                     let deductedAmount = new Decimal(0);
                     const holdings = await tx.stockHolding.findMany({
                         where: { ingredientId: input.ingredientId, venueObjectId: task.locationId, quantity: { gt: 0 } },
                         orderBy: { createdAt: 'asc' }
                     });
                     for (const holding of holdings) {
                         const quantityToDeduct = Decimal.min(requiredQuantity.minus(deductedAmount), holding.quantity);
                         await tx.stockHolding.update({ where: { id: holding.id }, data: { quantity: { decrement: quantityToDeduct } } });
                         deductedAmount = deductedAmount.plus(quantityToDeduct);
                         if (deductedAmount.gte(requiredQuantity)) break;
                     }
                     if (deductedAmount.lt(requiredQuantity)) {
                          // If completion is forced despite insufficient stock, log it but don't throw?
                          // Or should completion fail? Let's make it fail.
                         throw new Error(`Estoque insuficiente de "${input.ingredient.name}" (${input.ingredient.unit}). Necessário: ${requiredQuantity.toFixed(3)}, Disponível: ${deductedAmount.toFixed(3)}.`);
                     }
                 }
                 // --- End Stock Deduction ---

                 // --- Stock Addition Logic (Copied and adapted from old POST /prep-tasks) ---
                 if (!task.prepRecipe.outputIngredient) throw new Error("Detalhes da receita (output) não encontrados na tarefa."); // Should not happen

                 const existingOutputHolding = await tx.stockHolding.findFirst({
                      where: { ingredientId: task.prepRecipe.outputIngredientId, venueObjectId: task.locationId },
                 });
                 // Calculate cost
                 let totalInputCost = new Decimal(0);
                  for (const input of task.prepRecipe.inputs) {
                      const inputCost = input.ingredient.costPerUnit.times(input.quantity.times(runs));
                      totalInputCost = totalInputCost.plus(inputCost);
                  }
                 const costPerOutputUnit = finalQuantityRun.isZero() ? new Decimal(0) : totalInputCost.dividedBy(finalQuantityRun); // Avoid division by zero

                 if (existingOutputHolding) {
                     await tx.stockHolding.update({ where: { id: existingOutputHolding.id }, data: { quantity: { increment: finalQuantityRun } } });
                 } else if (finalQuantityRun.gt(0)) { // Only create if quantity > 0
                      await tx.stockHolding.create({
                         data: {
                             ingredientId: task.prepRecipe.outputIngredientId,
                             venueObjectId: task.locationId,
                             quantity: finalQuantityRun,
                             costAtAcquisition: costPerOutputUnit,
                             purchaseDate: new Date(), // Set production date as 'purchase' date for this batch
                         }
                     });
                 }
                  // --- End Stock Addition ---

                 // --- Recalculate Average Cost ---
                const allHoldings = await tx.stockHolding.findMany({ where: { ingredientId: task.prepRecipe.outputIngredientId, quantity: { gt: 0 } } });
                let totalValue = new Decimal(0);
                let totalQuantity = new Decimal(0);
                allHoldings.forEach(h => {
                    const cost = h.costAtAcquisition ?? task.prepRecipe.outputIngredient.costPerUnit; // Fallback?
                    totalValue = totalValue.plus(h.quantity.times(cost));
                    totalQuantity = totalQuantity.plus(h.quantity);
                });
                const newAverageCost = totalQuantity.isZero() ? new Decimal(0) : totalValue.dividedBy(totalQuantity);
                await tx.ingredient.update({ where: { id: task.prepRecipe.outputIngredientId }, data: { costPerUnit: newAverageCost } });
                // --- End Average Cost ---

                 // --- Finally, update the task status itself ---
                 return await tx.prepTask.update({
                     where: { id: taskId },
                     data: updateData, // Contains new status, completedAt, executedById, quantityRun
                     include: { // Include data for response
                         prepRecipe: { select: { id: true, name: true, outputIngredient: { select: { name: true, unit: true } }, estimatedLaborTime: true }},
                         assignedTo: { select: { id: true, name: true } },
                         executedBy: { select: { id: true, name: true } },
                         location: { select: { id: true, name: true } },
                     }
                 });
             }, {
                 maxWait: 15000, // Increased timeout for potentially complex stock logic
                 timeout: 30000,
             }); // End Transaction

        } else {
             // Just update the task status without stock changes
             updatedTask = await prisma.prepTask.update({
                 where: { id: taskId },
                 data: updateData, // Contains new status and potentially assignedToUserId, startedAt etc.
                 include: { // Include data for response
                    prepRecipe: { select: { id: true, name: true, outputIngredient: { select: { name: true, unit: true } }, estimatedLaborTime: true }},
                    assignedTo: { select: { id: true, name: true } },
                    executedBy: { select: { id: true, name: true } },
                    location: { select: { id: true, name: true } },
                 }
             });
        }


        // Serialize Decimals for response
        const serializedTask: SerializedPrepTask = {
            ...updatedTask,
            targetQuantity: updatedTask.targetQuantity.toString(),
            quantityRun: updatedTask.quantityRun ? updatedTask.quantityRun.toString() : null,
            createdAt: updatedTask.createdAt.toISOString(),
            assignedAt: updatedTask.assignedAt?.toISOString() ?? null,
            startedAt: updatedTask.startedAt?.toISOString() ?? null,
            completedAt: updatedTask.completedAt?.toISOString() ?? null,
        };

        return NextResponse.json<ApiResponse<SerializedPrepTask>>(
            { success: true, data: serializedTask },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`Error updating prep task ${taskId}:`, error);
        // Catch specific stock error from transaction
        if (error.message.startsWith('Estoque insuficiente')) {
             return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 409 }); // 409 Conflict - stock issue
        }
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Tarefa ou registro relacionado não encontrado durante a atualização." }, { status: 404 });
         }
         if (error.message.includes('Transaction API error')) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Erro de transação. Verifique o estoque e tente novamente." }, { status: 500 });
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor ao atualizar tarefa: ${error.message}` },
            { status: 500 }
        );
    }
}