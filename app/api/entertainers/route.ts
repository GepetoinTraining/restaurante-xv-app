// PATH: app/api/entertainers/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Entertainer, EntertainerType } from "@prisma/client"; // Import enum
import { Decimal } from "@prisma/client/runtime/library";

/**
 * GET /api/entertainers
 * Fetches all entertainers
 */
export async function GET(req: NextRequest) {
  try {
    const entertainers = await prisma.entertainer.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // Serialize Decimal fields
    const serializedEntertainers = entertainers.map((e) => ({
      ...e,
      rate: e.rate ? e.rate.toString() : null,
    }));

    return NextResponse.json<ApiResponse<any[]>>(
      { success: true, data: serializedEntertainers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching entertainers:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/entertainers
 * Creates a new entertainer
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, bio, imageUrl, rate } = body;

    if (!name || !type) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nome e Tipo são obrigatórios" },
        { status: 400 }
      );
    }

    // Validate EntertainerType
    if (!Object.values(EntertainerType).includes(type as EntertainerType)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tipo de entertainer inválido" },
        { status: 400 }
      );
    }

    let rateDecimal: Decimal | null = null;
    if (rate) {
      try {
        rateDecimal = new Decimal(rate);
      } catch (e) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Formato de cachê inválido" },
          { status: 400 }
        );
      }
    }

    const newEntertainer = await prisma.entertainer.create({
      data: {
        name,
        type: type as EntertainerType,
        bio: bio || null,
        imageUrl: imageUrl || null,
        rate: rateDecimal,
      },
    });

    const serializedEntertainer = {
      ...newEntertainer,
      rate: newEntertainer.rate ? newEntertainer.rate.toString() : null,
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedEntertainer },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating entertainer:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}