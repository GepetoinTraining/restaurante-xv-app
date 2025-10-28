// PATH: app/api/reports/costs/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { PrepTaskStatus, TransactionType } from "@prisma/client"; // Added TransactionType

// Define the response structure for the cost report
// (Extendable - add COGS, profit margins etc. later if sales data is integrated)
export type CostReportResponse = {
  startDate: string;
  endDate: string;
  totalPrepCost: string; // Cost of ingredients used in completed prep tasks
  totalWasteCost: string; // Cost of ingredients recorded as waste
  totalBuffetRevenue: string; // Revenue generated from client plates (buffet)
  // --- Potential Additions ---
  // totalIngredientPurchaseCost: string; // Cost from simulated invoices (needs invoice model)
  // totalCOGS: string; // Cost Of Goods Sold (needs sales & recipe costs)
  // netProfitOrLoss: string; // (needs sales data)
};

/**
 * GET /api/reports/costs
 * Fetches aggregated cost data (prep, waste, buffet) for a given date range.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  // Authorization: Only Managers or Owners can view cost reports
  if (
    !user?.isLoggedIn ||
    (user.role !== "MANAGER" && user.role !== "OWNER")
  ) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado: Apenas Gerente ou Dono" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Datas de início e fim são obrigatórias" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999); // Ensure end date includes the whole day

    // --- 1. Calculate Total Preparation Cost ---
    const completedPrepTasks = await prisma.prepTask.findMany({
      where: {
        status: PrepTaskStatus.COMPLETED,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        prepRecipe: {
          include: {
            inputs: {
              include: {
                ingredient: true, // Need ingredient costPerUnit
              },
            },
            // Need output quantity to calculate runs accurately based on quantityRun
            outputIngredient: true,
          },
        },
      },
    });

    let totalPrepCost = new Decimal(0);
    for (const task of completedPrepTasks) {
      // Use actual quantity produced (quantityRun) if available and valid, else fall back to targetQuantity
      const quantityProduced = task.quantityRun ?? task.targetQuantity;
      if (quantityProduced.isZero() || task.prepRecipe.outputQuantity.isZero()) continue; // Skip if no output or zero output

      const runs = quantityProduced.dividedBy(task.prepRecipe.outputQuantity); // Calculate runs based on actual/target output

      for (const input of task.prepRecipe.inputs) {
        // Use the costPerUnit at the time of the input ingredient definition
        // Note: This might not reflect the *actual* cost if FIFO/LIFO isn't tracked perfectly on purchase
        const inputCost = input.ingredient.costPerUnit
                           .times(input.quantity) // Cost per input unit in recipe
                           .times(runs);          // Total cost for this input in this task run
        totalPrepCost = totalPrepCost.plus(inputCost);
      }
    }

    // --- 2. Calculate Total Waste Cost ---
    const wasteRecords = await prisma.wasteRecord.findMany({
      where: {
        createdAt: { // Assuming createdAt reflects when waste happened/was recorded
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        cost: true, // Use the pre-calculated cost stored in the record
      },
    });

    const totalWasteCost = wasteRecords.reduce(
      (sum, record) => sum.plus(record.cost),
      new Decimal(0)
    );

    // --- 3. Calculate Total Buffet Revenue (from Client Plates) ---
    // Note: This is revenue, not cost. The cost calculation would be more complex,
    // requiring estimation of ingredients used per plate.
    const clientPlates = await prisma.clientPlate.findMany({
        where: {
            createdAt: { // Assuming createdAt reflects when plate was weighed
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            calculatedCost: true, // This is the revenue charged to the client
        }
    });

    const totalBuffetRevenue = clientPlates.reduce(
        (sum, plate) => sum.plus(plate.calculatedCost),
        new Decimal(0)
    );

    // --- Assemble the response ---
    const report: CostReportResponse = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalPrepCost: totalPrepCost.toFixed(2), // Format as string with 2 decimal places
      totalWasteCost: totalWasteCost.toFixed(2),
      totalBuffetRevenue: totalBuffetRevenue.toFixed(2),
    };

    return NextResponse.json<ApiResponse<CostReportResponse>>(
      { success: true, data: report },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating cost report:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor ao gerar relatório de custos" },
      { status: 500 }
    );
  }
}