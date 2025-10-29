// File: app/api/buffet/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { BuffetStation, ServingPan, Ingredient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Define the expected response structure including pans and ingredients
export type BuffetStationWithPans = BuffetStation & {
    pans: (Omit<ServingPan, 'currentQuantity' | 'capacity'> & {
        currentQuantity: string;
        capacity: string | null; // Capacity can be null
        ingredient: Pick<Ingredient, 'id' | 'name' | 'unit'> | null;
    })[];
};

// --- FIX: Define types for query payloads ---
// 1. Define the include object for pans and their ingredients
const stationInclude = {
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
        orderBy: {
            uniqueIdentifier: 'asc',
        },
    },
};

// 2. Define the type for a single pan as returned by the include
type PanWithIngredient = Prisma.ServingPanGetPayload<{
    include: {
        ingredient: {
            select: {
                id: true,
                name: true,
                unit: true,
            };
        };
    };
}>;

// 3. Define the type for a station as returned by the include
type StationWithPansPayload = Prisma.BuffetStationGetPayload<{
    include: typeof stationInclude;
}>;
// ------------------------------------------


/**
 * GET /api/buffet
 * Fetches all buffet stations and their current pan status.
 * (Previously /api/buffet/stations)
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    try {
        const stations = await prisma.buffetStation.findMany({
            include: stationInclude, // Use the defined include object
            orderBy: {
                displayOrder: 'asc',
            },
        });

        // Serialize Decimal/Float fields
        // --- FIX: Apply 'StationWithPansPayload' type to 'station' ---
        const serializedStations: BuffetStationWithPans[] = stations.map((station: StationWithPansPayload) => ({
            ...station,
            // --- FIX: Apply 'PanWithIngredient' type to 'pan' ---
            pans: station.pans.map((pan: PanWithIngredient) => ({
                ...pan,
                currentQuantity: pan.currentQuantity.toString(),
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

// POST/PUT/DELETE for BuffetStation could be added here later if needed