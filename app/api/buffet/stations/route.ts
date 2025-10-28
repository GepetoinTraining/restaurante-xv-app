// PATH: app/api/buffet/stations/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
// --- FIX 1: Import correct model name (ServingPan is capitalized) ---
import { BuffetStation, ServingPan, Ingredient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Define the expected response structure including pans and ingredients
// Quantities and capacities will be serialized strings
export type BuffetStationWithPans = BuffetStation & {
    // --- FIX 2: Use correct type 'ServingPan' and allow null capacity ---
    pans: (Omit<ServingPan, 'currentQuantity' | 'capacity'> & {
        currentQuantity: string;
        capacity: string | null; // Capacity can be null
        ingredient: Pick<Ingredient, 'id' | 'name' | 'unit'> | null;
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
                        ingredient: {
                            select: {
                                id: true,
                                name: true,
                                unit: true,
                            },
                        },
                    },
                    // --- FIX 3: Order by a field that exists on ServingPan ---
                    orderBy: {
                        uniqueIdentifier: 'asc', // Sort by identifier
                    },
                },
            },
            orderBy: {
                displayOrder: 'asc', // This one is correct (for the stations)
            },
        });

        // Serialize Decimal fields
        const serializedStations: BuffetStationWithPans[] = stations.map(station => ({
            ...station,
            pans: station.pans.map(pan => ({
                ...pan,
                currentQuantity: pan.currentQuantity.toString(),
                // --- FIX 4: Check for null capacity before serializing ---
                capacity: pan.capacity !== null ? pan.capacity.toString() : null,
            })),
        }));


        return NextResponse.json<ApiResponse<BuffetStationWithPans[]>>(
            { success: true, data: serializedStations },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching buffet stations:", error);
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