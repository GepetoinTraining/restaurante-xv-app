// PATH: app/api/prep-recipes/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { PrepRecipe, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for creating PrepRecipe with inputs
type PrepRecipeCreateInput = {
    name: string;
    outputIngredientId: string;
    outputQuantity: string | number;
    notes?: string;
    estimatedLaborTime?: number;
    inputs: {
        ingredientId: string;
        quantity: string | number;
    }[];
}

/**
 * POST /api/prep-recipes
 * Creates a new preparation recipe definition.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // TODO: Define appropriate roles (MANAGER, OWNER, COOK?)
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body: PrepRecipeCreateInput = await req.json();
        const { name, outputIngredientId, outputQuantity, notes, estimatedLaborTime, inputs } = body;

        if (!name || !outputIngredientId || outputQuantity === undefined || !inputs || inputs.length === 0) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Nome, Ingrediente de Saída, Quantidade de Saída e Ingredientes de Entrada são obrigatórios." },
            { status: 400 }
        );
        }

        // Validate output quantity
        let outputQuantityDecimal: Decimal;
        try {
            outputQuantityDecimal = new Decimal(outputQuantity);
            if (outputQuantityDecimal.isNegative() || outputQuantityDecimal.isZero()) {
                throw new Error("Quantidade de saída deve ser positiva.");
            }
        } catch (e: any) {
             return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade de saída inválida: ${e.message}` }, { status: 400 });
        }

        // Validate input quantities and structure
        const inputsData = [];
        for (const input of inputs) {
             if (!input.ingredientId || input.quantity === undefined) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Cada ingrediente de entrada deve ter ID e quantidade." }, { status: 400 });
             }
             try {
                const inputQuantityDecimal = new Decimal(input.quantity);
                if (inputQuantityDecimal.isNegative() || inputQuantityDecimal.isZero()) {
                     throw new Error(`Quantidade para o ingrediente ID ${input.ingredientId} deve ser positiva.`);
                }
                inputsData.push({
                    ingredientId: input.ingredientId,
                    quantity: inputQuantityDecimal,
                });
            } catch (e: any) {
                 return NextResponse.json<ApiResponse>({ success: false, error: `Quantidade de entrada inválida: ${e.message}` }, { status: 400 });
            }
        }

        // Ensure output ingredient exists and is marked as prepared
        const outputIngredient = await prisma.ingredient.findUnique({ where: { id: outputIngredientId }});
        if (!outputIngredient) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente de saída não encontrado." }, { status: 404 });
        }
        if (!outputIngredient.isPrepared) {
             // Optionally auto-set it? Or enforce setting it first? For now, enforce.
             return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente de saída deve ser marcado como 'preparado'." }, { status: 400 });
        }

        // Create PrepRecipe and its inputs in a transaction
        const newPrepRecipe = await prisma.prepRecipe.create({
            data: {
                name,
                outputIngredientId,
                outputQuantity: outputQuantityDecimal,
                notes,
                estimatedLaborTime,
                inputs: {
                    createMany: {
                        data: inputsData.map(inp => ({
                            ingredientId: inp.ingredientId,
                            quantity: inp.quantity
                        }))
                    }
                }
            },
            include: { // Include inputs in the response
                inputs: {
                    include: {
                        ingredient: { select: { name: true, unit: true }}
                    }
                },
                outputIngredient: { select: { name: true, unit: true }}
            }
        });

        // Serialize Decimals for response
        const serializedRecipe = {
            ...newPrepRecipe,
            outputQuantity: newPrepRecipe.outputQuantity.toString(),
            inputs: newPrepRecipe.inputs.map(inp => ({
                ...inp,
                quantity: inp.quantity.toString(),
            }))
        };


        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedRecipe },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Error creating prep recipe:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && error.meta?.target === 'PrepRecipe_name_key') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Já existe uma receita de preparo com este nome." }, { status: 409 });
        }
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') { // FK constraint
            if (error.meta?.field_name?.toString().includes('outputIngredientId')) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente de saída não encontrado." }, { status: 404 });
            }
             if (error.meta?.field_name?.toString().includes('ingredientId')) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Um ou mais ingredientes de entrada não foram encontrados." }, { status: 404 });
            }
         }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao criar receita de preparo" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/prep-recipes
 * Fetches all preparation recipe definitions.
 */
export async function GET(req: NextRequest) {
     const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
     try {
        const prepRecipes = await prisma.prepRecipe.findMany({
            include: {
                outputIngredient: { select: { id: true, name: true, unit: true } },
                inputs: {
                    include: {
                        ingredient: { select: { id: true, name: true, unit: true } }
                    },
                    orderBy: { ingredient: { name: 'asc' }} // Order inputs alphabetically
                }
            },
            orderBy: { name: 'asc' },
        });

         // Serialize Decimals
        const serializedRecipes = prepRecipes.map(recipe => ({
            ...recipe,
            outputQuantity: recipe.outputQuantity.toString(),
            inputs: recipe.inputs.map(inp => ({
                ...inp,
                quantity: inp.quantity.toString(),
            }))
        }));


        return NextResponse.json<ApiResponse<any[]>>(
            { success: true, data: serializedRecipes },
            { status: 200 }
        );

     } catch (error) {
        console.error("Error fetching prep recipes:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao buscar receitas de preparo" },
            { status: 500 }
        );
     }
}