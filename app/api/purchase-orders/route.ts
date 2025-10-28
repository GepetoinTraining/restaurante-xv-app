// PATH: app/api/purchase-orders/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, StockHolding, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for creating a PO with items
type PurchaseOrderCreateInput = {
    supplierId?: string;
    orderDate?: string; // ISO string
    expectedDeliveryDate?: string; // ISO string
    invoiceNumber?: string;
    notes?: string;
    items: {
        ingredientId: string;
        orderedQuantity: string | number;
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
                createdBy: { select: { name: true } },
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
            totalAmount: po.totalAmount?.toString(),
            items: po.items.map(item => ({
                ...item,
                orderedQuantity: item.orderedQuantity.toString(),
                receivedQuantity: item.receivedQuantity?.toString(),
                unitCost: item.unitCost.toString(),
                totalCost: item.totalCost.toString(),
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
 * Does NOT create stock holdings yet (that happens on receive).
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

        if (!items || items.length === 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Purchase order must have at least one item" }, { status: 400 });
        }

        let totalOrderAmount = new Decimal(0);
        const itemsData = [];

        for (const item of items) {
            if (!item.ingredientId || item.orderedQuantity === undefined || item.unitCost === undefined) {
                return NextResponse.json<ApiResponse>({ success: false, error: "Each item requires ingredientId, orderedQuantity, and unitCost" }, { status: 400 });
            }
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
                unitCost: unitCostDecimal,
                totalCost: totalItemCost,
            });
        }

        const newPurchaseOrder = await prisma.purchaseOrder.create({
            data: {
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                invoiceNumber,
                totalAmount: totalOrderAmount,
                status: PurchaseOrderStatus.PENDING, // Or ORDERED if appropriate
                notes,
                createdById: userId,
                supplierId: supplierId || null,
                items: {
                    createMany: {
                        data: itemsData,
                    }
                }
            },
            include: {
                supplier: { select: { name: true } },
                createdBy: { select: { name: true } },
                items: { include: { ingredient: { select: { name: true, unit: true } } } }
            }
        });

        // Serialize
        const serializedPO = {
            ...newPurchaseOrder,
            totalAmount: newPurchaseOrder.totalAmount?.toString(),
            items: newPurchaseOrder.items.map(item => ({
                ...item,
                orderedQuantity: item.orderedQuantity.toString(),
                unitCost: item.unitCost.toString(),
                totalCost: item.totalCost.toString(),
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
