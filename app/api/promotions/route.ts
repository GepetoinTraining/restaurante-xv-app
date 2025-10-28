// File: app/api/promotions/route.ts
/* // --- COMMENT OUT START ---
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// PromotionBulletin does not exist in the current schema
// import { PromotionBulletin } from "@prisma/client";

/**
 * GET /api/promotions
 * Fetches all promotions.
 *
 * THIS ROUTE IS DEPRECATED/DISABLED FOR ACAIA MVP
 * /
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user?.isLoggedIn) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    // This will cause an error as PromotionBulletin does not exist
    // const promotions = await prisma.promotionBulletin.findMany({
    //   include: {
    //     product: true, // Include the linked product
    //   },
    //   orderBy: { expiresAt: "desc" },
    // });
    // return NextResponse.json<ApiResponse<PromotionBulletin[]>>(
    //   { success: true, data: promotions as any }, // Cast as any to include relations
    //   { status: 200 }
    // );
     return NextResponse.json<ApiResponse>(
       { success: false, error: "Funcionalidade de promoções desativada." },
       { status: 404 }
     );
  } catch (error) {
    console.error("GET /api/promotions error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro ao buscar promoções (Rota desativada)" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promotions
 * Creates a new promotion.
 *
 * THIS ROUTE IS DEPRECATED/DISABLED FOR ACAIA MVP
 * /
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user?.isLoggedIn) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }
  // TODO: Add role check

  try {
    const body = await req.json();
    const { title, body: textBody, bonusOffer, productId, expiresAt } = body;

    if (!title || !textBody || !expiresAt) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // This will cause an error as PromotionBulletin does not exist
    // const newPromotion = await prisma.promotionBulletin.create({
    //   data: {
    //     title,
    //     body: textBody,
    //     bonusOffer,
    //     expiresAt: new Date(expiresAt),
    //     productId: productId ? parseInt(productId) : null,
    //   },
    // });
    // return NextResponse.json<ApiResponse<PromotionBulletin>>(
    //   { success: true, data: newPromotion },
    //   { status: 201 }
    // );
     return NextResponse.json<ApiResponse>(
       { success: false, error: "Funcionalidade de promoções desativada." },
       { status: 404 }
     );
  } catch (error: any) {
    console.error("POST /api/promotions error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro ao criar promoção (Rota desativada)" },
      { status: 500 }
    );
  }
}
*/ // --- COMMENT OUT END ---

// Add a placeholder export to prevent build errors about empty modules
export {};