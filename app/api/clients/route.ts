// PATH: app/api/clients/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "@prisma/client";

/**
 * GET /api/clients
 * Fetches all clients, including their wallet balance
 */
export async function GET(req: NextRequest) {
  try {
    const clients = await prisma.client.findMany({
      include: {
        wallet: {
          select: {
            balance: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize wallet balance
    const serializedClients = clients.map((client) => ({
      ...client,
      wallet: client.wallet
        ? {
            balance: client.wallet.balance.toString(),
          }
        : null,
    }));

    return NextResponse.json<ApiResponse<any[]>>(
      { success: true, data: serializedClients },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * Creates a new client (unchanged from old logic, but uses new schema)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, cpf } = body;

    if (!name || !phone) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nome e Telefone são obrigatórios" },
        { status: 400 }
      );
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        phone,
        email: email || null,
        cpf: cpf || null,
      },
    });

    return NextResponse.json<ApiResponse<Client>>(
      { success: true, data: newClient },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating client:", error);
    if (error.code === "P2002") {
      let field = "desconhecido";
      if (error.meta?.target.includes("phone")) field = "telefone";
      if (error.meta?.target.includes("email")) field = "email";
      if (error.meta?.target.includes("cpf")) field = "CPF";
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Este ${field} já está em uso` },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}