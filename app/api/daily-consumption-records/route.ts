// PATH: app/api/daily-consumption-records/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Schema to validate the incoming request body
const postBodySchema = z.object({
  recordDate: z.string().datetime(), // Expecting an ISO string date (e.g., "2025-10-28T00:00:00.000Z")
  companyClientId: z.string().cuid(),
});

/**
 * POST /api/daily-consumption-records
 *
 * Creates or updates a DailyConsumptionRecord for a given client and date.
 * This should be triggered *after* all pans for the day's deliveries have been
 * returned and processed.
 *
 * It calculates:
 * 1.  `deliveredConsumptionKg`: Total net weight of food delivered (OutWeight - Tare).
 * 2.  `actualConsumptionKg`: Total net weight of food consumed (Delivered - Waste).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { companyClientId } = validation.data;
    // Ensure the date is treated as a specific day in UTC
    const recordDate = new Date(validation.data.recordDate);

    // --- Start Transaction ---
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the menu assignment for that day (if any)
      const dailyAssignment = await tx.dailyMenuAssignment.findFirst({
        where: {
          companyClientId: companyClientId,
          assignmentDate: recordDate,
        },
      });

      // 2. Find all deliveries for that client on that date
      const deliveries = await tx.delivery.findMany({
        where: {
          companyClientId: companyClientId,
          deliveryDate: recordDate,
        },
        select: { id: true },
      });

      if (deliveries.length === 0) {
        // No deliveries, but we might still create an empty record
        // Or we could return an error/message. Let's create an empty one.
        console.warn(
          `No deliveries found for ${companyClientId} on ${recordDate}.`,
        );
      }

      const deliveryIds = deliveries.map((d) => d.id);

      // 3. Find all *returned* pan shipments for those deliveries
      const returnedShipments = await tx.panShipment.findMany({
        where: {
          deliveryId: { in: deliveryIds },
          inTimestamp: { not: null }, // Must be returned
          calculatedWasteGrams: { not: null }, // Must be processed
        },
        include: {
          servingPan: {
            include: {
              panModel: true, // Need this for tareWeightG
            },
          },
        },
      });

      // 4. Calculate total delivered and total waste in grams
      let totalDeliveredGrams = new Decimal(0);
      let totalWasteGrams = new Decimal(0);

      for (const shipment of returnedShipments) {
        const tareWeightG = shipment.servingPan?.panModel?.tareWeightG;

        if (tareWeightG === null || tareWeightG === undefined) {
          throw new Error(
            `ServingPan ${shipment.servingPanId} is missing PanModel or tareWeightG. Cannot calculate net weight.`,
          );
        }

        const outWeightGrams = new Decimal(shipment.outWeightGrams);
        const tareGrams = new Decimal(tareWeightG);
        const wasteGrams = new Decimal(shipment.calculatedWasteGrams!);

        // Net food delivered in this pan
        const netFoodDeliveredGrams = outWeightGrams.minus(tareGrams);

        totalDeliveredGrams = totalDeliveredGrams.plus(netFoodDeliveredGrams);
        totalWasteGrams = totalWasteGrams.plus(wasteGrams);
      }

      // 5. Convert to Kilograms for the record
      const deliveredConsumptionKg = totalDeliveredGrams.div(1000);
      const actualConsumptionKg = totalDeliveredGrams
        .minus(totalWasteGrams)
        .div(1000);

      // 6. Upsert the DailyConsumptionRecord
      const upsertedRecord = await tx.dailyConsumptionRecord.upsert({
        where: {
          recordDate_companyClientId: {
            recordDate: recordDate,
            companyClientId: companyClientId,
          },
        },
        create: {
          recordDate: recordDate,
          companyClientId: companyClientId,
          menuId: dailyAssignment?.menuId,
          deliveredConsumptionKg: deliveredConsumptionKg,
          actualConsumptionKg: actualConsumptionKg,
          // predictedConsumptionKg will be added in Phase 5
        },
        update: {
          menuId: dailyAssignment?.menuId,
          deliveredConsumptionKg: deliveredConsumptionKg,
          actualConsumptionKg: actualConsumptionKg,
        },
      });

      return upsertedRecord;
    });
    // --- End Transaction ---

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create/update daily consumption record:', error);
    // Handle specific errors, e.g., if a pan is missing tare weight
    if (error instanceof Error && error.message.includes('tareWeightG')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}