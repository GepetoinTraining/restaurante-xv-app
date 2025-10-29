// File: app/api/prep-tasks/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse, SerializedPrepTask } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// Import all needed models for typing
import { 
    PrepTask, 
    Prisma, 
    PrepTaskStatus, 
    Ingredient, 
    PrepRecipe, 
    User, 
    VenueObject, 
    VenueObjectType,
    StockHolding // <-- ADD THIS IMPORT
} from "@prisma/client";
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
                if (currentStatus !== PrepTaskStatus.PENDING) return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível atribuir uma tarefa com status ${currentStatus}.` }, { status: 400 });
                if (!['MANAGER', 'OWNER'].includes(userRole)) return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem atribuir tarefas." }, { status: 403 });
                if (!assignedToUserId) return NextResponse.json<ApiResponse>({ success: false, error: "Usuário para atribuição não fornecido." }, { status: 400 });
                const assignedUser = await prisma.user.findUnique({ where: { id: assignedToUserId }});
                if (!assignedUser) return NextResponse.json<ApiResponse>({ success: false, error: "Usuário atribuído não encontrado." }, { status: 404 });
                updateData.assignedTo = { connect: { id: assignedToUserId } };
                updateData.assignedAt = new Date();
                break;

            case PrepTaskStatus.IN_PROGRESS:
                if (currentStatus === PrepTaskStatus.PENDING) {
                    updateData.assignedTo = { connect: { id: userId } };
                    updateData.assignedAt = new Date();
                    updateData.startedAt = new Date();
                } else if (currentStatus === PrepTaskStatus.ASSIGNED) {
                    if (task.assignedToUserId !== userId && !['MANAGER', 'OWNER'].includes(userRole)) return NextResponse.json<ApiResponse>({ success: false, error: "Você não pode iniciar uma tarefa atribuída a outro usuário." }, { status: 403 });
                    updateData.startedAt = new Date();
                    if (!task.assignedToUserId) updateData.assignedTo = { connect: { id: userId } };
                } else {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível iniciar una tarefa com status ${currentStatus}.` }, { status: 400 });
                }
                break;

             case PrepTaskStatus.COMPLETED:
                if (currentStatus !== PrepTaskStatus.IN_PROGRESS) return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível completar uma tarefa com status ${currentStatus}.` }, { status: 400 });
                if (task.assignedToUserId !== userId && !['MANAGER', 'OWNER'].includes(userRole)) return NextResponse.json<ApiResponse>({ success: false, error: "Você não pode completar uma tarefa atribuída a outro usuário." }, { status: 403 });
                if (quantityRun === undefined || quantityRun === null) return NextResponse.json<ApiResponse>({ success: false, error: "Quantidade produzida é obrigatória para completar." }, { status: 400 });
                try {
                    quantityRunDecimal = new Decimal(quantityRun);
                    if (quantityRunDecimal.isNegative()) throw new Error("Quantidade produzida deve ser zero ou positiva.");
                } catch (e: any) {
                    return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade produzida inválida: ${e.message}` }, { status: 400 });
                }
                updateData.quantityRun = quantityRunDecimal;
                updateData.completedAt = new Date();
                updateData.executedBy = { connect: { id: userId } };
                requiresStockTransaction = true;
                break;

            case PrepTaskStatus.CANCELLED:
                 if (currentStatus !== PrepTaskStatus.PENDING && currentStatus !== PrepTaskStatus.ASSIGNED) return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível cancelar uma tarefa com status ${currentStatus}.` }, { status: 400 });
                 if (!['MANAGER', 'OWNER'].includes(userRole)) return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem cancelar tarefas." }, { status: 403 });
                 break;

            case PrepTaskStatus.PENDING:
                if (currentStatus !== PrepTaskStatus.ASSIGNED) return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível redefinir para Pendente uma tarefa com status ${currentStatus}.` }, { status: 400 });
                 if (!['MANAGER', 'OWNER'].includes(userRole)) return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem remover atribuição." }, { status: 403 });
                updateData.assignedTo = { disconnect: true };
                updateData.assignedAt = null;
                break;

             default:
                return NextResponse.json<ApiResponse>({ success: false, error: `Transição de status inválida para ${newStatus}` }, { status: 400 });
        }


        let updatedTask: UpdatedPrepTask;

        if (requiresStockTransaction && quantityRunDecimal !== null) {
             const finalQuantityRun = quantityRunDecimal;
             updatedTask = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                 // Stock Deduction Logic
                 if (!task.prepRecipe?.outputQuantity) throw new Error("Detalhes da receita (outputQuantity) não encontrados na tarefa.");
                 if (!task.prepRecipe?.inputs || task.prepRecipe.inputs.length === 0) throw new Error("Detalhes da receita (inputs) não encontrados na tarefa.");

                 const runs = finalQuantityRun.dividedBy(task.prepRecipe.outputQuantity);

                 for (const input of task.prepRecipe.inputs) {
                     if (!input.ingredient) throw new Error(`Detalhes do ingrediente de entrada (ID: ${input.ingredientId}) não encontrados.`);
                     const requiredQuantity = input.quantity.times(runs);
                     let deductedAmount = new Decimal(0);
                     const holdings = await tx.stockHolding.findMany({ where: { ingredientId: input.ingredientId, venueObjectId: task.locationId, quantity: { gt: 0 } }, orderBy: { createdAt: 'asc' } });
                     for (const holding of holdings) {
                         const quantityToDeduct = Decimal.min(requiredQuantity.minus(deductedAmount), holding.quantity);
                         if (quantityToDeduct.lte(0)) continue;
                         await tx.stockHolding.update({ where: { id: holding.id }, data: { quantity: { decrement: quantityToDeduct } } });
                         deductedAmount = deductedAmount.plus(quantityToDeduct);
                         if (deductedAmount.gte(requiredQuantity)) break;
                     }
                     if (deductedAmount.lt(requiredQuantity)) throw new Error(`Estoque insuficiente de "${input.ingredient.name}" (${input.ingredient.unit}). Necessário: ${requiredQuantity.toFixed(3)}, Disponível: ${deductedAmount.toFixed(3)}.`);
                 }

                 // Stock Addition Logic
                 if (!task.prepRecipe.outputIngredientId || !task.prepRecipe.outputIngredient) throw new Error("Detalhes da receita (outputIngredient) não encontrados na tarefa.");
                 const existingOutputHolding = await tx.stockHolding.findFirst({ where: { ingredientId: task.prepRecipe.outputIngredientId, venueObjectId: task.locationId } });
                 let totalInputCost = new Decimal(0);
                 for (const input of task.prepRecipe.inputs) {
                     if (!input.ingredient) throw new Error(`Detalhes do ingrediente de entrada (ID: ${input.ingredientId}) não encontrados para cálculo de custo.`);
                     totalInputCost = totalInputCost.plus(input.ingredient.costPerUnit.times(input.quantity.times(runs)));
                 }
                 const costPerOutputUnit = finalQuantityRun.isZero() ? new Decimal(0) : totalInputCost.dividedBy(finalQuantityRun);
                 if (existingOutputHolding) {
                     await tx.stockHolding.update({ where: { id: existingOutputHolding.id }, data: { quantity: { increment: finalQuantityRun } } });
                 } else if (finalQuantityRun.gt(0)) {
                     await tx.stockHolding.create({ data: { ingredientId: task.prepRecipe.outputIngredientId, venueObjectId: task.locationId, quantity: finalQuantityRun, costAtAcquisition: costPerOutputUnit, purchaseDate: new Date() } });
                 }

                 // Recalculate Average Cost
                 const allHoldings = await tx.stockHolding.findMany({ where: { ingredientId: task.prepRecipe.outputIngredientId, quantity: { gt: 0 } } });
                 let totalValue = new Decimal(0), totalQuantity = new Decimal(0);
                 
                 // --- FIX: Added type 'StockHolding' to 'h' parameter ---
                 allHoldings.forEach((h: StockHolding) => {
                 // --------------------------------------------------------
                     if (!task.prepRecipe.outputIngredient) throw new Error("Detalhes do ingrediente de saída não encontrados para cálculo de custo médio.");
                     const cost = h.costAtAcquisition ?? task.prepRecipe.outputIngredient.costPerUnit;
                     totalValue = totalValue.plus(h.quantity.times(cost));
                     totalQuantity = totalQuantity.plus(h.quantity);
                 });
                 const newAverageCost = totalQuantity.isZero() ? new Decimal(0) : totalValue.dividedBy(totalQuantity);
                 await tx.ingredient.update({ where: { id: task.prepRecipe.outputIngredientId }, data: { costPerUnit: newAverageCost } });

                 // Update Task Status
                 return await tx.prepTask.update({ where: { id: taskId }, data: updateData, include: prepTaskInclude });
             }, { maxWait: 15000, timeout: 30000 });

        } else {
             updatedTask = await prisma.prepTask.update({ where: { id: taskId }, data: updateData, include: prepTaskInclude });
        }

        const serializedTask: SerializedPrepTask = {
            ...updatedTask,
            targetQuantity: updatedTask.targetQuantity.toString(),
            quantityRun: updatedTask.quantityRun ? updatedTask.quantityRun.toString() : null,
            prepRecipe: {
                id: updatedTask.prepRecipe.id,
                name: updatedTask.prepRecipe.name,
                outputIngredient: updatedTask.prepRecipe.outputIngredient,
                estimatedLaborTime: updatedTask.prepRecipe.estimatedLaborTime,
                outputQuantity: updatedTask.prepRecipe.outputQuantity.toString(),
            },
            createdAt: updatedTask.createdAt.toISOString(),
            assignedAt: updatedTask.assignedAt?.toISOString() ?? null,
            startedAt: updatedTask.startedAt?.toISOString() ?? null,
            completedAt: updatedTask.completedAt?.toISOString() ?? null,
        };

        return NextResponse.json<ApiResponse<SerializedPrepTask>>( { success: true, data: serializedTask }, { status: 200 });

    } catch (error: any) {
        console.error(`Error updating prep task ${taskId}:`, error);
        if (error.message.startsWith('Estoque insuficiente')) return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 409 });
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return NextResponse.json<ApiResponse>({ success: false, error: "Tarefa ou registro relacionado não encontrado during a atualização." }, { status: 404 });
        if (error.message.includes('Transaction API error') || error.message.includes('timed out')) return NextResponse.json<ApiResponse>({ success: false, error: "Erro de transação ou tempo limite. Verifique o estoque e tente novamente." }, { status: 504 });
        if (error.message.includes('não encontrados na tarefa') || error.message.includes('Detalhes do ingrediente') || error.message.includes('Localização da tarefa')) {
            console.error("Data inconsistency error:", error.message);
            return NextResponse.json<ApiResponse>({ success: false, error: `Erro de dados internos: ${error.message}` }, { status: 500 });
        }
        return NextResponse.json<ApiResponse>( { success: false, error: `Erro interno do servidor ao atualizar tarefa: ${error.message}` }, { status: 500 });
    }
}


/**
 * DELETE /api/prep-tasks/[id]
 * Deletes a prep task. Only allows deletion if status is PENDING, CANCELLED, or PROBLEM.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const session = await getSession();
    // Only allow managers/owners to delete
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 403 });
    }
    const taskId = params.id;

    try {
        const task = await prisma.prepTask.findUnique({
            where: { id: taskId },
            select: { status: true } // Only need status to validate
        });

        if (!task) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Tarefa não encontrada." }, { status: 404 });
        }

        // Prevent deletion of tasks that were started or completed
        if (task.status === PrepTaskStatus.IN_PROGRESS || task.status === PrepTaskStatus.COMPLETED || task.status === PrepTaskStatus.ASSIGNED) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Não é possível excluir uma tarefa com status ${task.status}. Cancele-a primeiro, se necessário.` }, { status: 409 }); // Conflict
        }

        // Proceed with deletion
        const deletedTask = await prisma.prepTask.delete({
            where: { id: taskId },
        });

        return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: { id: deletedTask.id } }, { status: 200 });

    } catch (error: any) {
        console.error(`Error deleting prep task ${taskId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // Should be caught by the findUnique above, but good failsafe
            return NextResponse.json<ApiResponse>({ success: false, error: "Tarefa não encontrada." }, { status: 404 });
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor ao excluir tarefa: ${error.message}` },
            { status: 500 }
        );
    }
}