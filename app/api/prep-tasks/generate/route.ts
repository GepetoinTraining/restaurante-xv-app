// PATH: app/api/prep-tasks/generate/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse, SerializedPrepTask } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { PrepTask, PrepRecipe, Prisma, PrepTaskStatus, DailyMenuAssignment, RecipeIngredient, Ingredient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

/**
 * POST /api/prep-tasks/generate
 * Generates PrepTasks based on DailyMenuAssignments for a specific date.
 * This is a potentially long-running operation.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // Assuming MANAGER or OWNER can trigger generation
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER', 'COOK'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { date } = body; // Expecting date as YYYY-MM-DD string

        if (!date) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Date is required" }, { status: 400 });
        }

        const targetDateStart = new Date(date + 'T00:00:00.000Z');
        const targetDateEnd = new Date(targetDateStart.getTime() + 24 * 60 * 60 * 1000);

        // 1. Fetch all assignments for the target date
        const assignments = await prisma.dailyMenuAssignment.findMany({
            where: {
                assignmentDate: {
                    gte: targetDateStart,
                    lt: targetDateEnd
                }
            },
            include: {
                companyClient: { select: { employeeCount: true, consumptionFactor: true } },
                menu: { include: { recipes: { include: { ingredients: true } } } } // Get recipes and their ingredients
            }
        });

        if (assignments.length === 0) {
            return NextResponse.json<ApiResponse>({ success: true, message: "No menu assignments found for this date. No tasks generated." });
        }

        // 2. Aggregate total required quantity for each *recipe ingredient* across all assignments
        // This map will store: IngredientID -> { name: string, unit: string, totalRequired: Decimal }
        const requiredIngredients = new Map<string, { name: string, unit: string, totalRequired: Decimal }>();

        for (const assignment of assignments) {
            if (!assignment.menu || !assignment.companyClient) continue;

            const effectiveHeadcount = new Decimal(assignment.companyClient.employeeCount || 0).times(assignment.companyClient.consumptionFactor);
            if (effectiveHeadcount.isZero()) continue; // Skip if no employees or factor is zero

            for (const recipe of assignment.menu.recipes) {
                // TODO: Need a "servings per recipe" or similar metric to scale ingredients
                // For now, assume recipe ingredients are per-person and scale directly
                // THIS IS A MAJOR SIMPLIFICATION - NEEDS REFINEMENT
                const scalingFactor = effectiveHeadcount; // Simple scaling

                for (const recipeIng of recipe.ingredients) {
                    const current = requiredIngredients.get(recipeIng.ingredientId) ?? { name: '', unit: '', totalRequired: new Decimal(0) };
                    const quantityNeeded = new Decimal(recipeIng.quantity).times(scalingFactor);
                    current.totalRequired = current.totalRequired.plus(quantityNeeded);
                    // Store name/unit on first encounter
                    if (!current.name) {
                         // Need to fetch ingredient details if not included above
                        const ingDetails = await prisma.ingredient.findUnique({ where: { id: recipeIng.ingredientId }, select: { name: true, unit: true } });
                        current.name = ingDetails?.name ?? 'Unknown Ingredient';
                        current.unit = ingDetails?.unit ?? 'unit';
                    }
                    requiredIngredients.set(recipeIng.ingredientId, current);
                }
            }
        }

        // 3. Find PrepRecipes that produce these required *prepared* ingredients
        const generatedTasks: Prisma.PrepTaskCreateManyInput[] = [];
        for (const [ingredientId, requirement] of requiredIngredients.entries()) {
            if (requirement.totalRequired.isZero()) continue;

            const prepRecipe = await prisma.prepRecipe.findFirst({
                where: { outputIngredientId: ingredientId },
                include: { outputIngredient: true } // Need outputIngredient for unit/name later
            });

            if (prepRecipe) {
                // Found a prep recipe - generate a task
                // TODO: Need a default location or allow selection? Using first storage for now.
                const defaultLocation = await prisma.venueObject.findFirst({
                     where: { type: { in: ['STORAGE', 'WORKSTATION_STORAGE', 'SHELF', 'FREEZER'] } }
                });
                if (!defaultLocation) {
                    console.warn(`Skipping task generation for ${requirement.name}: No suitable default storage location found.`);
                    continue; // Skip if no location available
                }

                // TODO: Check existing PENDING tasks for the same recipe/location to potentially aggregate?
                // For simplicity, create a new task for the full required amount.

                generatedTasks.push({
                    prepRecipeId: prepRecipe.id,
                    targetQuantity: requirement.totalRequired,
                    locationId: defaultLocation.id, // Use default location
                    status: PrepTaskStatus.PENDING,
                    notes: `Auto-generated for ${date} based on ${requirement.totalRequired.toFixed(2)} ${requirement.unit} total needed.`,
                    createdAt: targetDateStart // Associate with the target date
                });
            } else {
                // This is a raw ingredient needed, no PrepTask to generate
                // We assume raw ingredients are available via Purchase Orders / Stock Holdings
                 console.log(`Ingredient required (raw): ${requirement.name} - ${requirement.totalRequired.toFixed(2)} ${requirement.unit}`);
            }
        }

        // 4. Create the tasks in bulk
        if (generatedTasks.length > 0) {
            const result = await prisma.prepTask.createMany({
                data: generatedTasks,
                skipDuplicates: true // Avoid creating exact same task if run multiple times (based on unique constraints if any)
            });
            return NextResponse.json<ApiResponse>({ success: true, message: `${result.count} PrepTasks generated or already exist for ${date}.`, data: { count: result.count } });
        } else {
            return NextResponse.json<ApiResponse>({ success: true, message: `No new PrepTasks needed for prepared ingredients on ${date}. Raw materials assumed available.` });
        }

    } catch (error: any) {
        console.error("Error generating prep tasks:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: `Server error: ${error.message}` }, { status: 500 });
    }
}
