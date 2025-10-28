// PATH: app/api/reports/costs/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { PrepTaskStatus, TransactionType } from "@prisma/client"; // Added TransactionType

// Define the response structure for the cost report
export type CostReportResponse = {
  startDate: string;
  endDate: string;
  totalPrepCost: string; 
  totalWasteCost: string; 
  totalBuffetRevenue: string; 
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
            outputIngredient: true, // Need outputQuantity
          },
        },
      },
    });

    let totalPrepCost = new Decimal(0);
    for (const task of completedPrepTasks) {
      const quantityProduced = task.quantityRun ?? task.targetQuantity;
      if (!task.prepRecipe || !task.prepRecipe.outputQuantity || quantityProduced.isZero() || task.prepRecipe.outputQuantity.isZero()) {
          console.warn(`Skipping prep task ${task.id}: Missing recipe data or zero output/quantity.`);
          continue; 
      }

      const runs = quantityProduced.dividedBy(task.prepRecipe.outputQuantity); 

      for (const input of task.prepRecipe.inputs) {
        if (!input.ingredient) {
             console.warn(`Skipping prep task ${task.id} input ${input.ingredientId}: Missing ingredient data.`);
             continue;
        }
        const inputCost = input.ingredient.costPerUnit
                           .times(input.quantity)
                           .times(runs);          
        totalPrepCost = totalPrepCost.plus(inputCost);
      }
    }

    // --- 2. Calculate Total Waste Cost ---
    const wasteRecords = await prisma.wasteRecord.findMany({
      where: {
        createdAt: { 
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        // ---- START FIX ----
        // The field in your schema.prisma is 'costValue'
        costValue: true, 
        // ---- END FIX ----
      },
    });

    const totalWasteCost = wasteRecords.reduce(
      // ---- START FIX ----
      (sum, record) => sum.plus(record.costValue),
      // ---- END FIX ----
      new Decimal(0)
    );

    // --- 3. Calculate Total Buffet Revenue (from Client Plates) ---
    const clientPlates = await prisma.clientPlate.findMany({
        where: {
            createdAt: { 
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
      totalPrepCost: totalPrepCost.toFixed(2), 
      totalWasteCost: totalWasteCost.toFixed(2),
      totalBuffetRevenue: totalBuffetRevenue.toFixed(2),
    };

    return NextResponse.json<ApiResponse<CostReportResponse>>(
      { success: true, data: report },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error creating cost report:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: `Erro interno do servidor ao gerar relatório de custos: ${error.message}` },
      { status: 500 }
    );
  }
}