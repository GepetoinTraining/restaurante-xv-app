// PATH: app/api/server-calls/route.ts
// NOTE: We are ADDING a PATCH method to this existing file.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { ServerCallStatus, ServerCall } from "@prisma/client";
import { getSession } from "@/lib/auth"; // To get the logged-in user

/**
 * POST /api/server-calls
 * Creates a new server call from a client at a specific location.
 * (This function should already exist from Chunk 4)
 */
export async function POST(req: NextRequest) {
  try {
    const { qrCodeId } = await req.json();

    if (!qrCodeId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "QR Code ID é obrigatório" },
        { status: 400 }
      );
    }

    // --- 1. Find the VenueObject by its QR Code ID ---
    const venueObject = await prisma.venueObject.findUnique({
      where: { qrCodeId: qrCodeId },
    });

    if (!venueObject) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Localização (QR Code) inválida" },
        { status: 404 }
      );
    }

    // --- 2. Find the *active* Visit at that VenueObject ---
    const activeVisit = await prisma.visit.findFirst({
      where: {
        venueObjectId: venueObject.id,
        checkOutAt: null,
      },
    });

    if (!activeVisit) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            "Nenhuma visita ativa encontrada para esta localização. Faça o check-in no QR Code.",
        },
        { status: 404 }
      );
    }

    // --- 3. Check for existing PENDING calls for this visit ---
    const existingCall = await prisma.serverCall.findFirst({
      where: {
        visitId: activeVisit.id,
        status: ServerCallStatus.PENDING,
      },
    });

    if (existingCall) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Você já possui uma chamada pendente. Aguarde.",
        },
        { status: 409 } // Conflict
      );
    }

    // --- 4. Create the new ServerCall ---
    const newServerCall = await prisma.serverCall.create({
      data: {
        visitId: activeVisit.id,
        venueObjectId: venueObject.id,
        status: ServerCallStatus.PENDING,
      },
    });

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: newServerCall },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Server call error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/server-calls
 * Updates the status of an existing server call (Acknowledge or Resolve)
 * (This is the new function for the Live Dashboard)
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  if (!user?.isLoggedIn) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID e Status são obrigatórios" },
        { status: 400 }
      );
    }

    let dataToUpdate: any = {
      status: status,
    };

    // If acknowledging, log who did it and when
    if (status === ServerCallStatus.ACKNOWLEDGED) {
      dataToUpdate.acknowledgedByUserId = user.id;
      dataToUpdate.acknowledgedAt = new Date();
    }
    // If resolving, log who did it and when
    else if (status === ServerCallStatus.RESOLVED) {
      dataToUpdate.resolvedByUserId = user.id;
      dataToUpdate.resolvedAt = new Date();
    }

    const updatedCall = await prisma.serverCall.update({
      where: { id: id },
      data: dataToUpdate,
    });

    return NextResponse.json<ApiResponse<ServerCall>>(
      { success: true, data: updatedCall },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update call error:", error);
    if (error.code === "P2025") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Chamada não encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}