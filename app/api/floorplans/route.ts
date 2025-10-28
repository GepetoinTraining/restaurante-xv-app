// PATH: app/api/floorplans/route.ts
// NOTE: This is a NEW FILE in a NEW FOLDER.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { FloorPlan } from "@prisma/client";

/**
 * GET /api/floorplans
 * Fetches all floor plans (without their objects, for speed)
 */
export async function GET(req: NextRequest) {
  try {
    const floorPlans = await prisma.floorPlan.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json<ApiResponse<FloorPlan[]>>(
      { success: true, data: floorPlans },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching floor plans:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/floorplans
 * Creates a new floor plan
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, width, height } = body;

    if (!name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const newFloorPlan = await prisma.floorPlan.create({
      data: {
        name,
        width: width || 100,
        height: height || 100,
      },
    });

    return NextResponse.json<ApiResponse<FloorPlan>>(
      { success: true, data: newFloorPlan },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating floor plan:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}