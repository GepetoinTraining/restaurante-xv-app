// PATH: app/api/deliveries/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Delivery, DeliveryStatus, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
// --- START FIX: Add missing import for toUTC ---
import { toUTC } from "@/lib/utils";
// --- END FIX ---

/**
 * GET /api/deliveries
 *
 * Fetches deliveries.
 * Supports filtering by:
 * - ?date=YYYY-MM-DD (filters by deliveryDate)
 * - ?unassigned=true (filters for deliveries NOT linked to a RouteStop)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');
  const unassigned = searchParams.get('unassigned') === 'true';

  let where: Prisma.DeliveryWhereInput = {};

  // Date filtering
  if (dateParam) {
    const deliveryDate = toUTC(new Date(dateParam));
    where.deliveryDate = deliveryDate;
  }

  // Unassigned filtering
  if (unassigned) {
    where.routeStop = null; // This is the key change
  }

  try {
    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        companyClient: {
          select: { companyName: true, addressStreet: true },
        },
        vehicle: {
          select: { model: true, licensePlate: true },
        },
        driver: {
          select: { name: true },
        },
        panShipments: {
          select: { id: true, outWeightGrams: true },
        },
        routeStop: {
          select: { id: true, routeId: true }, // Include routeStop to confirm it's null
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(deliveries);
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/deliveries
 * Creates a new delivery record for a company on a specific date.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // Assuming MANAGER, OWNER, or maybe COOK/DRIVER can create deliveries
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER', 'COOK', 'DRIVER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        // --- START FIX: POST does not use routeId directly, routeStop does ---
        const { deliveryDate, companyClientId, notes } = body; // Expecting date as YYYY-MM-DD
        // --- END FIX ---

        if (!deliveryDate || !companyClientId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Delivery Date and Company Client ID are required" }, { status: 400 });
        }
        
        // --- START FIX: Use toUTC for date consistency ---
        const dateObject = toUTC(new Date(deliveryDate));
        // --- END FIX ---

        const data: Prisma.DeliveryCreateInput = {
            deliveryDate: dateObject,
            companyClient: { connect: { id: companyClientId } },
            // --- START FIX: Changed status to PENDING ---
            status: DeliveryStatus.PENDING, // Initial status
            // --- END FIX ---
            notes,
            // route: routeId ? { connect: { id: routeId } } : undefined, // This link is made via RouteStop
        };

        const newDelivery = await prisma.delivery.create({
            data,
            include: {
                companyClient: { select: { companyName: true } }
            }
        });

        // --- START FIX: POST response serialization was incorrect ---
        const serializedDelivery = {
            ...newDelivery,
            // Re-serialize Decimals if any, (none here)
        };
        // --- END FIX ---

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedDelivery }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating delivery:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003' || error.code === 'P2025') { // FK constraint or record not found
                return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Company Client ID provided" }, { status: 400 });
             }
         }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}