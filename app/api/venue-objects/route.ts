// PATH: app/api/venue-objects/route.ts
// NOTE: This is a NEW FILE in a NEW FOLDER.
// This route manages creating, updating, and deleting VenueObjects.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { VenueObject, VenueObjectType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * POST /api/venue-objects
 * Creates a new venue object on a specific floor plan
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      floorPlanId,
      anchorX,
      anchorY,
      type,
      workstationId,
      // ... add other fields like shape, capacity, etc. as needed
    } = body;

    if (!name || !floorPlanId || !type) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Nome, ID da Planta e Tipo são obrigatórios",
        },
        { status: 400 }
      );
    }

    // Validate VenueObjectType
    if (!Object.values(VenueObjectType).includes(type as VenueObjectType)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tipo de objeto inválido" },
        { status: 400 }
      );
    }

    // If the type is WORKSTATION, it MUST have a workstationId
    if (type === VenueObjectType.WORKSTATION && !workstationId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            "Objetos do tipo WORKSTATION devem estar ligados a uma Estação de Trabalho.",
        },
        { status: 400 }
      );
    }

    // If type is WORKSTATION, check for uniqueness.
    // Only one VenueObject can be linked to a specific Workstation.
    if (type === VenueObjectType.WORKSTATION) {
      const existing = await prisma.venueObject.findFirst({
        where: { workstationId: workstationId },
      });
      if (existing) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error:
              "Esta Estação de Trabalho já está alocada a outro objeto no mapa.",
          },
          { status: 409 } // Conflict
        );
      }
    }

    const newVenueObject = await prisma.venueObject.create({
      data: {
        name,
        floorPlanId,
        type: type as VenueObjectType,
        anchorX: anchorX || 0,
        anchorY: anchorY || 0,
        workstationId: workstationId || null,
        // Set default shape (a simple 10x10 square)
        shape: body.shape || { type: "rect", width: 10, height: 10 }, 
        // Set other fields from body or defaults
        capacity: body.capacity || null,
        isReservable: body.isReservable || false,
        reservationCost: body.reservationCost
          ? new Decimal(body.reservationCost)
          : null,
      },
    });

    const serializedObject = {
      ...newVenueObject,
      reservationCost: newVenueObject.reservationCost
        ? newVenueObject.reservationCost.toString()
        : null,
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedObject },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating venue object:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/venue-objects
 * Updates an existing venue object (e.g., its position or details)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...dataToUpdate } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID do objeto é obrigatório" },
        { status: 400 }
      );
    }

    // Handle potential Decimal conversion for cost
    if (dataToUpdate.reservationCost) {
      dataToUpdate.reservationCost = new Decimal(dataToUpdate.reservationCost);
    }
    
    // Ensure workstationId is set to null if not provided and type isn't WORKSTATION
    if (dataToUpdate.type !== VenueObjectType.WORKSTATION) {
        dataToUpdate.workstationId = null;
    }

    const updatedVenueObject = await prisma.venueObject.update({
      where: { id: id },
      data: dataToUpdate,
    });

    const serializedObject = {
      ...updatedVenueObject,
      reservationCost: updatedVenueObject.reservationCost
        ? updatedVenueObject.reservationCost.toString()
        : null,
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedObject },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating venue object:", error);
    if (error.code === "P2025") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Objeto não encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venue-objects
 * Deletes a venue object
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID do objeto é obrigatório" },
        { status: 400 }
      );
    }

    await prisma.venueObject.delete({
      where: { id: id },
    });

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: { id } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting venue object:", error);
    if (error.code === "P2025") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Objeto não encontrado" },
        { status: 404 }
      );
    }
     if (error.code === "P2003") { // Foreign key constraint
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Não é possível excluir. Objeto está em uso (ex: em uma Visita ou Chamada)." },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}