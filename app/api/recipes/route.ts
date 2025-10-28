// PATH: app/api/recipes/route.ts
// NOTE: This is a NEW FILE.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";

// Define the shape of the incoming recipe data from the client
type RecipeInput = {
  productId: string;
  notes?: string;
  difficulty?: number;
  ingredients: {
    ingredientId: string;
    quantity: string; // Client will send string
  }[];
  steps: {
    stepNumber: number;
    instruction: string;
  }[];
};

/**
 * POST /api/recipes
 * Creates or Updates a Recipe for a given Product ID.
 * This performs an "upsert" in a single transaction.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  if (
    !user?.isLoggedIn ||
    (user.role !== "MANAGER" && user.role !== "OWNER" && user.role !== "COOK")
  ) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    const body: RecipeInput = await req.json();
    const { productId, notes, difficulty, ingredients, steps } = body;

    if (!productId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Product ID é obrigatório" },
        { status: 400 }
      );
    }

    // Prepare ingredient data with Decimal quantities
    const ingredientsData = ingredients.map((ing) => ({
      ingredientId: ing.ingredientId,
      quantity: new Decimal(ing.quantity),
    }));

    // Perform the entire operation in a transaction
    const [recipe] = await prisma.$transaction(async (tx) => {
      // 1. Find if a recipe already exists for this product
      const existingRecipe = await tx.recipe.findUnique({
        where: { productId: productId },
        select: { id: true },
      });

      // 2. If it exists, delete its old ingredients and steps
      if (existingRecipe) {
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: existingRecipe.id },
        });
        await tx.recipeStep.deleteMany({
          where: { recipeId: existingRecipe.id },
        });
      }

      // 3. Create or Update the Recipe,
      //    and nested-create the new ingredients and steps
      const newRecipe = await tx.recipe.upsert({
        where: { productId: productId },
        // Update (if it exists)
        update: {
          notes: notes,
          difficulty: difficulty,
          ingredients: {
            createMany: {
              data: ingredientsData,
            },
          },
          steps: {
            createMany: {
              data: steps,
            },
          },
        },
        // Create (if it doesn't exist)
        create: {
          productId: productId,
          notes: notes,
          difficulty: difficulty,
          ingredients: {
            createMany: {
              data: ingredientsData,
            },
          },
          steps: {
            createMany: {
              data: steps,
            },
          },
        },
      });

      return [newRecipe];
    });

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: recipe },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating/updating recipe:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recipes
 * Fetches the recipe for a specific product ID
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user?.isLoggedIn) {
     return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Product ID é obrigatório" },
        { status: 400 }
      );
    }
    
    const recipe = await prisma.recipe.findUnique({
        where: { productId: productId },
        include: {
            ingredients: {
                include: {
                    ingredient: true // Include the ingredient details
                },
                orderBy: {
                    id: 'asc' // Use a stable order
                }
            },
            steps: {
                orderBy: {
                    stepNumber: 'asc'
                }
            }
        }
    });
    
    if (!recipe) {
         return NextResponse.json<ApiResponse>(
          { success: false, error: "Nenhuma receita encontrada" },
          { status: 404 }
        );
    }
    
    // Serialize all Decimals
    const serializedRecipe = {
        ...recipe,
        ingredients: recipe.ingredients.map(ing => ({
            ...ing,
            quantity: ing.quantity.toString(),
            ingredient: {
                ...ing.ingredient,
                // REMOVED: stock: ing.ingredient.stock.toString(), // Ingredient model doesn't have 'stock'
                costPerUnit: ing.ingredient.costPerUnit.toString(),
            }
        }))
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedRecipe },
      { status: 200 }
    );

  } catch (error) {
     console.error("Error fetching recipe:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}