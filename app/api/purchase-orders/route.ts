// PATH: app/api/purchase-orders/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// --- START FIX: Correct Enum and model import ---
import { PurchaseOrder, PurchaseOrderItem, POStatus, StockHolding, Prisma } from "@prisma/client";
// --- END FIX ---
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for creating a PO with items
type PurchaseOrderCreateInput = {
    supplierId: string; // Made required
    orderDate?: string; // ISO string
    expectedDeliveryDate?: string; // ISO string
    invoiceNumber?: string;
    notes?: string;
    items: {
        ingredientId: string;
        orderedQuantity: string | number;
        orderedUnit: string; // --- START FIX: Added missing required field ---
        unitCost: string | number;
    }[];
};

/**
 * GET /api/purchase-orders
 * Fetches all purchase orders.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['FINANCIAL', 'MANAGER', 'OWNER', 'COOK'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    try {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            include: {
                supplier: { select: { name: true } },
                // --- START FIX: Correct relation name ---
                approvedBy: { select: { name: true } },
                // --- END FIX ---
                items: {
                    include: {
                        ingredient: { select: { name: true, unit: true } }
                    }
                }
            },
            orderBy: { orderDate: 'desc' },
        });

        // Serialize decimals
        const serializedPOs = purchaseOrders.map(po => ({
            ...po,
            // --- START FIX: Correct field name ---
            totalCost: po.totalCost?.toString(),
            // --- END FIX ---
            items: po.items.map(item => ({
                ...item,
                orderedQuantity: item.orderedQuantity.toString(),
                receivedQuantity: item.receivedQuantity?.toString(),
                unitCost: item.unitCost.toString(),
                // --- START FIX: Correct field name ---
                totalItemCost: item.totalItemCost.toString(),
                // --- END FIX ---
            }))
        }));

        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedPOs });
    } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/purchase-orders
 * Creates a new purchase order and its items.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['FINANCIAL', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }
    const userId = session.user.id;

    try {
        const body: PurchaseOrderCreateInput = await req.json();
        const { supplierId, orderDate, expectedDeliveryDate, invoiceNumber, notes, items } = body;

        // --- START FIX: Validate required supplierId ---
        if (!supplierId) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Supplier ID is required" }, { status: 400 });
        }
        // --- END FIX ---

        if (!items || items.length === 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Purchase order must have at least one item" }, { status: 400 });
        }

        let totalOrderAmount = new Decimal(0);
        const itemsData = [];

        for (const item of items) {
            // --- START FIX: Validate orderedUnit ---
            if (!item.ingredientId || item.orderedQuantity === undefined || item.unitCost === undefined || !item.orderedUnit) {
                return NextResponse.json<ApiResponse>({ success: false, error: "Each item requires ingredientId, orderedQuantity, orderedUnit, and unitCost" }, { status: 400 });
            }
            // --- END FIX ---
            let orderedQuantityDecimal: Decimal;
            let unitCostDecimal: Decimal;
            try {
                orderedQuantityDecimal = new Decimal(item.orderedQuantity);
                unitCostDecimal = new Decimal(item.unitCost);
                if (orderedQuantityDecimal.isNegative() || orderedQuantityDecimal.isZero() || unitCostDecimal.isNegative()) {
                    throw new Error("Quantities must be positive, cost must be non-negative.");
                }
            } catch (e: any) {
                 return NextResponse.json<ApiResponse>({ success: false, error: `Invalid number format for item: ${e.message}` }, { status: 400 });
            }
            const totalItemCost = orderedQuantityDecimal.times(unitCostDecimal);
            totalOrderAmount = totalOrderAmount.plus(totalItemCost);
            itemsData.push({
                ingredientId: item.ingredientId,
                orderedQuantity: orderedQuantityDecimal,
                orderedUnit: item.orderedUnit, // --- Added field ---
                unitCost: unitCostDecimal,
                totalItemCost: totalItemCost, // --- Correct field name ---
            });
        }

        const newPurchaseOrder = await prisma.purchaseOrder.create({
            data: {
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                invoiceNumber,
                totalCost: totalOrderAmount, // --- Correct field name ---
                status: POStatus.DRAFT, // --- Correct Enum and value ---
                notes,
                // approvedById: userId, // A PO is created, *then* approved. Don't set this now.
                supplierId: supplierId, // --- Correct relation ---
                items: {
                    createMany: {
                        data: itemsData,
                    }
                }
            },
            include: {
                supplier: { select: { name: true } },
                approvedBy: { select: { name: true } }, // --- Correct relation ---
                items: { include: { ingredient: { select: { name: true, unit: true } } } }
            }
        });

        // Serialize
        const serializedPO = {
            ...newPurchaseOrder,
            totalCost: newPurchaseOrder.totalCost?.toString(), // --- Correct field name ---
            items: newPurchaseOrder.items.map(item => ({
                ...item,
                orderedQuantity: item.orderedQuantity.toString(),
                unitCost: item.unitCost.toString(),
                totalItemCost: item.totalItemCost.toString(), // --- Correct field name ---
            }))
        };


        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedPO }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating purchase order:", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2002' && error.meta?.target === 'PurchaseOrder_invoiceNumber_key') {
                return NextResponse.json<ApiResponse>({ success: false, error: "Invoice number already exists" }, { status: 409 });
             }
              if (error.code === 'P2003' || error.code === 'P2025') { // FK constraint or record not found
                return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Supplier or Ingredient ID provided" }, { status: 400 });
             }
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}