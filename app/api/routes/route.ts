// PATH: app/api/routes/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { toUTC } from '@/lib/utils'; // We'll reuse this helper

// Schema for creating a new route
const routeCreateSchema = z.object({
  routeDate: z.string().datetime(), // ISO string from frontend
  routeName: z.string().optional(),
  vehicleId: z.string().cuid().optional(),
  driverId: z.string().cuid().optional(),
});

/**
 * GET /api/routes
 *
 * Fetches existing routes.
 * Can be filtered by a specific date using a query param: ?date=YYYY-MM-DD
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date'); // e.g., "2025-10-29"

  let whereClause = {};

  if (dateParam) {
    // Use our toUTC helper to ensure we're querying for the exact UTC date
    const routeDate = toUTC(new Date(dateParam));
    whereClause = {
      routeDate: routeDate,
    };
  }

  try {
    const routes = await prisma.route.findMany({
      where: whereClause,
      include: {
        vehicle: true, // Include vehicle info
        stops: {
          // Include stops
          orderBy: {
            stopOrder: 'asc', // Ensure stops are in the correct order
          },
          include: {
            delivery: {
              include: {
                companyClient: {
                  select: { id: true, companyName: true, addressStreet: true },
                }, // Include client info for display
              },
            },
          },
        },
        // We can fetch the driver via the driverId if needed,
        // but let's keep it simple for now.
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error('Failed to fetch routes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/routes
 *
 * Creates a new Route.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = routeCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { routeDate, routeName, vehicleId, driverId } = validation.data;

    // Ensure date is stored as a clean UTC date
    const utcRouteDate = toUTC(new Date(routeDate));

    const newRoute = await prisma.route.create({
      data: {
        routeDate: utcRouteDate,
        routeName: routeName || `Route for ${utcRouteDate.toLocaleDateString()}`,
        status: 'PLANNED',
        vehicleId: vehicleId || null,
        driverId: driverId || null,
      },
    });

    return NextResponse.json(newRoute, { status: 201 });
  } catch (error) {
    console.error('Failed to create route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}