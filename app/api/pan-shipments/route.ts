// PATH: app/api/pan-shipments/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// --- START FIX: Corrected Enum imports ---
import { PanShipment, PanStatus, DeliveryStatus, Prisma } from "@prisma/client";
// --- END FIX ---
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

/**
 * GET /api/pan-shipments
 * Fetches pan shipments, typically filtered by deliveryId.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deliveryId = searchParams.get("deliveryId");
    const panId = searchParams.get("panId"); // Optional filter

    if (!deliveryId && !panId) {
         return NextResponse.json<ApiResponse>({ success: false, error: "Requires deliveryId or panId filter" }, { status: 400 });
    }

    try {
        const where: Prisma.PanShipmentWhereInput = {};
        if (deliveryId) where.deliveryId = deliveryId;
        // --- START FIX: Corrected field name ---
        if (panId) where.servingPanId = panId;
        // --- END FIX ---

        const shipments = await prisma.panShipment.findMany({
            where,
            include: {
                // --- START FIX: Corrected relation name ---
                servingPan: { include: { panModel: true } },
                // recipe relation does not exist
                // --- END FIX ---
            },
            orderBy: { outTimestamp: 'desc' },
        });

        // Serialize decimals
        const serializedShipments = shipments.map(s => ({
            ...s,
            // --- START FIX: Use correct field names from schema ---
            outWeightGrams: s.outWeightGrams.toString(),
            inWeightGrams: s.inWeightGrams?.toString(),
            calculatedWasteGrams: s.calculatedWasteGrams?.toString(),
            // --- END FIX ---
            servingPan: {
                ...s.servingPan,
                panModel: {
                    ...s.servingPan.panModel,
                    // --- START FIX: Use correct field names from schema ---
                    capacityL: s.servingPan.panModel.capacityL?.toString(),
                    tareWeightG: s.servingPan.panModel.tareWeightG?.toString(),
                    // --- END FIX ---
                }
            }
        }));

        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedShipments });
    } catch (error) {
        console.error("Error fetching pan shipments:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/pan-shipments
 * Creates a new pan shipment record (logging outbound pan).
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER', 'COOK', 'DRIVER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    let requestBody: any;
    try {
        requestBody = await req.json();
        // --- START FIX: Use correct field names ---
        const { deliveryId, uniqueIdentifier, recipeGuess, outWeightGrams } = requestBody;
        // --- END FIX ---

        if (!deliveryId || !uniqueIdentifier || !outWeightGrams) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Delivery ID, Pan Identifier, and Outbound Weight are required" }, { status: 400 });
        }

        let outboundWeightDecimal: Decimal;
        try {
            // --- START FIX: Use outWeightGrams ---
            outboundWeightDecimal = new Decimal(outWeightGrams);
            // --- END FIX ---
             if (outboundWeightDecimal.isNegative()) throw new Error();
        } catch {
             return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Outbound Weight format" }, { status: 400 });
        }

        // Transaction: Find Pan, Create Shipment, Update Pan Status, Update Delivery Status
        const newShipment = await prisma.$transaction(async (tx) => {
            // 1. Find the pan by its unique identifier
            const pan = await tx.servingPan.findUnique({
                where: { uniqueIdentifier: uniqueIdentifier },
                include: { panModel: true } // Include model for response
            });
            if (!pan) throw new Error(`Serving Pan with identifier ${uniqueIdentifier} not found.`);
            
            // --- START FIX: Use correct PanStatus enum ---
            if (pan.status !== PanStatus.AVAILABLE) {
                 console.warn(`Pan ${uniqueIdentifier} is being shipped with status ${pan.status}`);
                 // Allow shipping anyway
            }
            // --- END FIX ---

            // 2. Find the delivery
            const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
            if (!delivery) throw new Error(`Delivery ${deliveryId} not found.`);

            // 3. Create the PanShipment record
            const shipment = await tx.panShipment.create({
                data: {
                    deliveryId: deliveryId,
                    servingPanId: pan.id, // Corrected field name
                    recipeGuess: recipeGuess || null, // Corrected field name
                    outWeightGrams: outboundWeightDecimal, // Corrected field name
                    outTimestamp: new Date(),
                    // --- START FIX (ts(2353)): Removed 'notes' as it's not in the schema ---
                    // notes,
                    // --- END FIX ---
                },
            });

            // 4. Update Pan Status to IN_USE
            await tx.servingPan.update({
                where: { id: pan.id },
                // --- START FIX: Use correct PanStatus enum ---
                data: { status: PanStatus.IN_USE }
                // --- END FIX ---
            });

            // 5. Update Delivery Status to OUT_FOR_DELIVERY (if not already)
            // --- START FIX (ts(2345)): Use correct DeliveryStatus enums ---
             if ([DeliveryStatus.PENDING, DeliveryStatus.READY_FOR_DISPATCH].includes(delivery.status)) {
                 await tx.delivery.update({
                    where: { id: deliveryId },
                    data: { status: DeliveryStatus.OUT_FOR_DELIVERY }
                });
             }
            // --- END FIX ---

            // Return shipment with pan data for serialization
            return { ...shipment, servingPan: pan };
        });


        // Serialize
        const serializedShipment = {
             ...newShipment,
            // --- START FIX: Use correct field names ---
            outWeightGrams: newShipment.outWeightGrams.toString(),
            servingPan: {
                ...newShipment.servingPan,
                panModel: {
                    ...newShipment.servingPan.panModel,
                    capacityL: newShipment.servingPan.panModel.capacityL?.toString(),
                    tareWeightG: newShipment.servingPan.panModel.tareWeightG?.toString(),
                }
            }
            // --- END FIX ---
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedShipment }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating pan shipment:", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003' || error.code === 'P2025') {
                return NextResponse.json<ApiResponse>({ success: false, error: `Invalid Delivery ID or Pan Identifier. Details: ${error.message}` }, { status: 400 });
             }
         }
          if (error.message.includes("not found")) {
              return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 404 });
          }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}