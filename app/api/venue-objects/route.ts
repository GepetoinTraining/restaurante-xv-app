// PATH: app/api/venue-objects/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/utils";
import { VenueObjectType } from "@prisma/client";

// Zod schema for validation
const venueObjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(VenueObjectType),
  floorPlanId: z.string().cuid("Invalid FloorPlan ID"),
  anchorX: z.number(),
  anchorY: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  workstationId: z.string().cuid().optional().nullable(),
});

// GET /api/venue-objects
// Fetches all venue objects (e.g., for dropdowns)
export async function GET() {
  try {
    const venueObjects = await prisma.venueObject.findMany({
      orderBy: { name: "asc" },
      include: {
        workstation: true,
      }
    });
    return NextResponse.json({ success: true, data: venueObjects });
  } catch (error) {
    // --- START FIX: Add error message string ---
    return handleApiError(error, "Failed to fetch venue objects");
    // --- END FIX ---
  }
}

// POST /api/venue-objects
// Creates a new venue object on a floor plan
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = venueObjectSchema.parse(json);

    const newVenueObject = await prisma.venueObject.create({
      data: {
        name: data.name,
        type: data.type,
        floorPlanId: data.floorPlanId,
        anchorX: data.anchorX,
        anchorY: data.anchorY,
        width: data.width,
        height: data.height,
        rotation: data.rotation,
        workstationId: data.workstationId,
      },
    });

    return NextResponse.json({ success: true, data: newVenueObject }, { status: 201 });
  } catch (error) {
    // --- START FIX: Add error message string ---
    return handleApiError(error, "Failed to create venue object");
    // --- END FIX ---
  }
}