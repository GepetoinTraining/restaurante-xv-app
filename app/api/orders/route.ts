// PATH: app/api/orders/route.ts
// NOTE: Added stock deduction logic

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Order, OrderItem, Product, User, Visit, VenueObject, VenueObjectType, Prisma } from "@prisma/client"; // Added Visit, VenueObject, VenueObjectType, Prisma
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth"; // To get the logged-in user

// Type for items coming from the cart
type CartItem = {
  productId: string;
  quantity: number;
};

/**
 * POST /api/orders
 * Creates a new order for a specific visit, including stock deduction.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  // 1. Check for authenticated user
  if (!user || !user.isLoggedIn) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Usuário não autenticado" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { visitId, items } = body as {
      visitId: string;
      items: CartItem[];
    };

    if (!visitId || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "ID da Visita e Itens são obrigatórios",
        },
        { status: 400 }
      );
    }

    // 1.5 Fetch the Visit to get the clientId
    const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        select: { clientId: true }
    });

    if (!visit) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Visita não encontrada." },
            { status: 404 }
        );
    }


    // 2. Fetch all product details needed, including prepStationId and recipes
    const productIds = items.map((item) => item.productId);
    const productsWithRecipes = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        recipe: { // Include recipe
            include: {
                ingredients: { // Include recipe ingredients
                    include: {
                        ingredient: true // Include ingredient details (name, unit)
                    }
                }
            }
        },
        // Include prepStation info to find the VenueObject later
        prepStation: true,
      },
    });

    // 3. Create maps for quick lookup and validate items
    const productMap = new Map<string, typeof productsWithRecipes[0]>();
    productsWithRecipes.forEach((p) => productMap.set(p.id, p));

    let totalOrderPrice = new Decimal(0);
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
    // Structure to hold stock deductions needed { ingredientId: { required: Decimal, name: string, unit: string } }
    const requiredStockMap = new Map<string, { required: Decimal, name: string, unit: string, locations: string[] }>();
    const prepLocationMap = new Map<string, string>(); // Map<prepStationId, venueObjectId>

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json<ApiResponse>( { success: false, error: `Produto inválido: ID ${item.productId}` }, { status: 400 });
      }
      if (item.quantity <= 0) {
         return NextResponse.json<ApiResponse>( { success: false, error: `Quantidade inválida para ${product.name}` }, { status: 400 });
      }

      // --- Calculate item price ---
      const unitPrice = product.price;
      const itemTotalPrice = unitPrice.times(item.quantity);
      totalOrderPrice = totalOrderPrice.plus(itemTotalPrice);

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: itemTotalPrice,
        workstationId: product.prepStationId,
      });

      // --- Calculate required ingredients and find prep location ---
      if (product.recipe && product.recipe.ingredients.length > 0) {
           // Find the VenueObject representing the prep station for this product
           let prepVenueObjectId = prepLocationMap.get(product.prepStationId);
           if (!prepVenueObjectId) {
                const prepVenueObject = await prisma.venueObject.findFirst({
                    where: {
                        workstationId: product.prepStationId,
                        type: VenueObjectType.WORKSTATION // Or maybe WORKSTATION_STORAGE? Define rule.
                    },
                    select: { id: true }
                });
                if (!prepVenueObject) {
                    throw new Error(`Localização (VenueObject) para a estação de preparo "${product.prepStation.name}" (ID: ${product.prepStationId}) não encontrada.`);
                }
                prepVenueObjectId = prepVenueObject.id;
                prepLocationMap.set(product.prepStationId, prepVenueObjectId);
           }


          for (const recipeIngredient of product.recipe.ingredients) {
            const totalRequired = recipeIngredient.quantity.times(item.quantity);
            const currentRequirement = requiredStockMap.get(recipeIngredient.ingredientId) ?? {
                 required: new Decimal(0),
                 name: recipeIngredient.ingredient.name,
                 unit: recipeIngredient.ingredient.unit,
                 locations: [] // Track which locations need this ingredient
            };

            currentRequirement.required = currentRequirement.required.plus(totalRequired);
            // Add the specific location required for *this* item's ingredient
            if (!currentRequirement.locations.includes(prepVenueObjectId)) {
                currentRequirement.locations.push(prepVenueObjectId);
            }

            requiredStockMap.set(recipeIngredient.ingredientId, currentRequirement);
          }
      } else {
          // Handle products without recipes - should they deduct stock?
          // If a product IS an ingredient (e.g., selling a can of soda)
          // we might need a direct link Product -> Ingredient to deduct.
          // For now, only recipe ingredients are deducted.
          console.warn(`Product ${product.name} (ID: ${product.id}) has no recipe, stock not deducted.`);
      }
    } // End loop through cart items

    // 4. Create Order and Deduct Stock within a transaction
    const [newOrder, updatedVisit] = await prisma.$transaction(async (tx) => {

      // --- Stock Deduction Logic ---
      for (const [ingredientId, requirement] of requiredStockMap.entries()) {
          let totalDeductedForIngredient = new Decimal(0);

           // Try deducting from each required location for this ingredient
          for (const locationId of requirement.locations) {
                // Calculate how much *more* needs to be deducted for this ingredient *overall*
                let stillRequired = requirement.required.minus(totalDeductedForIngredient);
                if (stillRequired.lte(0)) break; // Already deducted enough from other locations/items

                 // Find available stock holdings for this ingredient at this specific location
                const holdings = await tx.stockHolding.findMany({
                    where: {
                        ingredientId: ingredientId,
                        venueObjectId: locationId,
                        quantity: { gt: 0 }
                    },
                    orderBy: { createdAt: 'asc' } // Simple FIFO
                });

                let deductedFromThisLocation = new Decimal(0);
                for (const holding of holdings) {
                    // How much do we need from *this specific batch*?
                    const neededFromThisBatch = Decimal.min(stillRequired.minus(deductedFromThisLocation), holding.quantity);

                    if (neededFromThisBatch.lte(0)) continue; // Skip if batch not needed or empty

                    await tx.stockHolding.update({
                        where: { id: holding.id },
                        data: {
                            quantity: { decrement: neededFromThisBatch }
                        }
                    });

                    deductedFromThisLocation = deductedFromThisLocation.plus(neededFromThisBatch);
                    totalDeductedForIngredient = totalDeductedForIngredient.plus(neededFromThisBatch); // Track overall deduction

                    if (deductedFromThisLocation.gte(stillRequired)) {
                        break; // Deducted enough for this ingredient from this location
                    }
                }
                 // Check if enough was deducted *from this location* for the portion required here
                 // Note: This simple check might fail if multiple order items need the same ingredient
                 // from the same location, summing up to more than available. A more robust check
                 // might aggregate requirements *per location* before deduction.
                 // For now, we check the overall deduction below.
          } // End loop through locations for one ingredient


          // Check if the total deducted amount across all relevant locations meets the requirement
          if (totalDeductedForIngredient.lt(requirement.required)) {
                throw new Error(`Estoque insuficiente para "${requirement.name}" (${requirement.unit}). Necessário: ${requirement.required.toString()}, Disponível nas estações relevantes: ${totalDeductedForIngredient.toString()}.`);
          }
      } // End loop through requiredStockMap

      // --- Create Order Records ---
      const order = await tx.order.create({
        data: {
          visitId: visitId,
          clientId: visit.clientId,
          total: totalOrderPrice,
          status: "PENDING",
          items: {
            createMany: {
              data: orderItemsData,
            },
          },
          handledBy: {
            create: {
              userId: user.id,
            },
          },
        },
        include: {
            items: true,
        }
      });

      // Update Visit totalSpent
      const visitUpdate = await tx.visit.update({
        where: { id: visitId },
        data: {
          totalSpent: {
            increment: totalOrderPrice,
          },
        },
      });

      // Stock deduction successful, order created.
      return [order, visitUpdate];

    }, {
        maxWait: 10000, // 10 seconds
        timeout: 20000, // 20 seconds
    }); // End Transaction

    // Serialize Decimals in the response
     const serializedOrder = {
        ...newOrder,
        total: newOrder.total.toString(),
        items: newOrder.items.map(item => ({
            ...item,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
        })),
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedOrder },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating order:", error);
    // Catch specific stock error from transaction
    if (error.message.startsWith('Estoque insuficiente')) {
         return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 409 }); // 409 Conflict - stock issue
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
            return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Visita, produto ou localização não encontrado durante a criação do pedido." }, { status: 404 });
        }
    }
     // Catch transaction timeout errors
     if (error.message.includes('Transaction API error: Transaction already closed')) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Tempo limite da transação excedido. Tente novamente." }, { status: 504 }); // Gateway Timeout
     }

    return NextResponse.json<ApiResponse>(
      { success: false, error: `Erro interno do servidor ao criar pedido: ${error.message}` },
      { status: 500 }
    );
  }
}