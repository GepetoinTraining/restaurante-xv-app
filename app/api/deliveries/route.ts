// PATH: app/api/deliveries/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Delivery, DeliveryStatus, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";

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
        const { deliveryDate, companyClientId, routeId, notes } = body; // Expecting date as YYYY-MM-DD

        if (!deliveryDate || !companyClientId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Delivery Date and Company Client ID are required" }, { status: 400 });
        }

        const dateObject = new Date(deliveryDate + 'T00:00:00.000Z');

        const data: Prisma.DeliveryCreateInput = {
            deliveryDate: dateObject,
            companyClient: { connect: { id: companyClientId } },
            status: DeliveryStatus.PLANNED, // Initial status
            notes,
            route: routeId ? { connect: { id: routeId } } : undefined,
            // Weather can be added later via PATCH or a separate process
        };

        const newDelivery = await prisma.delivery.create({
            data,
            include: {
                companyClient: { select: { companyName: true } }
            }
        });

        const serializedDelivery = {
            ...newDelivery,
            deliveryDate: newDelivery.deliveryDate.toISOString().split('T')[0],
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedDelivery }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating delivery:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003' || error.code === 'P2025') { // FK constraint or record not found
                return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Company Client ID or Route ID provided" }, { status: 400 });
             }
         }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
