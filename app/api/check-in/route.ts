// PATH: app/api/check-in/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Client, Tab, Visit } from "@prisma/client";

// This type will be the successful response
type CheckInResponse = {
  client: Client;
  visit: Visit;
  tab: Tab;
};

/**
 * POST /api/check-in
 * Handles client check-in:
 * 1. Finds or creates a Client by phone.
 * 2. Finds an available Tab (RFID).
 * 3. Creates a Visit, linking Client and Tab.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, phone, rfid } = await req.json();

    if (!phone || !rfid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Telefone e RFID são obrigatórios" },
        { status: 400 }
      );
    }

    // --- 1. Find or create the Client ---
    let client = await prisma.client.findUnique({
      where: { phone: phone },
    });

    if (!client) {
      if (!name) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Nome é obrigatório para novos clientes",
          },
          { status: 400 }
        );
      }
      client = await prisma.client.create({
        data: {
          name,
          phone,
        },
      });
    }

    // --- 2. Find and validate the Tab (RFID) ---
    const tab = await prisma.tab.findUnique({
      where: { rfid: rfid },
    });

    if (!tab) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tab (RFID) não encontrado" },
        { status: 404 }
      );
    }

    if (!tab.isActive) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Este Tab está desativado" },
        { status: 403 }
      );
    }

    if (tab.isInUse) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Este Tab já está em uso" },
        { status: 409 } // 409 Conflict
      );
    }

    // --- 3. Create the Visit and update the Tab ---
    // Use a transaction to ensure both operations succeed or fail together
    const [visit, updatedTab] = await prisma.$transaction([
      // Create the Visit
      prisma.visit.create({
        data: {
          clientId: client.id,
          tabId: tab.id,
          // Note: venueObjectId is not set on check-in
        },
      }),
      // Update the Tab to mark it as in use
      prisma.tab.update({
        where: { id: tab.id },
        data: { isInUse: true },
      }),
    ]);

    const responseData: CheckInResponse = {
      client,
      visit,
      tab: updatedTab,
    };

    return NextResponse.json<ApiResponse<CheckInResponse>>(
      { success: true, data: responseData },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Check-in error:", error);
    if (error.code === "P2002" && error.meta?.target.includes("phone")) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Este telefone já está cadastrado" },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}