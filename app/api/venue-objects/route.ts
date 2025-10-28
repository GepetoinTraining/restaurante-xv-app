// PATH: app/api/venue-objects/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/utils";
import { VenueObjectType } from "@prisma/client";

// Zod schema for validation
const objectSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.nativeEnum(VenueObjectType),
  floorPlanId: z.string().cuid(),
  anchorX: z.number(),
  anchorY: z.number(),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  rotation: z.number().optional().nullable(),
  workstationId: z.string().cuid().optional().nullable(),
});

// POST /api/venue-objects
// Creates a new venue object on a floor plan
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = objectSchema.parse(json);

    const newObject = await prisma.venueObject.create({
      data: {
        name: data.name,
        type: data.type,
        floorPlanId: data.floorPlanId,
        anchorX: data.anchorX,
        anchorY: data.anchorY,
        width: data.width || 100, // Default width
        height: data.height || 100, // Default height
        rotation: data.rotation || 0,
        workstationId: data.workstationId,
      },
      include: {
        workstation: true,
      },
    });

    return NextResponse.json({ success: true, data: newObject }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}