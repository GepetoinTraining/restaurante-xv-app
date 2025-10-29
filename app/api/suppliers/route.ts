// PATH: app/api/suppliers/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { Supplier, Prisma } from "@prisma/client"; 
import { getSession } from "@/lib/auth";

/**
 * GET /api/suppliers
 * Fetches all suppliers.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['FINANCIAL', 'MANAGER', 'OWNER', 'COOK'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json<ApiResponse<Supplier[]>>({ success: true, data: suppliers });
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/suppliers
 * Creates a new supplier.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['FINANCIAL', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        // --- START FIX: Changed 'contactPerson' to 'contactName' ---
        const { 
            name, 
            contactName, 
            contactPhone, 
            contactEmail, 
            cnpj, 
            address, 
            notes 
        } = body;
        // --- END FIX ---

        if (!name) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Supplier Name is required" }, { status: 400 });
        }

        // --- START FIX: Use shorthand for contactName ---
        const data: Prisma.SupplierCreateInput = {
            name,
            contactName, // Was contactName: contactPerson
            contactPhone,
            contactEmail,
            cnpj,
            address,
            notes,
        };
        // --- END FIX ---

        const newSupplier = await prisma.supplier.create({ data });
        return NextResponse.json<ApiResponse<Supplier>>({ success: true, data: newSupplier }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating supplier:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             return NextResponse.json<ApiResponse>({ success: false, error: "Supplier name or CNPJ already exists" }, { status: 409 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}