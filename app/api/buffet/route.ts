// PATH: app/api/buffet/stations/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { BuffetStation, servingPan, Ingredient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Define the expected response structure including pans and ingredients
// Quantities and capacities will be serialized strings
export type BuffetStationWithPans = BuffetStation & {
    pans: (Omit<servingPan, 'currentQuantity' | 'capacity'> & {
        currentQuantity: string;
        capacity: string;
        ingredient: Pick<Ingredient, 'id' | 'name' | 'unit'> | null; // Include ingredient details
    })[];
};

/**
 * GET /api/buffet/stations
 * Fetches all buffet stations and their current pan status.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    try {
        const stations = await prisma.buffetStation.findMany({
            include: {
                pans: {
                    include: {
                        ingredient: { // Include ingredient details for each pan
                            select: {
                                id: true,
                                name: true,
                                unit: true,
                            },
                        },
                    },
                    orderBy: {
                        displayOrder: 'asc', // Or order by name, etc.
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Serialize Decimal fields (currentQuantity, capacity)
        const serializedStations: BuffetStationWithPans[] = stations.map(station => ({
            ...station,
            pans: station.pans.map(pan => ({
                ...pan,
                currentQuantity: pan.currentQuantity.toString(),
                capacity: pan.capacity.toString(),
                // Ingredient is already selected, no decimals there
            })),
        }));


        return NextResponse.json<ApiResponse<BuffetStationWithPans[]>>(
            { success: true, data: serializedStations },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching buffet stations:", error);
        // Catch specific Prisma errors if model doesn't exist yet
        if (error instanceof Prisma.PrismaClientInitializationError || (error instanceof Error && error.message.includes("model"))){
             return NextResponse.json<ApiResponse>(
                { success: false, error: "Erro: Modelos de Buffet não encontrados no schema Prisma. Execute as migrações." },
                { status: 500 }
             );
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao buscar estações de buffet" },
            { status: 500 }
        );
    }
}