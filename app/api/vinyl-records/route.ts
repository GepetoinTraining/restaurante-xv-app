// PATH: app/api/vinyl-records/route.ts
// Refactored API route

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { VinylRecord } from "@prisma/client";

/**
 * GET /api/vinyl-records
 * Fetches all vinyl records, including their slot information
 */
export async function GET(req: NextRequest) {
  try {
    const records = await prisma.vinylRecord.findMany({
      include: {
        slot: true, // Include the related slot
      },
      orderBy: {
        artist: "asc",
      },
    });

    return NextResponse.json<ApiResponse<VinylRecord[]>>(
      { success: true, data: records },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching vinyl records:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vinyl-records
 * Creates a new vinyl record
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, artist, genre, year, imageUrl, slotId, positionInSlot } =
      body;

    if (!title || !artist || !slotId || positionInSlot === undefined) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Título, Artista, Slot e Posição são obrigatórios",
        },
        { status: 400 }
      );
    }

    const newRecord = await prisma.vinylRecord.create({
      data: {
        title,
        artist,
        genre: genre || null,
        year: year ? parseInt(year, 10) : null,
        imageUrl: imageUrl || null,
        slotId: slotId,
        positionInSlot: parseInt(positionInSlot, 10),
      },
    });

    return NextResponse.json<ApiResponse<VinylRecord>>(
      { success: true, data: newRecord },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating vinyl record:", error);
    if (error.code === "P2002") {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Já existe um disco nesta posição/slot.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vinyl-records
 * Deletes a vinyl record
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    await prisma.vinylRecord.delete({
      where: { id: id },
    });

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: { id } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting vinyl record:", error);
    if (error.code === "P2003") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Este disco já foi tocado e não pode ser excluído." },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}