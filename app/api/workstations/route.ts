// PATH: app/api/workstations/route.ts
// NOTE: This is a NEW FILE.
// It is required for the "Create Product" modal to fetch available prep stations.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Workstation } from "@prisma/client";

/**
 * GET /api/workstations
 * Fetches all workstations
 */
export async function GET(req: NextRequest) {
  try {
    const workstations = await prisma.workstation.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json<ApiResponse<Workstation[]>>(
      { success: true, data: workstations },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching workstations:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}