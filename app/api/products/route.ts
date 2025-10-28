// PATH: app/api/products/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Product, ProductType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library"; // Import Decimal

/**
 * GET /api/products
 * Fetches all products including their preparation station (Workstation)
 */
export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      include: {
        prepStation: true, // Include the related Workstation
      },
      orderBy: {
        name: "asc",
      },
    });

    // Manually serialize Decimal fields to strings for JSON response
    const serializedProducts = products.map((product) => ({
      ...product,
      price: product.price.toString(),
    }));

    return NextResponse.json<ApiResponse<any[]>>(
      { success: true, data: serializedProducts },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Creates a new product
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price, imageUrl, type, prepStationId } = body;

    if (!name || !price || !type || !prepStationId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            "Nome, Preço, Tipo e Estação de Preparo são obrigatórios",
        },
        { status: 400 }
      );
    }

    // Validate ProductType
    if (!Object.values(ProductType).includes(type as ProductType)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tipo de produto inválido" },
        { status: 400 }
      );
    }

    // Ensure price is a valid Decimal
    let priceDecimal: Decimal;
    try {
      priceDecimal = new Decimal(price);
    } catch (e) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Formato de preço inválido" },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: priceDecimal,
        imageUrl: imageUrl || null,
        type: type as ProductType,
        prepStationId: prepStationId, // Link to the workstation
      },
    });

    // Manually serialize Decimal fields for the response
    const serializedProduct = {
      ...newProduct,
      price: newProduct.price.toString(),
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedProduct },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}