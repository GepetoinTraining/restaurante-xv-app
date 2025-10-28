// PATH: app/api/vinyl-slots/route.ts
// NOTE: This is a NEW FILE.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { VinylLibrarySlot } from "@prisma/client";

/**
 * GET /api/vinyl-slots
 * Fetches all vinyl library slots
 */
export async function GET(req: NextRequest) {
  try {
    const slots = await prisma.vinylLibrarySlot.findMany({
      orderBy: [{ row: "asc" }, { column: "asc" }],
    });

    return NextResponse.json<ApiResponse<VinylLibrarySlot[]>>(
      { success: true, data: slots },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching vinyl slots:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vinyl-slots
 * Creates a new vinyl library slot
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { row, column, capacity } = body;

    if (row === undefined || column === undefined) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Linha e Coluna são obrigatórias" },
        { status: 400 }
      );
    }

    const newSlot = await prisma.vinylLibrarySlot.create({
      data: {
        row: parseInt(row, 10),
        column: parseInt(column, 10),
        capacity: capacity ? parseInt(capacity, 10) : 30,
      },
    });

    return NextResponse.json<ApiResponse<VinylLibrarySlot>>(
      { success: true, data: newSlot },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating vinyl slot:", error);
    if (error.code === "P2002") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Este slot (Linha/Coluna) já existe" },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}