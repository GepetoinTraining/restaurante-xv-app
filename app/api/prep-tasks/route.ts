// PATH: app/api/prep-tasks/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse, SerializedPrepTask } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// ---- START FIX ----
// Import VenueObject and VenueObjectType
import { PrepTask, PrepRecipe, Prisma, PrepTaskStatus, VenueObject, VenueObjectType } from "@prisma/client";
// ---- END FIX ----
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for POST request body
type PrepTaskCreateInput = {
    prepRecipeId: string;
    targetQuantity: string | number;
    locationId: string;
    notes?: string;
}

// Include for the task object returned
const prepTaskInclude = {
    prepRecipe: {
        select: {
            id: true,
            name: true,
            outputIngredient: { select: { name: true, unit: true } },
            estimatedLaborTime: true,
            outputQuantity: true // Added for serialization
        }
    },
    assignedTo: { select: { id: true, name: true } },
    executedBy: { select: { id: true, name: true } },
    location: { select: { id: true, name: true } },
};

/**
 * POST /api/prep-tasks
 * Creates a new preparation task.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Apenas Gerentes ou Donos podem criar tarefas." }, { status: 403 });
    }

    try {
        const body: PrepTaskCreateInput = await req.json();
        const { prepRecipeId, targetQuantity, locationId, notes } = body;

        if (!prepRecipeId || !targetQuantity || !locationId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Receita, Quantidade Alvo e Localização são obrigatórios." }, { status: 400 });
        }

        let targetQuantityDecimal: Decimal;
        try {
            targetQuantityDecimal = new Decimal(targetQuantity);
            if (targetQuantityDecimal.isNegative() || targetQuantityDecimal.isZero()) {
                throw new Error("Quantidade alvo deve ser positiva.");
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade alvo inválida: ${e.message}` }, { status: 400 });
        }

        // 1. Validate PrepRecipe
        const prepRecipe = await prisma.prepRecipe.findUnique({
            where: { id: prepRecipeId },
            select: { id: true, outputIngredientId: true } // Need outputIngredientId for validation
        });
        if (!prepRecipe) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não encontrada." }, { status: 404 });
        }
         if (!prepRecipe.outputIngredientId) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Receita de preparo não tem um ingrediente de saída configurado." }, { status: 400 });
         }

        // 2. Validate Location
        const location = await prisma.venueObject.findUnique({
            where: { id: locationId }
        });
        if (!location) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Localização (VenueObject) não encontrada." }, { status: 404 });
        }

         // Optional: Check if location type is suitable for prep/storage
        // ---- START FIX: Use VenueObjectType enum ----
        const validLocationTypes: VenueObjectType[] = [
            VenueObjectType.STORAGE,
            VenueObjectType.FREEZER,
            VenueObjectType.SHELF,
            VenueObjectType.WORKSTATION_STORAGE,
            VenueObjectType.WORKSTATION
        ];
        // ---- END FIX ----
        if (!validLocationTypes.includes(location.type)) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Tipo de localização inválido para tarefa de preparo." }, { status: 400 });
        }

        // 3. Create PrepTask
        const newTask = await prisma.prepTask.create({
            data: {
                prepRecipeId: prepRecipeId,
                targetQuantity: targetQuantityDecimal,
                locationId: locationId,
                status: PrepTaskStatus.PENDING, // Default status
                notes: notes,
                // createdById: session.user.id, // Add if you add a createdBy relation
            },
            include: prepTaskInclude
        });

        // Serialize Decimals for response
        const serializedTask: SerializedPrepTask = {
            ...newTask,
            targetQuantity: newTask.targetQuantity.toString(),
            quantityRun: newTask.quantityRun ? newTask.quantityRun.toString() : null,
            prepRecipe: {
                ...newTask.prepRecipe,
                outputQuantity: newTask.prepRecipe.outputQuantity.toString(),
                outputIngredient: newTask.prepRecipe.outputIngredient // Already in correct shape
            },
            createdAt: newTask.createdAt.toISOString(),
            assignedAt: newTask.assignedAt?.toISOString() ?? null,
            startedAt: newTask.startedAt?.toISOString() ?? null,
            completedAt: newTask.completedAt?.toISOString() ?? null,
            // These relations are already in the correct shape from 'include'
            // assignedTo: newTask.assignedTo,
            // executedBy: newTask.executedBy,
            // location: newTask.location,
        };


        return NextResponse.json<ApiResponse<SerializedPrepTask>>(
            { success: true, data: serializedTask },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Error creating prep task:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') { // Record not found
                return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Receita ou localização não encontrada." }, { status: 404 });
            }
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor ao criar tarefa: ${error.message}` },
            { status: 500 }
        );
    }
}

/**
 * GET /api/prep-tasks
 * Fetches all preparation tasks, optionally filtered by status.
 */
export async function GET(req: NextRequest) {
     const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
     // Optional: Restrict view access?
     // if (!['MANAGER', 'OWNER', 'COOK'].includes(session.user.role)) { ... }


    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // e.g., ?status=PENDING,ASSIGNED
    const assignedToUserId = searchParams.get('assignedToUserId'); // e.g., ?assignedToUserId=me

    let whereClause: Prisma.PrepTaskWhereInput = {};

    if (statusFilter) {
        const statuses = statusFilter.split(',').map(s => s.trim() as PrepTaskStatus)
                               .filter(s => Object.values(PrepTaskStatus).includes(s));
         if (statuses.length > 0) {
             whereClause.status = { in: statuses };
         }
    }

    if (assignedToUserId === 'me') {
        whereClause.assignedToUserId = session.user.id;
    } else if (assignedToUserId) {
         whereClause.assignedToUserId = assignedToUserId;
    }


    try {
        const tasks = await prisma.prepTask.findMany({
            where: whereClause,
            include: prepTaskInclude,
            orderBy: {
                createdAt: 'desc' // Show newest first
            }
        });

         // Serialize Decimals for response
        const serializedTasks: SerializedPrepTask[] = tasks.map(task => ({
            ...task,
            targetQuantity: task.targetQuantity.toString(),
            quantityRun: task.quantityRun ? task.quantityRun.toString() : null,
            prepRecipe: {
                ...task.prepRecipe,
                outputQuantity: task.prepRecipe.outputQuantity.toString(),
                outputIngredient: task.prepRecipe.outputIngredient // Already in correct shape
            },
            createdAt: task.createdAt.toISOString(),
            assignedAt: task.assignedAt?.toISOString() ?? null,
            startedAt: task.startedAt?.toISOString() ?? null,
            completedAt: task.completedAt?.toISOString() ?? null,
        }));

         return NextResponse.json<ApiResponse<SerializedPrepTask[]>>(
            { success: true, data: serializedTasks },
            { status: 200 }
        );

    } catch (error: any) {
         console.error("Error fetching prep tasks:", error);
         return NextResponse.json<ApiResponse>(
            { success: false, error: `Erro interno do servidor ao buscar tarefas: ${error.message}` },
            { status: 500 }
        );
    }
}