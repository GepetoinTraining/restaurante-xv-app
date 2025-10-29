// File: app/api/suppliers/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Type definition for route parameters
type Params = {
  params: {
    id: string; // ID of the Supplier
  };
};

// Zod schema for PUT/PATCH request validation (allows partial updates for PUT as well)
const supplierUpdateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email("Email inválido").optional().nullable(),
  cnpj: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});


/**
 * PUT /api/suppliers/[id]
 * Updates an existing supplier.
 */
export async function PUT(request: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['FINANCIAL', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 403 });
    }
    const { id } = params;

    try {
        const body = await request.json();
        const validation = supplierUpdateSchema.safeParse(body);

        if (!validation.success) {
            const errorDetails = validation.error.issues
                .map(issue => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            return NextResponse.json<ApiResponse>({ success: false, error: `Dados inválidos: ${errorDetails}` }, { status: 400 });
        }

        // --- FIX: Remove the unsafe 'reduce' function ---
        // The validation.data object is already in the correct shape
        // and Prisma's update method ignores 'undefined' fields.
        const dataToUpdate = validation.data;
        // ------------------------------------------------

        if (Object.keys(dataToUpdate).length === 0) {
             return NextResponse.json<ApiResponse>({ success: false, error: "Nenhum dado fornecido para atualização." }, { status: 400 });
        }


        const updatedSupplier = await prisma.supplier.update({
            where: { id },
            data: dataToUpdate, // Pass the Zod output directly
        });

        return NextResponse.json<ApiResponse<any>>({ success: true, data: updatedSupplier });

    } catch (error: any) {
        console.error(`Error updating supplier ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') {
                 return NextResponse.json<ApiResponse>({ success: false, error: "Fornecedor não encontrado." }, { status: 404 });
             }
             if (error.code === 'P2002') {
                let field = error.meta?.target as string[];
                if (field?.includes('name')) return NextResponse.json<ApiResponse>({ success: false, error: "Nome do fornecedor já existe" }, { status: 409 });
                if (field?.includes('cnpj')) return NextResponse.json<ApiResponse>({ success: false, error: "CNPJ já existe" }, { status: 409 });
             }
        }
        return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
    }
}

/**
 * DELETE /api/suppliers/[id]
 * Deletes a supplier.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 403 });
    }
    const { id } = params;

    try {
        const poCount = await prisma.purchaseOrder.count({
            where: { supplierId: id }
        });

        if (poCount > 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Não é possível excluir. Existem ordens de compra associadas a este fornecedor." }, { status: 409 });
        }

        const deletedSupplier = await prisma.supplier.delete({
            where: { id },
        });

        return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: { id: deletedSupplier.id } });

    } catch (error: any) {
        console.error(`Error deleting supplier ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json<ApiResponse>({ success: false, error: "Fornecedor não encontrado." }, { status: 404 });
        }
        return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
    }
}