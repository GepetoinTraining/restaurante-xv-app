// PATH: app/api/venue-objects/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/utils";
import { VenueObjectType } from "@prisma/client";

type Params = {
  params: {
    id: string;
  };
};

// Zod schema for updating
// Allows partial updates
const venueObjectUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  type: z.nativeEnum(VenueObjectType).optional(),
  anchorX: z.number().optional(),
  anchorY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  workstationId: z.string().cuid().optional().nullable(),
});


// PATCH /api/venue-objects/[id]
// Updates a venue object's properties
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = params;
    const json = await request.json();
    const data = venueObjectUpdateSchema.parse(json);

    const updatedObject = await prisma.venueObject.update({
      where: { id },
      data: data, // Zod schema matches the partial data structure
    });

    return NextResponse.json({ success: true, data: updatedObject });
  } catch (error) {
    // --- START FIX: Add error message string ---
    return handleApiError(error, "Failed to update venue object");
    // --- END FIX ---
  }
}

// DELETE /api/venue-objects/[id]
// Deletes a venue object
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = params;

    await prisma.venueObject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Object deleted" });
  } catch (error) {
    // --- START FIX: Add error message string ---
    return handleApiError(error, "Failed to delete venue object");
    // --- END FIX ---
  }
}