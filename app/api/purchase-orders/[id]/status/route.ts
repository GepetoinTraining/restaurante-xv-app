// PATH: app/api/purchase-orders/[id]/status/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { POStatus } from '@prisma/client';

// Schema to validate the incoming request body
const statusUpdateSchema = z.object({
  status: z.nativeEnum(POStatus),
});

/**
 * PATCH /api/purchase-orders/[id]/status
 *
 * Updates *only* the status of a specific PurchaseOrder.
 * This will also set the actualDeliveryDate if the status is 'RECEIVED'.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await req.json();
    const validation = statusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { status } = validation.data;

    // Prepare data for the update
    const updateData: { status: POStatus; actualDeliveryDate?: Date } = {
      status: status,
    };

    // If the order is being marked as RECEIVED, set the delivery date to now
    if (status === 'RECEIVED') {
      updateData.actualDeliveryDate = new Date();
    }

    const updatedPurchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
    });

    // TODO: Add logic here to automatically create/update StockHoldings
    // based on the PO items. (This is a V2 feature, but a good place to note it).

    return NextResponse.json(updatedPurchaseOrder);
  } catch (error) {
    console.error(`Failed to update PO status for ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}