// PATH: app/api/route-stops/[stopId]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Zod schema remains the same
const stopUpdateSchema = z.object({
  stopOrder: z.number().int().min(1).optional(),
});

/**
 * PATCH /api/route-stops/[stopId]
 * (PATCH function remains the same as before)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { stopId: string } },
) {
  try {
    const { stopId } = params; // Corrected: removed trailing underscore
    const body = await req.json();
    const validation = stopUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 },
      );
    }

    const updatedStop = await prisma.routeStop.update({
      where: { id: stopId },
      data: validation.data,
    });

    return NextResponse.json(updatedStop);
  } catch (error) {
    console.error(`Failed to update route stop ${params.stopId}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}


/**
 * DELETE /api/route-stops/[stopId]
 *
 * Removes a stop from a route.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { stopId: string } },
) {
  try {
    // --- START FIX ---
    const { stopId } = params; // Removed the trailing underscore
    // --- END FIX ---

    // --- Start Transaction ---
    const deletedStop = await prisma.$transaction(async (tx) => {
      // 1. Find the stop to get its deliveryId
      const stop = await tx.routeStop.findUnique({
        where: { id: stopId },
        select: { deliveryId: true },
      });

      if (!stop) {
        throw new Error('Route stop not found.');
      }

      // 2. Delete the stop
      await tx.routeStop.delete({
        where: { id: stopId },
      });

      // 3. Update the associated Delivery
      await tx.delivery.update({
        where: { id: stop.deliveryId },
        data: {
          driverId: null,
          vehicleId: null,
          status: 'PENDING', // Revert status
        },
      });

      return stop;
    });
    // --- End Transaction ---

    return NextResponse.json(
      { message: `Stop removed and delivery ${deletedStop.deliveryId} updated.` },
      { status: 200 },
    );
  } catch (error) {
    console.error(`Failed to delete route stop ${params.stopId}:`, error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
