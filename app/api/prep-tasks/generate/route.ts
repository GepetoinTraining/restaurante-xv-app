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
        
        // 1. Fetch all assignments for the target date
        const assignments = await prisma.dailyMenuAssignment.findMany({
            where: {
                assignmentDate: targetDateStart // Use the exact UTC date
            },
            include: {
                companyClient: { select: { employeeCount: true, consumptionFactor: true } },
                // --- START FIX: Corrected nested include to get ingredients ---
                menu: {
                    include: {
                        recipes: { // This is MenuRecipeItem[]
                            include: {
                                recipe: { // This is the nested Recipe
                                    include: {
                                        ingredients: { // This is RecipeIngredient[]
                                            include: {
                                                ingredient: { // This is the Ingredient
                                                    select: { name: true, unit: true }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // --- END FIX ---
            }
        });

        if (assignments.length === 0) {
            return NextResponse.json<ApiResponse>({ success: true, message: "No menu assignments found for this date. No tasks generated." });
        }

        // 2. Aggregate total required quantity for each *recipe ingredient*
        const requiredIngredients = new Map<string, { name: string, unit: string, totalRequired: Decimal }>();

        for (const assignment of assignments) {
            if (!assignment.menu || !assignment.companyClient) continue;

            // --- START FIX: Use .toNumber() as consumptionFactor is a Float ---
            const effectiveHeadcount = new Decimal(assignment.companyClient.employeeCount || 0)
                .times(assignment.companyClient.consumptionFactor || 1.0);
            // --- END FIX ---
            if (effectiveHeadcount.isZero()) continue;

            // --- START FIX: Correctly loop through nested relations ---
            for (const menuRecipeItem of assignment.menu.recipes) {
                if (!menuRecipeItem.recipe) continue; // Skip if recipe isn't included

                const scalingFactor = effectiveHeadcount; // Simple scaling

                for (const recipeIng of menuRecipeItem.recipe.ingredients) {
                    if (!recipeIng.ingredient) continue; // Skip if ingredient isn't included

                    const { ingredientId, quantity } = recipeIng;
                    const { name, unit } = recipeIng.ingredient; // Get details from the efficient include

                    const current = requiredIngredients.get(ingredientId) ?? { name, unit, totalRequired: new Decimal(0) };
                    const quantityNeeded = new Decimal(quantity).times(scalingFactor);
                    current.totalRequired = current.totalRequired.plus(quantityNeeded);
                    requiredIngredients.set(ingredientId, current);
                }
            }
            // --- END FIX ---
        }

        // 3. Find PrepRecipes that produce these required *prepared* ingredients
        const generatedTasks: Prisma.PrepTaskCreateManyInput[] = [];
        for (const [ingredientId, requirement] of requiredIngredients.entries()) {
            if (requirement.totalRequired.isZero()) continue;

            const prepRecipe = await prisma.prepRecipe.findFirst({
                where: { outputIngredientId: ingredientId },
            });

            if (prepRecipe) {
                // Found a prep recipe - generate a task
                const defaultLocation = await prisma.venueObject.findFirst({
                     where: { type: { in: ['STORAGE', 'WORKSTATION_STORAGE', 'SHELF', 'FREEZER'] } }
                });
                if (!defaultLocation) {
                    console.warn(`Skipping task generation for ${requirement.name}: No suitable default storage location found.`);
                    continue;
                }

                generatedTasks.push({
                    prepRecipeId: prepRecipe.id,
                    targetQuantity: requirement.totalRequired,
                    locationId: defaultLocation.id,
                    status: PrepTaskStatus.PENDING,
                    notes: `Auto-generated for ${date} based on ${requirement.totalRequired.toFixed(2)} ${requirement.unit} total needed.`,
                    createdAt: targetDateStart
                });
            } else {
                 console.log(`Ingredient required (raw): ${requirement.name} - ${requirement.totalRequired.toFixed(2)} ${requirement.unit}`);
            }
        }

        // 4. Create the tasks in bulk
        if (generatedTasks.length > 0) {
            const result = await prisma.prepTask.createMany({
                data: generatedTasks,
                skipDuplicates: true // Avoid creating exact same task if run multiple times
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