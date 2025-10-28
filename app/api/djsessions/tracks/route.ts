// PATH: app/api/djsessions/tracks/route.ts
// NOTE: This is a NEW FILE.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/djsessions/tracks
 * Adds a vinyl record to a live session
 */
export async function POST(req: NextRequest) {
  // Auth check...

  try {
    const { sessionId, vinylRecordId } = await req.json();

    if (!sessionId || !vinylRecordId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID da Sessão e ID do Vinil são obrigatórios" },
        { status: 400 }
      );
    }

    const newTrack = await prisma.dJSetTrack.create({
      data: {
        sessionId: sessionId,
        vinylRecordId: vinylRecordId,
        playedAt: new Date(),
      },
      include: {
        vinylRecord: true // Return the new track with vinyl info
      }
    });

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: newTrack },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding track:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}