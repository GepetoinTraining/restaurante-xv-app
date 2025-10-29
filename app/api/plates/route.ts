// File: app/api/plates/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { Prisma, ClientPlate, User } from '@prisma/client';

// Zod schema for POST request validation
const plateSchema = z.object({
  totalWeightGrams: z.number().positive('Peso total deve ser positivo'),
  tareWeightGrams: z.number().nonnegative('Tara não pode ser negativa'),
  calculatedCost: z.number().nonnegative('Custo não pode ser negativo'),
  imageUrl: z.string().url().optional().nullable(),
  estimatedContents: z.any().optional().nullable(), // JSONB
  notes: z.string().optional().nullable(),
});

// Define the type for the plate object returned from the query
type PlateWithWeighedBy = ClientPlate & {
    weighedBy: { name: string | null } | null;
}

/**
 * GET /api/plates
 * Fetches recent client plates (e.g., last 20 for display)
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    try {
        const plates = await prisma.clientPlate.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                weighedBy: { select: { name: true } },
            }
        });

        // Serialize Decimal fields
        const serializedPlates = plates.map((plate: PlateWithWeighedBy) => ({
            ...plate,
            totalWeightGrams: plate.totalWeightGrams.toString(),
            tareWeightGrams: plate.tareWeightGrams.toString(),
            netWeightGrams: plate.netWeightGrams.toString(),
            calculatedCost: plate.calculatedCost.toString(),
        }));


        return NextResponse.json<ApiResponse<any[]>>({ success: true, data: serializedPlates });

    } catch (error) {
        console.error("Error fetching client plates:", error);
        return NextResponse.json<ApiResponse>({ success: false, error: "Erro interno do servidor" }, { status: 500 });
    }
}


/**
 * POST /api/plates
 * Creates a new client plate record (from weigh station)
 */
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.user?.isLoggedIn || !['CASHIER', 'SERVER', 'MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body = await req.json();

        // TEMPORARY: Assign to a dummy client/visit until POS flow is defined
        const dummyClient = await prisma.client.findFirst();
        const dummyVisit = dummyClient ? await prisma.visit.findFirst({ where: { clientId: dummyClient.id, status: 'ACTIVE' }}) : null;

        if (!dummyClient || !dummyVisit) {
             console.warn("Dummy client or active visit not found for plate creation. Ensure seed data exists.");
             return NextResponse.json<ApiResponse>({ success: false, error: "Cliente/Visita dummy não encontrado. Execute o seed." }, { status: 404 });
        }
        // END TEMPORARY

        // Validate main plate data
        const validation = plateSchema.safeParse(body);
        if (!validation.success) {
            // --- FIX: Serialize errors into 'error' string ---
            const errorDetails = validation.error.issues
                .map(issue => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            return NextResponse.json<ApiResponse>({ success: false, error: `Dados inválidos: ${errorDetails}` }, { status: 400 });
            // -------------------------------------------------
        }

        const { totalWeightGrams, tareWeightGrams, calculatedCost, imageUrl, estimatedContents, notes } = validation.data;

        const netWeightGrams = new Decimal(totalWeightGrams).minus(new Decimal(tareWeightGrams));
        if (netWeightGrams.isNegative()) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Peso líquido não pode ser negativo (Tara > Peso Total)" }, { status: 400 });
        }

        const newPlate = await prisma.clientPlate.create({
            data: {
                visitId: dummyVisit.id,
                clientId: dummyClient.id,
                weighedById: userId,
                totalWeightGrams: new Decimal(totalWeightGrams),
                tareWeightGrams: new Decimal(tareWeightGrams),
                netWeightGrams: netWeightGrams,
                calculatedCost: new Decimal(calculatedCost),
                imageUrl: imageUrl,
                estimatedContents: estimatedContents || Prisma.JsonNull,
                notes: notes,
            },
             include: {
                weighedBy: { select: { name: true } },
            }
        });

         const serializedPlate = {
            ...newPlate,
            totalWeightGrams: newPlate.totalWeightGrams.toString(),
            tareWeightGrams: newPlate.tareWeightGrams.toString(),
            netWeightGrams: newPlate.netWeightGrams.toString(),
            calculatedCost: newPlate.calculatedCost.toString(),
        };

        return NextResponse.json<ApiResponse<any>>({ success: true, data: serializedPlate }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating client plate:", error);
         if (error.code === 'P2025') {
            return NextResponse.json<ApiResponse>({ success: false, error: "Cliente, visita ou usuário associado não encontrado." }, { status: 404 });
         }
        return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
    }
}