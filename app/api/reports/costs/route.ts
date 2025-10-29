// PATH: app/api/reports/costs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
// Import the FinancialReport type
import { FinancialReport } from "@/lib/types";

// Export the type alias so the page can import it
export type CostReportResponse = FinancialReport;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "OWNER" && session?.user?.role !== "MANAGER") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { success: false, error: "Missing date range parameters" },
      { status: 400 }
    );
  }

  try {
    const startDate = new Date(from);
    const endDate = new Date(to);

    // --- FIX: Check for invalid dates ---
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Use ISO string." },
        { status: 400 }
      );
    }
    // --- END FIX ---

    // 1. Calculate Purchase Costs
    const purchaseCosts = await prisma.purchaseOrderItem.aggregate({
      _sum: {
        totalItemCost: true,
      },
      where: {
        purchaseOrder: {
          status: {
            in: ["RECEIVED", "PARTIALLY_RECEIVED"],
          },
          actualDeliveryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    });

    // 2. Calculate Waste Costs (from Client Returns / PanShipment)
    const clientReturnWaste = await prisma.wasteRecord.aggregate({
      _sum: {
        costValue: true,
      },
      where: {
        reason: "CLIENT_RETURN",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 3. Calculate Internal Waste Costs
    const internalWaste = await prisma.wasteRecord.aggregate({
      _sum: {
        costValue: true,
      },
      where: {
        reason: {
          not: "CLIENT_RETURN",
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const purchaseCostsNum =
      purchaseCosts._sum.totalItemCost?.toNumber() || 0;
    const clientReturnWasteNum =
      clientReturnWaste._sum.costValue?.toNumber() || 0;
    const internalWasteNum = internalWaste._sum.costValue?.toNumber() || 0;

    const totalCosts =
      purchaseCostsNum + clientReturnWasteNum + internalWasteNum;

    const report: CostReportResponse = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalCosts: totalCosts,
        totalPurchaseCosts: purchaseCostsNum,
        totalWasteCosts: clientReturnWasteNum + internalWasteNum,
      },
      breakdown: {
        purchaseCosts: purchaseCostsNum,
        clientReturnWaste: clientReturnWasteNum,
        internalWaste: internalWasteNum,
      },
    };

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}