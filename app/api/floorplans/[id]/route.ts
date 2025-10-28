// PATH: app/api/floorplans/[id]/route.ts
// NOTE: This is a NEW FILE in a NEW FOLDER.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/floorplans/[id]
 * Fetches a single floor plan AND all its related venue objects
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const floorPlan = await prisma.floorPlan.findUnique({
      where: { id },
      include: {
        objects: {
          // Include all VenueObjects linked to this plan
          include: {
            workstation: true, // Also include the workstation, if it is one
          },
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    if (!floorPlan) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Planta não encontrada" },
        { status: 404 }
      );
    }

    // Serialize Decimal fields on objects
    const serializedObjects = floorPlan.objects.map((obj) => ({
      ...obj,
      reservationCost: obj.reservationCost
        ? obj.reservationCost.toString()
        : null,
    }));

    const serializedFloorPlan = {
      ...floorPlan,
      objects: serializedObjects,
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedFloorPlan },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching floor plan:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}