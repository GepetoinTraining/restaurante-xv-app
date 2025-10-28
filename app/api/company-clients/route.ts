// PATH: app/api/company-clients/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { CompanyClient, Prisma, SalesPipelineStage } from "@prisma/client";
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
    // TODO: Add role-based access control if needed (e.g., only SALES, MANAGER, OWNER?)

    try {
        const clients = await prisma.companyClient.findMany({
            orderBy: { companyName: 'asc' },
        });

        // Serialize Decimal fields
        const serializedClients = clients.map(client => ({
            ...client,
            consumptionFactor: client.consumptionFactor.toString(),
            // Ensure lat/long are numbers or null
            latitude: client.latitude,
            longitude: client.longitude,
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
        const {
            companyName, phone, contactPerson, email,
            addressStreet, addressCity, addressState, addressZip,
            employeeCount, consumptionFactor, salesPipelineStage, notes
        } = body;

        if (!companyName || !phone) {
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
            phone,
            contactPerson,
            email,
            addressStreet,
            addressCity,
            addressState,
            addressZip,
            // latitude, // TODO: Add geocoding later if needed
            // longitude,
            employeeCount: employeeCount ? parseInt(employeeCount, 10) : null,
            consumptionFactor: consumptionFactorDecimal,
            salesPipelineStage: salesPipelineStage as SalesPipelineStage || SalesPipelineStage.LEAD,
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
             if (field?.includes('companyName')) return NextResponse.json<ApiResponse>({ success: false, error: "Company name already exists" }, { status: 409 });
             if (field?.includes('phone')) return NextResponse.json<ApiResponse>({ success: false, error: "Phone number already exists" }, { status: 409 });
             if (field?.includes('email')) return NextResponse.json<ApiResponse>({ success: false, error: "Email already exists" }, { status: 409 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: "Server error" }, { status: 500 });
    }
}
