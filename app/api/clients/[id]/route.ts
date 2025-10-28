// PATH: app/api/clients/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types"; // Remove ClientDetails
import { NextRequest, NextResponse } from "next/server";
// Import new, correct types
import {
  Client,
  ClientWallet,
  Visit,
  Order,
  OrderItem,
  Product,
} from "@prisma/client";

type GetParams = {
  params: { id: string };
};

// Define the new response shape
type ClientDetailsResponse = Client & {
  wallet: ClientWallet | null;
  visits: (Visit & {
    orders: (Order & {
      items: (OrderItem & { product: Product })[];
    })[];
  })[];
};

/**
 * GET /api/clients/[id]
 * Fetches detailed information for a single client
 */
export async function GET(req: NextRequest, { params }: GetParams) {
  try {
    const { id } = params;

    const client = await prisma.client.findUnique({
      where: { id: id },
      include: {
        wallet: true, // Include the client's wallet
        visits: {
          // Include their visit history
          orderBy: { checkInAt: "desc" },
          include: {
            orders: {
              // Include all orders for each visit
              orderBy: { createdAt: "desc" },
              include: {
                items: {
                  // Include all items for each order
                  include: {
                    product: true, // Include product details for each item
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // TODO: Need to serialize Decimal fields if we return this
    // For now, let's just return the core client data
    // A full serialization would be recursive and complex here.
    // Let's just return the client for now, and the UI can fetch
    // visits/orders separately if needed, or we can serialize.

    // Let's just serialize the top-level client fields (none exist)
    // and the wallet balance.
    const serializedClient = {
      ...client,
      wallet: client.wallet
        ? {
            ...client.wallet,
            balance: client.wallet.balance.toString(),
          }
        : null,
      // This is complex. For now, let's omit the deep visit/order serialization
      // and assume the client page will be refactored to handle it
      // or make separate requests.
      // We'll pass the data, but the client-side must parse Decimals.
      visits: client.visits.map((visit) => ({
        ...visit,
        totalSpent: visit.totalSpent.toString(),
        orders: visit.orders.map((order) => ({
          ...order,
          total: order.total.toString(),
          items: order.items.map((item) => ({
            ...item,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
            product: {
              ...item.product,
              price: item.product.price.toString(),
            },
          })),
        })),
      })),
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedClient },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error fetching client ${params.id}:`, error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}