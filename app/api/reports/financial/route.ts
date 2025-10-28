// PATH: app/api/reports/financial/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toUTC } from '@/lib/utils'; // Assuming this utility exists
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET /api/reports/financial
 *
 * Generates a financial report for a given date range.
 * Query Params:
 * - ?startDate=YYYY-MM-DD
 * - ?endDate=YYYY-MM-DD
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Default to the last 30 days if no dates are provided
    const defaultEndDate = toUTC(new Date());
    const defaultStartDate = toUTC(
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000),
    );

    const startDate = searchParams.get('startDate')
      ? toUTC(new Date(searchParams.get('startDate')!))
      : defaultStartDate;
    const endDate = searchParams.get('endDate')
      ? toUTC(new Date(searchParams.get('endDate')!))
      : defaultEndDate;

    // Ensure endDate includes the entire day
    endDate.setUTCHours(23, 59, 59, 999);

    // 1. Calculate Total Purchase Costs
    const purchaseCostData = await prisma.purchaseOrderItem.aggregate({
      _sum: {
        totalItemCost: true,
      },
      where: {
        purchaseOrder: {
          status: 'RECEIVED',
          actualDeliveryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    });

    const totalPurchaseCosts = purchaseCostData._sum.totalItemCost || new Decimal(0);

    // 2. Calculate Client-Return Waste Costs
    const clientWasteData = await prisma.wasteRecord.aggregate({
      _sum: {
        costValue: true,
      },
      where: {
        reason: 'CLIENT_RETURN',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalClientReturnWasteCosts =
      clientWasteData._sum.costValue || new Decimal(0);

    // 3. Calculate Internal Waste Costs (Spoilage, Prep Errors, etc.)
    const internalWasteData = await prisma.wasteRecord.aggregate({
      _sum: {
        costValue: true,
      },
      where: {
        reason: {
          not: 'CLIENT_RETURN',
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalInternalWasteCosts =
      internalWasteData._sum.costValue || new Decimal(0);

    // 4. Calculate Total Waste
    const totalWasteCosts = totalClientReturnWasteCosts.plus(
      totalInternalWasteCosts,
    );

    // 5. Calculate Total Overall Costs
    const totalCosts = totalPurchaseCosts.plus(totalWasteCosts);

    // Prepare the final report object
    const report = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalCosts: totalCosts.toNumber(),
        totalPurchaseCosts: totalPurchaseCosts.toNumber(),
        totalWasteCosts: totalWasteCosts.toNumber(),
      },
      breakdown: {
        purchaseCosts: totalPurchaseCosts.toNumber(),
        clientReturnWaste: totalClientReturnWasteCosts.toNumber(),
        internalWaste: totalInternalWasteCosts.toNumber(),
      },
      // We can add more detailed breakdowns here in V2
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Failed to generate financial report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}