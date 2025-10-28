// PATH: app/api/company-clients/[id]/sales-stage/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema to validate the incoming request body
const salesStageUpdateSchema = z.object({
  salesPipelineStage: z.string().min(1, 'Sales stage cannot be empty'),
});

/**
 * PATCH /api/company-clients/[id]/sales-stage
 *
 * Updates *only* the salesPipelineStage of a specific CompanyClient.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await req.json();
    const validation = salesStageUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { salesPipelineStage } = validation.data;

    const updatedClient = await prisma.companyClient.update({
      where: { id },
      data: {
        salesPipelineStage: salesPipelineStage,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error(`Failed to update sales stage for client ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}