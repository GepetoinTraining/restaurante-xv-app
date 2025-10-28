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

// Zod schema for updates (all fields optional)
const objectUpdateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  type: z.nativeEnum(VenueObjectType).optional(),
  anchorX: z.number().optional(),
  anchorY: z.number().optional(),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  rotation: z.number().optional().nullable(),
  workstationId: z.string().cuid().optional().nullable(),
});

// PUT /api/venue-objects/[id]
// Updates an existing venue object (for moving, resizing, renaming)
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = params;
    const json = await request.json();
    const data = objectUpdateSchema.parse(json);

    const updatedObject = await prisma.venueObject.update({
      where: { id },
      data,
      include: {
        workstation: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedObject });
  } catch (error) {
    return handleApiError(error);
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
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error);
  }
}