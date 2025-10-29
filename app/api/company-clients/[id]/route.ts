// File: app/api/company-clients/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

// Type definition for route parameters
type Params = {
  params: {
    id: string; // ID of the CompanyClient
  };
};

// Zod schema for PATCH request validation (allows partial updates)
const clientUpdateSchema = z.object({
  companyName: z.string().min(1, "Nome da Empresa é obrigatório").optional(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().min(1, "Telefone de Contato é obrigatório").optional(),
  contactEmail: z.string().email("Email inválido").optional().nullable(),
  cnpj: z.string().optional().nullable(),
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  addressComplement: z.string().optional().nullable(),
  addressDistrict: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().optional().nullable(),
  addressZipCode: z.string().optional().nullable(),
  employeeCount: z.number().int().nonnegative("Nº de funcionários deve ser >= 0").optional().nullable(),
  consumptionFactor: z.number().nonnegative("Fator de consumo deve ser >= 0").optional(),
  salesPipelineStage: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});


/**
 * PATCH /api/company-clients/[id]
 * Updates an existing company client.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['SALES', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 403 });
    }
    const { id } = params;

    try {
        const body = await request.json();
        const validation = clientUpdateSchema.safeParse(body);

        if (!validation.success) {
            // --- FIX: Serialize errors into 'error' string ---
            const errorDetails = validation.error.issues
                .map(issue => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            return NextResponse.json<ApiResponse>({ success: false, error: `Dados inválidos: ${errorDetails}` }, { status: 400 });
            // -------------------------------------------------
        }

        const dataToUpdate = validation.data;

        const prismaUpdateData: Prisma.CompanyClientUpdateInput = {
            ...dataToUpdate,
            consumptionFactor: dataToUpdate.consumptionFactor !== undefined
                ? dataToUpdate.consumptionFactor
                : undefined,
        };

        const updatedClient = await prisma.companyClient.update({
            where: { id },
            data: prismaUpdateData,
        });

        const serializedClient = {
            ...updatedClient,
            consumptionFactor: updatedClient.consumptionFactor.toString(),
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedClient });

    } catch (error: any) {
        console.error(`Error updating company client ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Cliente não encontrado." }, { status: 404 });
             }
             if (error.code === 'P2002') {
                 let field = error.meta?.target as string[];
                 if (field?.includes('companyName')) return NextResponse.json<ApiResponse>({ success: false, error: "Nome da empresa já existe" }, { status: 409 });
                 if (field?.includes('contactPhone')) return NextResponse.json<ApiResponse>({ success: false, error: "Telefone já existe" }, { status: 409 });
                 if (field?.includes('contactEmail')) return NextResponse.json<ApiResponse>({ success: false, error: "Email já existe" }, { status: 409 });
             }
        }
        return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
    }
}

/**
 * DELETE /api/company-clients/[id]
 * Deletes a company client.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 403 });
    }
    const { id } = params;

    try {
        const deletedClient = await prisma.companyClient.delete({
            where: { id },
        });

        return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: { id: deletedClient.id } });

    } catch (error: any) {
        console.error(`Error deleting company client ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json<ApiResponse>({ success: false, error: "Cliente não encontrado." }, { status: 404 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
    }
}