// PATH: app/api/routes/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { RouteStatus } from '@prisma/client';

// Schema and GET/PATCH functions remain the same as before
// ... existing code ...

const routeUpdateSchema = z.object({
  routeName: z.string().optional(),
  vehicleId: z.string().cuid().nullable().optional(),
  driverId: z.string().cuid().nullable().optional(),
  status: z.nativeEnum(RouteStatus).optional(),
});

/**
 * GET /api/routes/[id]
 * Fetches a single route by its ID.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params; // Corrected
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        vehicle: true,
        stops: {
          orderBy: { stopOrder: 'asc' },
          include: {
            delivery: {
              include: {
                companyClient: {
                  select: { id: true, companyName: true, addressStreet: true },
                },
              },
            },
          },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error(`Failed to fetch route ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/routes/[id]
 * Updates a route's details.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params; // Corrected
    const body = await req.json();
    const validation = routeUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { routeName, vehicleId, driverId, status } = validation.data;

    const updatedRoute = await prisma.route.update({
      where: { id },
      data: {
        routeName: routeName,
        vehicleId: vehicleId,
        driverId: driverId,
        status: status,
      },
    });

    return NextResponse.json(updatedRoute);
  } catch (error) {
    console.error(`Failed to update route ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/routes/[id]
 *
 * Deletes a route. This will also delete all associated RouteStops
 * due to the 'onDelete: Cascade' in the schema.
 * Note: This unlinks deliveries, but doesn't delete them.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    // --- START FIX ---
    const { id } = params; // Removed the trailing underscore
    // --- END FIX ---

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id },
    });
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // You might want to add logic here, e.g., only allow deletion
    // if the route status is 'PLANNED'.

    await prisma.route.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Route deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error(`Failed to delete route ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}