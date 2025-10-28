// PATH: app/api/live/route.ts
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import {
  Visit,
  Client,
  Tab,
  VenueObject,
  ServerCall,
  User,
  Order,
  OrderItem,
  Product,
  ServerCallStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// --- Define the new Live Data structure ---

// Active Visit
export type LiveVisit = Visit & {
  client: Client;
  tab: Tab;
  venueObject: VenueObject | null;
};

// Pending Server Call
export type LiveServerCall = ServerCall & {
  visit: Visit & { client: Client };
  venueObject: VenueObject;
  acknowledgedBy: User | null;
};

// Recent Order
export type LiveOrder = Order & {
  items: (OrderItem & { product: Product })[];
  handledBy: { user: User }[];
  visit: Visit & { client: Client };
};

// The combined API Response
export type LiveDataResponse = {
  activeVisits: LiveVisit[];
  pendingCalls: LiveServerCall[];
  recentOrders: LiveOrder[]; // (e.g., last 1 hour)
};

// Helper function to serialize Decimals
// This is complex and needs to be done carefully
const serializeLiveData = (data: LiveDataResponse): any => {
  return {
    activeVisits: data.activeVisits.map((visit) => ({
      ...visit,
      totalSpent: visit.totalSpent.toString(),
      venueObject: visit.venueObject
        ? {
            ...visit.venueObject,
            reservationCost: visit.venueObject.reservationCost?.toString() || null,
          }
        : null,
    })),
    pendingCalls: data.pendingCalls.map((call) => ({
      ...call,
      visit: {
        ...call.visit,
        totalSpent: call.visit.totalSpent.toString(),
      },
      venueObject: {
          ...call.venueObject,
          reservationCost: call.venueObject.reservationCost?.toString() || null,
      }
    })),
    recentOrders: data.recentOrders.map((order) => ({
      ...order,
      total: order.total.toString(),
      visit: {
        ...order.visit,
        totalSpent: order.visit.totalSpent.toString(),
      },
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
  };
};

/**
 * GET /api/live
 * Fetches all data needed for the live operations dashboard
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  // Use 'user' session from auth refactor
  if (!session.user?.isLoggedIn) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    // 1. Get Active Visits
    const activeVisits = await prisma.visit.findMany({
      where: {
        checkOutAt: null, // The new way to check for active visits
      },
      include: {
        client: true,
        tab: true,
        venueObject: true, // Get the associated location
      },
      orderBy: { checkInAt: "desc" },
    });

    // 2. Get Pending Server Calls
    const pendingCalls = await prisma.serverCall.findMany({
      where: {
        status: {
          in: [ServerCallStatus.PENDING, ServerCallStatus.ACKNOWLEDGED],
        },
      },
      include: {
        visit: {
          include: {
            client: true,
          },
        },
        venueObject: true,
        acknowledgedBy: true, // User who acknowledged
      },
      orderBy: { createdAt: "asc" },
    });

    // 3. Get Recent Orders (e.g., last 1 hour)
    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        handledBy: {
          include: {
            user: true, // Staff who took the order
          },
        },
        visit: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Limit to last 20
    });

    const liveData: LiveDataResponse = {
      activeVisits: activeVisits as LiveVisit[],
      pendingCalls: pendingCalls as LiveServerCall[],
      recentOrders: recentOrders as LiveOrder[],
    };
    
    // Serialize all Decimal fields before sending
    const serializedData = serializeLiveData(liveData);

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedData },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/live error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro ao buscar dados ao vivo" },
      { status: 500 }
    );
  }
}