// PATH: app/api/live/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
// --- START FIX 1: Import Decimal ---
import { OrderStatus, ServerCallStatus, VisitStatus, Prisma } from "@prisma/client";
// --- END FIX 1 ---
import { subHours } from "date-fns"; // For filtering recent orders


// --- START FIX 2: Define base types using GetPayload ---
// These represent the structure *before* serialization
type _LiveVisitBase = Prisma.VisitGetPayload<{
  include: {
    client: { select: { name: true } };
    tab: { select: { rfid: true } };
    venueObject: { select: { name: true } }; // Removed | null here
  };
}>;

type _LiveServerCallBase = Prisma.ServerCallGetPayload<{
  include: {
    venueObject: { select: { name: true } };
    visit: { include: { client: { select: { name: true } } } };
    acknowledgedBy: { select: { name: true } }; // Removed | null here
  };
}>;

type _LiveOrderBase = Prisma.OrderGetPayload<{
  include: {
    visit: { include: { client: { select: { name: true } } } };
    items: {
      include: { product: { select: { name: true } } };
    };
    handledBy: { // Staff who handled the order
      include: { user: { select: { name: true } } };
    };
  };
}>;
// --- END FIX 2 ---


// --- START FIX 3: Define Serialized Types (used in final response) ---
// These represent the structure *after* Decimal fields are converted to strings
export type LiveVisit = Omit<_LiveVisitBase, 'totalSpent'> & {
    totalSpent: string;
    // Ensure nested relations are correctly typed (Prisma handles nullability)
    venueObject: { name: string } | null;
    tab: { rfid: string } | null;
};

// LiveServerCall might not need serialization if no Decimals are involved,
// but let's keep the pattern for consistency or future changes.
// The relation acknowledgedBy can be null, Prisma handles this.
export type LiveServerCall = _LiveServerCallBase & {
    acknowledgedBy: { name: string } | null;
};

export type LiveOrder = Omit<_LiveOrderBase, 'total' | 'items'> & {
    total: string;
    items: (Omit<_LiveOrderBase['items'][number], 'unitPrice' | 'totalPrice'> & {
        unitPrice: string;
        totalPrice: string;
    })[];
};
// --- END FIX 3 ---

// Structure of the overall response (Uses the Serialized types)
export type LiveDataResponse = {
  activeVisits: LiveVisit[];
  recentOrders: LiveOrder[];
  pendingCalls: LiveServerCall[];
};


/**
 * GET /api/live
 * Fetches current operational data: active visits, recent orders, pending calls.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  // Ensure user is logged in (adjust roles if needed for specific data)
  if (!user?.isLoggedIn) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    // 1. Fetch Active Visits using the base include
    const activeVisits = await prisma.visit.findMany({
      where: {
        status: VisitStatus.ACTIVE,
      },
      include: {
        client: { select: { name: true } },
        tab: { select: { rfid: true } },
        venueObject: { select: { name: true } },
      },
      orderBy: {
        checkInAt: "asc", // Show oldest check-ins first
      },
    });

    // 2. Fetch Recent Orders using the base include
    const oneHourAgo = subHours(new Date(), 1);
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
      include: {
        visit: { include: { client: { select: { name: true } } } },
        items: {
          include: { product: { select: { name: true } } },
        },
        handledBy: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    // 3. Fetch Pending & Acknowledged Server Calls using the base include
    const pendingCalls = await prisma.serverCall.findMany({
      where: {
        status: {
          in: [ServerCallStatus.PENDING, ServerCallStatus.ACKNOWLEDGED],
        },
      },
      include: {
        venueObject: { select: { name: true } },
        visit: { include: { client: { select: { name: true } } } },
        acknowledgedBy: { select: { name: true } }, // Prisma handles null correctly
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 4. Serialize Decimal fields
    const serializedVisits: LiveVisit[] = activeVisits.map(visit => ({
        ...visit,
        // Prisma returns null if relation doesn't exist, handle it here explicitly if needed,
        // but the type definition already allows null for venueObject and tab
        venueObject: visit.venueObject ? { name: visit.venueObject.name } : null,
        tab: visit.tab ? { rfid: visit.tab.rfid } : null,
        totalSpent: visit.totalSpent.toString(),
    }));

    const serializedOrders: LiveOrder[] = recentOrders.map(order => ({
        ...order,
        total: order.total.toString(),
        items: order.items.map(item => ({
            ...item,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
        }))
    }));

    // Server calls don't typically have decimals needing serialization in this structure

    // 5. Assemble response - No casts needed now
    const liveData: LiveDataResponse = {
      activeVisits: serializedVisits,
      recentOrders: serializedOrders,
      pendingCalls: pendingCalls, // pendingCalls matches LiveServerCall type now
    };

    return NextResponse.json<ApiResponse<LiveDataResponse>>(
      { success: true, data: liveData },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error fetching live data:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: `Erro interno do servidor: ${error.message}` },
      { status: 500 }
    );
  }
}