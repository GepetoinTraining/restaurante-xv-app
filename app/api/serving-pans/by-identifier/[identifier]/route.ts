// PATH: app/api/serving-pans/by-identifier/[identifier]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/serving-pans/by-identifier/[identifier]
 *
 * Finds a ServingPan by its uniqueIdentifier and returns it along with its
 * *active* panShipment (i.e., the one where inTimestamp is null).
 * This is used by the Pan Return interface to find the correct shipment to log.
 */
export async function GET(
  req: Request,
  { params }: { params: { identifier: string } },
) {
  try {
    const { identifier } = params;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 },
      );
    }

    const servingPan = await prisma.servingPan.findUnique({
      where: {
        uniqueIdentifier: identifier,
      },
      include: {
        panModel: true, // Need this for tare weight and name
        panShipments: {
          // Find the shipment for this pan that is *out*
          where: {
            inTimestamp: null,
          },
          // Should only ever be one active shipment per pan
          take: 1,
          include: {
            delivery: {
              include: {
                companyClient: true, // For display
              },
            },
          },
        },
      },
    });

    if (!servingPan) {
      return NextResponse.json(
        { error: 'Serving Pan not found' },
        { status: 404 },
      );
    }

    // Check if we found an *active* shipment
    const activeShipment = servingPan.panShipments[0];
    if (!activeShipment) {
      return NextResponse.json(
        {
          error: `Pan '${servingPan.panModel.name}' (ID: ${servingPan.id}) found, but has no active shipment out for delivery.`,
        },
        { status: 404 },
      );
    }

    // Return the active shipment, nested inside the pan data
    return NextResponse.json(servingPan);
  } catch (error) {
    console.error('Failed to fetch pan by identifier:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}