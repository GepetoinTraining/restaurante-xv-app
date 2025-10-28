// PATH: app/api/floorplans/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/utils";

type Params = {
  params: {
    id: string;
  };
};

// GET /api/floorplans/[id]
// Fetches a single floor plan with its venue objects
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da planta é obrigatório" },
        { status: 400 }
      );
    }

    const floorPlan = await prisma.floorPlan.findUnique({
      where: { id },
      include: {
        objects: {
          include: {
            workstation: true, // Include workstation data if linked
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!floorPlan) {
      return NextResponse.json(
        { success: false, error: "Planta não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: floorPlan });
  } catch (error) {
    return handleApiError(error);
  }
}