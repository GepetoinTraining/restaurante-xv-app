// PATH: app/api/prep-tasks/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse, SerializedPrepTask } from "@/lib/types"; // Import SerializedPrepTask
import { NextRequest, NextResponse } from "next/server";
import { PrepTask, Prisma, PrepTaskStatus } from "@prisma/client"; // Added PrepTaskStatus
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for creating PrepTask
type PrepTaskCreateInput = {
    prepRecipeId: string;
    targetQuantity: string | number; // How many units of the *output* are desired
    locationId: string; // VenueObject ID where prep should happen / output stored
    notes?: string;
    assignedToUserId?: string | null; // Optional: Assign directly on creation
}

/**
 * POST /api/prep-tasks
 * Creates a new PrepTask record with PENDING or ASSIGNED status.
 * Does NOT adjust stock here. Stock adjustment happens on completion via PATCH /[id].
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // Allow MANAGER or OWNER to create and assign tasks
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    // const creatorUserId = session.user.id; // User creating the task (Manager/Owner)

    try {
        const body: PrepTaskCreateInput = await req.json();
        const { prepRecipeId, targetQuantity, locationId, notes, assignedToUserId } = body;

        if (!prepRecipeId || targetQuantity === undefined || !locationId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ID da Receita de Preparo, Quantidade Alvo e Localização são obrigatórios." },
                { status: 400 }
            );
        }

        // Validate target quantity
        let targetQuantityDecimal: Decimal;
        try {
            targetQuantityDecimal = new Decimal(targetQuantity);
            if (targetQuantityDecimal.isNegative() || targetQuantityDecimal.isZero()) {
                throw new Error("Quantidade alvo deve ser positiva.");
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade alvo inválida: ${e.message}` }, { status: 400 });
        }

        // Validate PrepRecipe existence
        const prepRecipe = await prisma.prepRecipe.findUnique({
            where: { id: prepRecipeId },
            select: { id: true } // Just need to know it exists
        });
        if (!prepRecipe) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não encontrada." }, { status: 404 });
        }

        // Validate Location existence (ensure it's a storage type?)
        const location = await prisma.venueObject.findUnique({
            where: { id: locationId },
            select: { id: true, type: true }
        });
        if (!location) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Localização não encontrada." }, { status: 404 });
        }
         // Optional: Check if location type is suitable for prep/storage
        const validLocationTypes: VenueObject['type'][] = ['STORAGE', 'FREEZER', 'SHELF', 'WORKSTATION_STORAGE', 'WORKSTATION'];
        if (!validLocationTypes.includes(location.type)) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Tipo de localização inválido para tarefa de preparo." }, { status: 400 });
        }


        // Validate assigned user if provided
        if (assignedToUserId) {
            const assignedUser = await prisma.user.findUnique({ where: { id: assignedToUserId }, select: { id: true } });
            if (!assignedUser) {
                return NextResponse.json<ApiResponse>({ success: false, error: "Usuário atribuído não encontrado." }, { status: 404 });
            }
        }

        // Determine initial status
        const initialStatus = assignedToUserId ? PrepTaskStatus.ASSIGNED : PrepTaskStatus.PENDING;
        const assignedAt = assignedToUserId ? new Date() : null;

        // Create the PrepTask record
        const newPrepTask = await prisma.prepTask.create({
            data: {
                prepRecipeId,
                targetQuantity: targetQuantityDecimal,
                assignedToUserId: assignedToUserId ?? null,
                locationId,
                notes,
                status: initialStatus,
                assignedAt: assignedAt,
                // executedById is set on completion
                // quantityRun is set on completion
            },
             // Include details needed for the response/workflow card
            include: {
                prepRecipe: {
                    select: {
                        id: true,
                        name: true,
                        outputIngredient: { select: { name: true, unit: true } },
                        estimatedLaborTime: true
                    }
                },
                assignedTo: { select: { id: true, name: true } },
                executedBy: { select: { id: true, name: true } },
                location: { select: { id: true, name: true } },
            }
        });

        // Serialize Decimals for response
        const serializedTask: SerializedPrepTask = {
            ...newPrepTask,
            targetQuantity: newPrepTask.targetQuantity.toString(),
            quantityRun: newPrepTask.quantityRun ? newPrepTask.quantityRun.toString() : null,
            createdAt: newPrepTask.createdAt.toISOString(),
            assignedAt: newPrepTask.assignedAt?.toISOString() ?? null,
            startedAt: newPrepTask.startedAt?.toISOString() ?? null,
            completedAt: newPrepTask.completedAt?.toISOString() ?? null,
        };

        return NextResponse.json<ApiResponse<SerializedPrepTask>>(
            { success: true, data: serializedTask },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Error creating prep task:", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003') { // FK constraint failed
                 // Handled manually above
             }
             if (error.code === 'P2025') { // Record not found during creation (unlikely)
                 return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Um registro relacionado não foi encontrado." }, { status: 404 });
             }
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor ao criar tarefa de preparo: ${error.message}` },
            { status: 500 }
        );
    }
}

/**
 * GET /api/prep-tasks
 * Fetches prep tasks, optionally filtered by status or assigned user.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const assignedToUserIdParam = searchParams.get("assignedToUserId");
    const includeCompleted = searchParams.get("includeCompleted") === 'true'; // Check if completed tasks should be included

    try {
        const whereClause: Prisma.PrepTaskWhereInput = {};

        if (statusParam) {
            const statuses = statusParam.split(',') as PrepTaskStatus[];
            if (statuses.every(s => Object.values(PrepTaskStatus).includes(s))) {
                whereClause.status = { in: statuses };
            } else {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Status inválido fornecido." }, { status: 400 });
            }
        } else if (!includeCompleted) {
             // Default: Fetch only active tasks if no specific status and includeCompleted is false
             whereClause.status = { notIn: [PrepTaskStatus.COMPLETED, PrepTaskStatus.CANCELLED] };
        }


        if (assignedToUserIdParam) {
             if (assignedToUserIdParam === 'unassigned') {
                 whereClause.assignedToUserId = null;
                 whereClause.status = PrepTaskStatus.PENDING; // Only pending tasks can be unassigned
             } else if (assignedToUserIdParam === 'me') {
                  whereClause.assignedToUserId = session.user.id;
             }
             else {
                 whereClause.assignedToUserId = assignedToUserIdParam;
             }
        }


        const prepTasks = await prisma.prepTask.findMany({
            where: whereClause,
            include: {
                 prepRecipe: {
                    select: {
                        id: true,
                        name: true,
                        outputIngredient: { select: { name: true, unit: true } },
                        estimatedLaborTime: true
                    }
                },
                assignedTo: { select: { id: true, name: true } },
                executedBy: { select: { id: true, name: true } },
                location: { select: { id: true, name: true } },
            },
            orderBy: {
                createdAt: 'desc', // Show newest first
            },
        });

        // Serialize Decimals
        const serializedTasks: SerializedPrepTask[] = prepTasks.map(task => ({
            ...task,
            targetQuantity: task.targetQuantity.toString(),
            quantityRun: task.quantityRun ? task.quantityRun.toString() : null,
             createdAt: task.createdAt.toISOString(),
            assignedAt: task.assignedAt?.toISOString() ?? null,
            startedAt: task.startedAt?.toISOString() ?? null,
            completedAt: task.completedAt?.toISOString() ?? null,
        }));


        return NextResponse.json<ApiResponse<SerializedPrepTask[]>>(
            { success: true, data: serializedTasks },
            { status: 200 }
        );

     } catch (error) {
        console.error("Error fetching prep tasks:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao buscar tarefas de preparo" },
            { status: 500 }
        );
     }
}