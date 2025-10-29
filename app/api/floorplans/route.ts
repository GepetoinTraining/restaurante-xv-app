// File: app/api/floorplans/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/utils";

// Zod schema for validation
const floorPlanSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  width: z.number().int().positive("Largura deve ser positiva"),
  height: z.number().int().positive("Altura deve ser positiva"),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
});

// GET /api/floorplans
// Fetches all floor plans
export async function GET() {
  try {
    const floorPlans = await prisma.floorPlan.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: floorPlans });
  } catch (error) {
    return handleApiError(error, "Failed to fetch floor plans");
  }
}

// POST /api/floorplans
// Creates a new floor plan
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = floorPlanSchema.parse(json);

    const newFloorPlan = await prisma.floorPlan.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        width: data.width,
        height: data.height,
      },
    });

    return NextResponse.json({ success: true, data: newFloorPlan }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create floor plan");
  }
}