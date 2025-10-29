// PATH: app/api/menus/route.ts
// --- START FIX: Import NextRequest ---
import { NextResponse, NextRequest } from "next/server";
// --- END FIX ---
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/utils";
import { getSession } from "@/lib/auth";

// GET /api/menus
// Fetches all menus and their associated recipes/products
export async function GET(req: NextRequest) { // This type is now recognized
  const session = await getSession();
  if (!session.user?.isLoggedIn) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 401 });
  }

  try {
    const menus = await prisma.menu.findMany({
      include: {
        recipes: { // This is MenuRecipeItem[]
          include: {
            recipe: { // This is the nested Recipe
              select: {
                id: true,
                productId: true,
                product: {
                  select: {
                    name: true, // Get the product's name
                  }
                }
              }
            }
          },
        }
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, data: menus });
  } catch (error) {
    return handleApiError(error, "Failed to fetch menus");
  }
}


// POST /api/menus
// Creates a new menu
const menuCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  weekNumber: z.number().int().optional(),
  recipeIds: z.array(z.string().cuid()).min(1, "At least one recipe is required"),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  try {
    const json = await req.json();
    const data = menuCreateSchema.parse(json);

    const newMenu = await prisma.menu.create({
      data: {
        name: data.name,
        description: data.description,
        weekNumber: data.weekNumber,
        recipes: {
          create: data.recipeIds.map((recipeId) => ({
            recipe: {
              connect: { id: recipeId },
            },
          })),
        },
      },
    });

    return NextResponse.json({ success: true, data: newMenu }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error, "Failed to create menu");
  }
}