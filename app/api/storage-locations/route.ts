// PATH: app/api/storage-locations/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { VenueObject, VenueObjectType } from "@prisma/client";

// Define the specific types considered storage locations
const storageTypes: VenueObjectType[] = [
    VenueObjectType.STORAGE,
    VenueObjectType.FREEZER,
    VenueObjectType.SHELF,
    VenueObjectType.WORKSTATION_STORAGE // VenueObjects linked to workstations can also store items
];

// Define the type for the API response data (subset of VenueObject)
export type StorageLocation = Pick<VenueObject, 'id' | 'name' | 'type'>;

/**
 * GET /api/storage-locations
 * Fetches all VenueObjects designated as storage locations.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    // Add auth check - ensure user is logged in (adjust roles as needed)
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Não autorizado" },
            { status: 401 }
        );
    }

    try {
        const locations = await prisma.venueObject.findMany({
            where: {
                type: {
                    in: storageTypes,
                },
            },
            select: {
                id: true,
                name: true,
                type: true, // Include type for potential frontend logic
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json<ApiResponse<StorageLocation[]>>(
            { success: true, data: locations },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching storage locations:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "Erro interno do servidor ao buscar locais de estoque" },
            { status: 500 }
        );
    }
}