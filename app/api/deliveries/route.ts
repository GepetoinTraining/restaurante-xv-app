// PATH: app/api/deliveries/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Delivery, DeliveryStatus, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";

/**
 * GET /api/deliveries
 * Fetches deliveries, optionally filtered by date, company, or status.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // Expecting YYYY-MM-DD
    const companyClientId = searchParams.get("companyClientId");
    const status = searchParams.get("status") as DeliveryStatus | null;

    try {
        const where: Prisma.DeliveryWhereInput = {};
        if (date) {
            const targetDate = new Date(date + 'T00:00:00.000Z');
            where.deliveryDate = {
                gte: targetDate,
                lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
            };
        }
        if (companyClientId) {
            where.companyClientId = companyClientId;
        }
        if (status && Object.values(DeliveryStatus).includes(status)) {
            where.status = status;
        }

        const deliveries = await prisma.delivery.findMany({
            where,
            include: {
                companyClient: { select: { companyName: true } },
                route: { select: { id: true } }, // Include basic route info if linked
                _count: { select: { panShipments: true } } // Count pans in each delivery
            },
            orderBy: { deliveryDate: 'desc' },
        });

        // Serialize date
        const serializedDeliveries = deliveries.map(d => ({
            ...d,
            deliveryDate: d.deliveryDate.toISOString().split('T')[0],
        }));

        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedDeliveries });
    } catch (error) {
        console.error("Error fetching deliveries:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
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
