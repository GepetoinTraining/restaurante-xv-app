// PATH: app/api/visits/associate/route.ts
// NOTE: This is a NEW FILE.
// Used by the client menu page to link their active visit to a specific venue object.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Visit, VenueObject } from "@prisma/client";

/**
 * PATCH /api/visits/associate
 * Finds the active visit associated with a given Tab (RFID)
 * and updates its venueObjectId based on a scanned QR Code ID.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { tabId, qrCodeId } = await req.json();

    if (!tabId || !qrCodeId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tab ID and QR Code ID são obrigatórios" },
        { status: 400 }
      );
    }

    // 1. Find the VenueObject by QR Code
    const venueObject = await prisma.venueObject.findUnique({
      where: { qrCodeId },
    });

    if (!venueObject) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Localização (QR Code) inválida" },
        { status: 404 }
      );
    }

    // 2. Find the active Visit associated with the Tab ID
    // An active visit is linked to the tab and has no checkOutAt time.
    const activeVisit = await prisma.visit.findFirst({
      where: {
        tab: {
          rfid: tabId, // Assuming tabId from client is the RFID string
          isInUse: true, // Ensure the tab is actually marked as in use
        },
        checkOutAt: null,
      },
      select: {
        id: true, // Select only the ID for updating
      },
    });

    if (!activeVisit) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            "Nenhuma visita ativa encontrada para este Tab. Realize o check-in.",
        },
        { status: 404 }
      );
    }

    // 3. Update the Visit with the VenueObject ID
    const updatedVisit = await prisma.visit.update({
      where: { id: activeVisit.id },
      data: {
        venueObjectId: venueObject.id,
      },
    });

    // Serialize Decimal before returning (if needed, though only returning ID here)
    const serializedVisit = {
        ...updatedVisit,
        totalSpent: updatedVisit.totalSpent.toString(),
    };


    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedVisit }, // Return updated visit
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error associating visit:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}