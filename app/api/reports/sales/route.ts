// PATH: app/api/reports/sales/route.ts
// NOTE: This is a NEW FILE in a NEW FOLDER.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";

// Define the response structure for the report
export type SalesReportResponse = {
  startDate: string;
  endDate: string;
  totalRevenue: string;
  totalOrders: number;
  totalItemsSold: number;
  topSellingProducts: {
    productId: string;
    name: string;
    quantity: number;
    revenue: string;
  }[];
};

/**
 * GET /api/reports/sales
 * Fetches aggregated sales data for a given date range
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

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
    // Set endDate to the end of the day
    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);

    // 1. Fetch all completed orders within the date range
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        // We only count delivered or ready orders
        status: {
          in: ["DELIVERED", "READY"],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // 2. Aggregate data
    let totalRevenue = new Decimal(0);
    let totalItemsSold = 0;
    const productMap = new Map<
      string,
      { name: string; quantity: number; revenue: Decimal }
    >();

    for (const order of orders) {
      totalRevenue = totalRevenue.plus(order.total);
      for (const item of order.items) {
        totalItemsSold += item.quantity;

        const product = productMap.get(item.productId) || {
          name: item.product.name,
          quantity: 0,
          revenue: new Decimal(0),
        };

        product.quantity += item.quantity;
        product.revenue = product.revenue.plus(item.totalPrice);
        productMap.set(item.productId, product);
      }
    }

    // 3. Get top 10 selling products
    const topSellingProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        quantity: data.quantity,
        revenue: data.revenue.toString(), // Serialize
      }))
      .sort((a, b) => b.quantity - a.quantity) // Sort by quantity
      .slice(0, 10);

    // 4. Assemble the response
    const report: SalesReportResponse = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalRevenue: totalRevenue.toString(), // Serialize
      totalOrders: orders.length,
      totalItemsSold: totalItemsSold,
      topSellingProducts: topSellingProducts,
    };

    return NextResponse.json<ApiResponse<SalesReportResponse>>(
      { success: true, data: report },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating sales report:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}