// PATH: app/api/vehicles/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Vehicle, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";

/**
 * GET /api/vehicles
 * Fetches all vehicles.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER', 'DRIVER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    try {
        const vehicles = await prisma.vehicle.findMany({
            include: {
                staffAssignments: {
                    include: {
                        user: { select: { id: true, name: true, role: true } }
                    }
                },
                deliveries: {
                    select: { id: true, deliveryDate: true, status: true }
                }
            },
            orderBy: { model: 'asc' },
        });

        // Serialize floats (no Decimals here, but good practice for consistency)
        const serializedVehicles = vehicles.map(v => ({
            ...v,
            capacityKg: v.capacityKg?.toString(),
            capacityVol: v.capacityVol?.toString(),
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
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { model, licensePlate, capacityKg, capacityVol, notes, isActive } = body;

        if (!model || !licensePlate) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Model and License Plate are required" }, { status: 400 });
        }

        // --- START FIX: More robust validation for optional floats ---
        let parsedCapacityKg: number | null = null;
        if (capacityKg !== undefined && capacityKg !== null && capacityKg !== "") {
            parsedCapacityKg = parseFloat(capacityKg);
            if (isNaN(parsedCapacityKg)) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Capacity (Kg)" }, { status: 400 });
            }
        }
        
        let parsedCapacityVol: number | null = null;
         if (capacityVol !== undefined && capacityVol !== null && capacityVol !== "") {
            parsedCapacityVol = parseFloat(capacityVol);
            if (isNaN(parsedCapacityVol)) {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Capacity (Vol)" }, { status: 400 });
            }
        }
        // --- END FIX ---

        const data: Prisma.VehicleCreateInput = {
            model,
            licensePlate,
            capacityKg: parsedCapacityKg,
            capacityVol: parsedCapacityVol,
            notes,
            isActive: isActive !== undefined ? isActive : true,
        };

        const newVehicle = await prisma.vehicle.create({ data });

        const serializedVehicle = {
            ...newVehicle,
            capacityKg: newVehicle.capacityKg?.toString(),
            capacityVol: newVehicle.capacityVol?.toString(),
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