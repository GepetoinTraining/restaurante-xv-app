// PATH: app/api/orders/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Order, OrderItem, Product, User, Visit, VenueObject, VenueObjectType, Prisma, StaffOrderAssignment } from "@prisma/client"; // Added StaffOrderAssignment
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

    // 1.5 Fetch the Visit to get the clientId and check if active
    const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        select: { clientId: true, status: true }
    });

    if (!visit) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Visita não encontrada." },
            { status: 404 }
        );
    }
     if (visit.status !== 'ACTIVE') {
         return NextResponse.json<ApiResponse>(
            { success: false, error: "A visita não está ativa." },
            { status: 400 } // Bad Request - cannot add order to inactive visit
        );
     }


    // 2. Fetch all product details needed, including prepStationId and recipes
    const productIds = items.map((item) => item.productId);
    const productsWithRecipes = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true, // Only allow ordering active products
      },
      include: {
        recipe: { // Include recipe
            include: {
                ingredients: { // Include recipe ingredients
                    include: {
                        ingredient: true // Include ingredient details (name, unit, costPerUnit)
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
    // Structure to hold stock deductions needed { ingredientId: { required: Decimal, name: string, unit: string, locations: string[] } }
    const requiredStockMap = new Map<string, { required: Decimal, name: string, unit: string, locations: string[] }>();
    const prepLocationMap = new Map<string, string>(); // Map<prepStationId, venueObjectId>

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        // This check handles inactive products too, as they won't be in productMap
        return NextResponse.json<ApiResponse>( { success: false, error: `Produto inválido ou inativo: ID ${item.productId}` }, { status: 400 });
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
        // status is defaulted to PENDING by schema
      });

      // --- Calculate required ingredients and find prep location ---
      if (product.recipe && product.recipe.ingredients.length > 0) {
           // Find the VenueObject representing the prep station for this product
           let prepVenueObjectId = prepLocationMap.get(product.prepStationId);
           if (!prepVenueObjectId) {
                // Find the *first* VenueObject linked to this Workstation ID.
                // Assumption: A workstation is represented by one primary VenueObject on the floorplan.
                const prepVenueObject = await prisma.venueObject.findFirst({
                    where: {
                        workstationId: product.prepStationId,
                        // type: VenueObjectType.WORKSTATION // Maybe too restrictive? Allow WORKSTATION_STORAGE too?
                    },
                    select: { id: true }
                });
                if (!prepVenueObject) {
                    // Critical error: The system needs a VenueObject linked to the workstation for stock deduction.
                    throw new Error(`Configuração inválida: Localização física (VenueObject) para a estação de preparo "${product.prepStation.name}" (ID: ${product.prepStationId}) não encontrada.`);
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
          let remainingRequiredOverall = requirement.required; // Track total needed for this ingredient

           // Try deducting from each required location for this ingredient
          for (const locationId of requirement.locations) {
                if (remainingRequiredOverall.lte(0)) break; // Already deducted enough overall

                 // Find available stock holdings for this ingredient at this specific location
                const holdings = await tx.stockHolding.findMany({
                    where: {
                        ingredientId: ingredientId,
                        venueObjectId: locationId,
                        quantity: { gt: 0 }
                    },
                    orderBy: { createdAt: 'asc' } // Simple FIFO
                });

                let neededFromThisLocation = remainingRequiredOverall; // How much is *still* needed for this ingredient?

                for (const holding of holdings) {
                    if (neededFromThisLocation.lte(0)) break; // Deducted enough for this location's need

                    const canDeductFromThisBatch = Decimal.min(neededFromThisLocation, holding.quantity);

                    await tx.stockHolding.update({
                        where: { id: holding.id },
                        data: {
                            quantity: { decrement: canDeductFromThisBatch }
                        }
                    });

                    totalDeductedForIngredient = totalDeductedForIngredient.plus(canDeductFromThisBatch);
                    remainingRequiredOverall = remainingRequiredOverall.minus(canDeductFromThisBatch);
                    neededFromThisLocation = neededFromThisLocation.minus(canDeductFromThisBatch);

                } // End loop through holdings for one location
          } // End loop through locations for one ingredient


          // Check if the total deducted amount across all relevant locations meets the requirement
          if (remainingRequiredOverall.gt(0)) {
                throw new Error(`Estoque insuficiente para "${requirement.name}" (${requirement.unit}). Necessário: ${requirement.required.toString()}, Disponível total nas estações relevantes: ${totalDeductedForIngredient.toString()}.`);
          }
      } // End loop through requiredStockMap

      // --- Create Order Records ---
      const order = await tx.order.create({
        data: {
          visitId: visitId,
          clientId: visit.clientId,
          total: totalOrderPrice,
          status: "PENDING", // Initial status
          items: {
            createMany: {
              data: orderItemsData,
            },
          },
          // Create the link to the staff member who handled it
          handledBy: {
            create: {
              userId: user.id,
              role: user.role, // Use the user's role from the session
            },
          },
        },
        include: {
            items: { // Include items in the response
                include: {
                    product: true // Include product details for items
                }
            },
            handledBy: { // Include handler details
                 include: {
                    user: { select: { id: true, name: true, role: true } }
                }
            }
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
             // Also serialize product price within items
            product: {
                ...item.product,
                price: item.product.price.toString(),
            }
        })),
        // handledBy does not contain Decimals based on include
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedOrder },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating order:", error);
    // Catch specific stock error from transaction
    if (error.message.startsWith('Estoque insuficiente') || error.message.startsWith('Configuração inválida:')) {
         return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 409 }); // 409 Conflict - stock/config issue
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { // Record not found
            return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Visita, produto, estação ou localização não encontrado durante a criação do pedido." }, { status: 404 });
        }
    }
     // Catch transaction timeout errors
     if (error.message.includes('Transaction API error: Transaction already closed') || error.message.includes('timed out')) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Erro: Tempo limite da transação excedido ao processar estoque. Tente novamente." }, { status: 504 }); // Gateway Timeout
     }

    return NextResponse.json<ApiResponse>(
      { success: false, error: `Erro interno do servidor ao criar pedido: ${error.message}` },
      { status: 500 }
    );
  }
}