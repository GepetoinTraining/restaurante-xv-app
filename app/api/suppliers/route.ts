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
    // Assuming FINANCIAL, MANAGER, OWNER can view suppliers
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
        const { name, contactPerson, phone, email, address, notes } = body;

        if (!name) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Supplier Name is required" }, { status: 400 });
        }

        const data: Prisma.SupplierCreateInput = {
            name,
            contactPerson,
            phone,
            email,
            address,
            notes,
        };

        const newSupplier = await prisma.supplier.create({ data });

        return NextResponse.json<ApiResponse<Supplier>>({ success: true, data: newSupplier }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating supplier:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             if (error.meta?.target === 'Supplier_name_key') return NextResponse.json<ApiResponse>({ success: false, error: "Supplier name already exists" }, { status: 409 });
             if (error.meta?.target === 'Supplier_email_key') return NextResponse.json<ApiResponse>({ success: false, error: "Supplier email already exists" }, { status: 409 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
