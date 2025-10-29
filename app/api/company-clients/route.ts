// PATH: app/api/company-clients/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
// --- START FIX: Removed 'SalesPipelineStage' as it's not an enum ---
import { CompanyClient, Prisma } from "@prisma/client";
// --- END FIX ---
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

// Type for API response serialization
type SerializedCompanyClient = Omit<CompanyClient, 'consumptionFactor'> & {
    consumptionFactor: string;
};

/**
 * GET /api/company-clients
 * Fetches all company clients.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 401 });
    }

    try {
        const clients = await prisma.companyClient.findMany({
            orderBy: { companyName: 'asc' },
        });

        // Serialize Decimal fields
        const serializedClients = clients.map(client => ({
            ...client,
            consumptionFactor: client.consumptionFactor.toString(),
            // --- START FIX: Removed latitude and longitude as they don't exist on the model ---
            // latitude: client.latitude,
            // longitude: client.longitude,
            // --- END FIX ---
        }));


        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedClients });
    } catch (error) {
        console.error("Error fetching company clients:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/company-clients
 * Creates a new company client.
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['SALES', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Not authorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        // --- START FIX: Use correct field names from schema ---
        const {
            companyName,
            contactName, // Was contactPerson
            contactPhone, // Was phone
            contactEmail, // Was email
            cnpj,
            addressStreet,
            addressNumber, // Added
            addressComplement, // Added
            addressDistrict, // Added
            addressCity,
            addressState,
            addressZipCode, // Was addressZip
            employeeCount,
            consumptionFactor,
            salesPipelineStage,
            notes
        } = body;
        // --- END FIX ---

        if (!companyName || !contactPhone) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Company Name and Phone are required" }, { status: 400 });
        }

        let consumptionFactorDecimal = new Decimal(1.0); // Default
        if (consumptionFactor !== undefined) {
             try {
                 consumptionFactorDecimal = new Decimal(consumptionFactor);
                 if (consumptionFactorDecimal.isNegative()) throw new Error();
            } catch {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Consumption Factor format" }, { status: 400 });
            }
        }

        const data: Prisma.CompanyClientCreateInput = {
            companyName,
            // --- START FIX: Use correct field names ---
            contactName,
            contactPhone,
            contactEmail,
            cnpj,
            addressStreet,
            addressNumber,
            addressComplement,
            addressDistrict,
            addressCity,
            addressState,
            addressZipCode,
            // --- END FIX ---
            employeeCount: employeeCount ? parseInt(employeeCount, 10) : null,
            // --- START FIX: Convert Decimal to number (Float) ---
            consumptionFactor: consumptionFactorDecimal.toNumber(),
            // --- END FIX ---
            // --- START FIX: Use string literal for default stage ---
            salesPipelineStage: salesPipelineStage || "LEAD",
            // --- END FIX ---
            notes,
        };

        const newClient = await prisma.companyClient.create({ data });

        const serializedClient = {
            ...newClient,
            consumptionFactor: newClient.consumptionFactor.toString(),
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedClient }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating company client:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             let field = error.meta?.target as string[];
             // --- START FIX: Check for correct field names ---
             if (field?.includes('companyName')) return NextResponse.json<ApiResponse>({ success: false, error: "Company name already exists" }, { status: 409 });
             if (field?.includes('contactPhone')) return NextResponse.json<ApiResponse>({ success: false, error: "Phone number already exists" }, { status: 409 });
             if (field?.includes('contactEmail')) return NextResponse.json<ApiResponse>({ success: false, error: "Email already exists" }, { status: 409 });
             // --- END FIX ---
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}