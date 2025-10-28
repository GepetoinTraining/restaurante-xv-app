// PATH: app/api/vehicles/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Vehicle, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

/**
 * GET /api/vehicles
 * Fetches all vehicles.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) { // Adjust roles if needed
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    try {
        const vehicles = await prisma.vehicle.findMany({
            orderBy: { name: 'asc' },
        });

        const serializedVehicles = vehicles.map(v => ({
            ...v,
            capacityKg: v.capacityKg?.toString(),
            autonomyKm: v.autonomyKm?.toString(),
            mileage: v.mileage?.toString(),
        }));

        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedVehicles });
    } catch (error) {
        console.error("Error fetching vehicles:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/vehicles
 * Creates a new vehicle.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) { // Assuming only managers/owners add vehicles
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, type, licensePlate, capacityKg, autonomyKm, mileage, notes } = body;

        if (!name) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Vehicle Name is required" }, { status: 400 });
        }

        // Helper to safely create Decimal or null
        const toDecimalOrNull = (value: any): Decimal | null => {
            if (value === undefined || value === null || value === '') return null;
            try {
                const dec = new Decimal(value);
                if (dec.isNegative()) return null; // Or throw error?
                return dec;
            } catch {
                return null; // Invalid format
            }
        };

        const data: Prisma.VehicleCreateInput = {
            name,
            type,
            licensePlate,
            capacityKg: toDecimalOrNull(capacityKg),
            autonomyKm: toDecimalOrNull(autonomyKm),
            mileage: toDecimalOrNull(mileage),
            notes,
        };

        const newVehicle = await prisma.vehicle.create({ data });

        const serializedVehicle = {
             ...newVehicle,
            capacityKg: newVehicle.capacityKg?.toString(),
            autonomyKm: newVehicle.autonomyKm?.toString(),
            mileage: newVehicle.mileage?.toString(),
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedVehicle }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating vehicle:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             return NextResponse.json<ApiResponse>({ success: false, error: "License plate already exists" }, { status: 409 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
