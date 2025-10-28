// PATH: app/api/ingredients/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Ingredient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

/**
 * GET /api/ingredients
 * Fetches all ingredient definitions (name, unit, costPerUnit, isPrepared).
 */
export async function GET(req: NextRequest) {
    // Optional: Add auth check if needed
    // const session = await getSession();
    // if (!session.user?.isLoggedIn) { ... }

  try {
    const ingredients = await prisma.ingredient.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        costPerUnit: true,
        isPrepared: true, // Include isPrepared flag, prisma client will map to boolean
        // REMOVED: createdAt: true,
        // REMOVED: updatedAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Serialize Decimal fields for JSON response
    const serializedIngredients = ingredients.map((item) => ({
      ...item,
      costPerUnit: item.costPerUnit.toString(),
    }));

    return NextResponse.json<ApiResponse<any[]>>(
      { success: true, data: serializedIngredients },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor ao buscar ingredientes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ingredients
 * Creates a new ingredient definition.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) { // Add appropriate role check later
         return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

  try {
    const body = await req.json();
    const { name, unit, costPerUnit, isPrepared } = body; // Added isPrepared

    if (!name || !unit || costPerUnit === undefined || isPrepared === undefined) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Nome, Unidade, Custo por Unidade e 'É Preparado?' são obrigatórios",
        },
        { status: 400 }
      );
    }

    let costDecimal: Decimal;
    try {
      // Allow cost 0 if it's a prepared item
      costDecimal = new Decimal(costPerUnit);
      if (!isPrepared && costDecimal.isNegative()) {
           throw new Error("Custo não pode ser negativo para itens comprados.");
      }
      // If prepared, force cost to 0 initially, it will be calculated by PrepTasks
      if (isPrepared) {
          costDecimal = new Decimal(0);
      }
    } catch (e: any) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Formato de custo inválido: ${e.message}` },
        { status: 400 }
      );
    }

    const newIngredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        costPerUnit: costDecimal,
        isPrepared: !!isPrepared, // Ensure boolean
      },
    });

    // Serialize Decimal fields for response
    const serializedIngredient = {
      ...newIngredient,
      costPerUnit: newIngredient.costPerUnit.toString(),
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedIngredient },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating ingredient:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && error.meta?.target === "Ingredient_name_key") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Já existe um ingrediente com este nome." },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor ao criar ingrediente" },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/ingredients
 * Deletes an ingredient definition.
 * **Caution**: This should check if StockHoldings or Recipes exist first.
 */
export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) { // Add appropriate role check later
         return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json<ApiResponse>({ success: false, error: "ID do ingrediente é obrigatório" }, { status: 400 });
        }

        // **Important Checks:** Prevent deletion if used
        const stockCount = await prisma.stockHolding.count({ where: { ingredientId: id } });
        const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: id } });
        const prepInputCount = await prisma.prepRecipeInput.count({ where: { ingredientId: id }});
        // Check if it's an output for any prep recipe
        const prepOutputCount = await prisma.prepRecipe.count({ where: { outputIngredientId: id }});


        if (stockCount > 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Não é possível excluir. Existem lotes de estoque associados." }, { status: 409 });
        }
         if (recipeCount > 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Não é possível excluir. Ingrediente é usado em receitas de produtos." }, { status: 409 });
        }
         if (prepInputCount > 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Não é possível excluir. Ingrediente é usado como entrada em receitas de preparo." }, { status: 409 });
        }
         if (prepOutputCount > 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Não é possível excluir. Ingrediente é o resultado de uma receita de preparo." }, { status: 409 });
        }


        const deletedIngredient = await prisma.ingredient.delete({
            where: { id: id },
        });

        return NextResponse.json<ApiResponse<{ id: string }>>(
            { success: true, data: { id: deletedIngredient.id } },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("Error deleting ingredient:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente não encontrado." }, { status: 404 });
        }
        // P2003 Foreign key constraint should be caught by the checks above
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao excluir ingrediente." },
            { status: 500 }
        );
    }
}