// PATH: app/api/routes/[id]/stops/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for adding a stop to a route
const addStopSchema = z.object({
  deliveryId: z.string().cuid(),
  stopOrder: z.number().int().min(1).optional(), // Optional: can be auto-determined
});

/**
 * POST /api/routes/[id]/stops
 *
 * Adds a Delivery as a new RouteStop on a specific Route.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const routeId = params.id;
    const body = await req.json();
    const validation = addStopSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { deliveryId }_ = validation.data;
    let { stopOrder }_ = validation.data;

    // --- Start Transaction ---
    const newRouteStop = await prisma.$transaction(async (tx) => {
      // 1. Check if the delivery is already on *another* route
      const existingStop = await tx.routeStop.findUnique({
        where: { deliveryId },
      });
      if (existingStop) {
        throw new Error(
          `Delivery ${deliveryId} is already assigned to route ${existingStop.routeId}.`,
        );
      }

      // 2. Determine the stopOrder if not provided
      if (!stopOrder) {
        const lastStop = await tx.routeStop.findFirst({
          where: { routeId },
          orderBy: { stopOrder: 'desc' },
        });
        stopOrder = (lastStop?.stopOrder || 0) + 1;
      }

      // 3. Create the new RouteStop
      const createdStop = await tx.routeStop.create({
        data: {
          routeId: routeId,
          deliveryId: deliveryId,
          stopOrder: stopOrder,
        },
      });

      // 4. Update the delivery record to link to the route (optional but good)
      // Note: Our schema doesn't have a direct link from Delivery -> Route
      // It's linked via RouteStop, which is fine.
      // But we *can* update the delivery's driver/vehicle to match the route's.
      const route = await tx.route.findUnique({ where: { id: routeId } });
      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          driverId: route?.driverId,
          vehicleId: route?.vehicleId,
          status: 'READY_FOR_DISPATCH', // Update status
        },
      });

      return createdStop;
    });
    // --- End Transaction ---

    return NextResponse.json(newRouteStop, { status: 201 });
  } catch (error) {
    console.error('Failed to add stop to route:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}