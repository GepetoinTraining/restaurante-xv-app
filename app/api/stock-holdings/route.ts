// PATH: app/api/stock-holdings/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { StockHolding, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

/**
 * POST /api/stock-holdings
 * Creates a new stock holding (batch) for an ingredient at a location.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    // TODO: Define appropriate roles (e.g., MANAGER, OWNER, maybe COOK/BARTENDER for receiving?)
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { ingredientId, venueObjectId, quantity, purchaseDate, expiryDate } = body;

        if (!ingredientId || !venueObjectId || quantity === undefined) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "ID do Ingrediente, ID da Localização e Quantidade são obrigatórios" },
            { status: 400 }
        );
        }

        let quantityDecimal: Decimal;
        try {
            quantityDecimal = new Decimal(quantity);
            if (quantityDecimal.isNegative() || quantityDecimal.isZero()) {
                throw new Error("Quantidade deve ser positiva.");
            }
        } catch (e: any) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: `Formato de quantidade inválido: ${e.message}` },
                { status: 400 }
            );
        }

        // Validate location type? Ensure it's a storage type? Optional.
        // const location = await prisma.venueObject.findUnique({ where: { id: venueObjectId }, select: { type: true }});
        // if (!location || !['STORAGE', 'FREEZER', 'SHELF', 'WORKSTATION_STORAGE'].includes(location.type)) {
        //     return NextResponse.json<ApiResponse>({ success: false, error: "Localização inválida para estoque." }, { status: 400 });
        // }

        const newHolding = await prisma.stockHolding.create({
            data: {
                ingredientId,
                venueObjectId,
                quantity: quantityDecimal,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
            },
        });

        // Serialize Decimal for response
        const serializedHolding = {
            ...newHolding,
            quantity: newHolding.quantity.toString(),
        };

        return NextResponse.json<ApiResponse<any>>(
            { success: true, data: serializedHolding },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Error creating stock holding:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2003') { // Foreign key constraint failed
                 if (error.meta?.field_name === 'StockHolding_ingredientId_fkey (index)') {
                    return NextResponse.json<ApiResponse>({ success: false, error: "Ingrediente não encontrado." }, { status: 404 });
                 }
                 if (error.meta?.field_name === 'StockHolding_venueObjectId_fkey (index)') {
                     return NextResponse.json<ApiResponse>({ success: false, error: "Localização (VenueObject) não encontrada." }, { status: 404 });
                 }
             }
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao criar lote de estoque" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/stock-holdings
 * Fetches stock holdings, optionally filtered by ingredientId or venueObjectId.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ingredientId = searchParams.get("ingredientId");
    const venueObjectId = searchParams.get("venueObjectId");

    try {
        const whereClause: Prisma.StockHoldingWhereInput = {};
        if (ingredientId) {
            whereClause.ingredientId = ingredientId;
        }
        if (venueObjectId) {
            whereClause.venueObjectId = venueObjectId;
        }

        const holdings = await prisma.stockHolding.findMany({
            where: whereClause,
            include: {
                ingredient: {
                    select: { name: true, unit: true },
                },
                location: { // Relation name is 'location' in schema
                    select: { name: true },
                },
            },
            orderBy: [
                { ingredient: { name: 'asc' } },
                { location: { name: 'asc' } },
                { createdAt: 'desc' },
            ],
        });

        // Serialize Decimals
        const serializedHoldings = holdings.map(h => ({
            ...h,
            quantity: h.quantity.toString(),
        }));

        return NextResponse.json<ApiResponse<any[]>>(
            { success: true, data: serializedHoldings },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error fetching stock holdings:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao buscar lotes de estoque" },
            { status: 500 }
        );
    }
}