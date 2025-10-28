// PATH: app/api/pan-shipments/[id]/return/route.ts
//
// New API route for Phase 3: Handling Pan Returns and Waste Calculation
// METHOD: PATCH
//
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  PanStatus,
  DeliveryStatus,
  WasteReason,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * @swagger
 * /api/pan-shipments/{id}/return:
 * patch:
 * summary: Records the return of a specific serving pan shipment
 * description: |
 * Handles the return of a pan. It requires the 'inWeightGrams' (weight upon return).
 * It performs the following actions in a transaction:
 * 1. Validates the input and finds the PanShipment.
 * 2. Calculates waste (outWeightGrams - inWeightGrams).
 * 3. Updates the PanShipment with inTimestamp, inWeightGrams, and calculatedWasteGrams.
 * 4. Updates the ServingPan status to RETURNED_DIRTY.
 * 5. Creates a linked WasteRecord for the calculated waste.
 * 6. Checks if all other pans for the delivery are returned, and if so, updates the Delivery status to RETURNED.
 * tags:
 * - PanShipments
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: The ID of the PanShipment being returned.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * inWeightGrams:
 * type: number
 * description: The total weight of the pan (including leftovers) upon return, in grams.
 * example:
 * inWeightGrams: 1500.50
 * responses:
 * 200:
 * description: PanShipment successfully updated with return info.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/PanShipment'
 * 400:
 * description: Bad Request (e.g., missing inWeightGrams, invalid ID, or pan model missing tare weight).
 * 404:
 * description: PanShipment not found.
 * 409:
 * description: Conflict (e.g., pan has already been returned).
 * 500:
 * description: Internal Server Error.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { inWeightGrams } = body;

    // --- Input Validation ---
    if (!id) {
      return new NextResponse('Missing Pan Shipment ID', { status: 400 });
    }
    if (inWeightGrams === undefined || inWeightGrams === null) {
      return new NextResponse('Missing required field: inWeightGrams', {
        status: 400,
      });
    }

    const inWeightGramsDecimal = new Decimal(inWeightGrams);

    // TODO: Replace this with actual authenticated user session logic
    // For now, we find the first user to attribute the waste record to.
    const systemUser = await prisma.user.findFirst();
    if (!systemUser) {
      console.error(
        'No user found in database. Cannot attribute waste record.',
      );
      return new NextResponse(
        'Internal server error: No user available for waste attribution',
        { status: 500 },
      );
    }
    // --- End Validation ---

    // Use a transaction to ensure all updates are atomic
    const updatedPanShipment = await prisma.$transaction(async (tx) => {
      // 1. Find the PanShipment and its related pan/model
      const panShipment = await tx.panShipment.findUnique({
        where: { id },
        include: {
          servingPan: {
            include: {
              panModel: true,
            },
          },
        },
      });

      if (!panShipment) {
        throw new Error('PanShipment not found'); // 404
      }
      if (panShipment.inTimestamp) {
        throw new Error('Pan has already been returned'); // 409
      }
      if (!panShipment.servingPan?.panModel?.tareWeightG) {
        throw new Error(
          'Pan model info or tare weight not found for this pan',
        ); // 400
      }

      // 2. Calculate Waste
      const outWeight = new Decimal(panShipment.outWeightGrams);

      // Waste = (Total Weight Out) - (Total Weight In)
      let calculatedWasteGrams = outWeight.sub(inWeightGramsDecimal);

      // Prevent negative waste in case of scale discrepancies
      if (calculatedWasteGrams.isNegative()) {
        console.warn(
          `Pan ${panShipment.servingPanId} returned heavier or at same weight (Out: ${outWeight}g, In: ${inWeightGramsDecimal}g). Logging 0 waste.`,
        );
        calculatedWasteGrams = new Decimal(0);
      }

      // 3. Update PanShipment
      const updatedShipment = await tx.panShipment.update({
        where: { id },
        data: {
          inTimestamp: new Date(),
          inWeightGrams: inWeightGramsDecimal,
          calculatedWasteGrams: calculatedWasteGrams,
        },
      });

      // 4. Update ServingPan Status
      await tx.servingPan.update({
        where: { id: panShipment.servingPanId },
        data: {
          status: PanStatus.RETURNED_DIRTY,
        },
      });

      // 5. Create WasteRecord
      await tx.wasteRecord.create({
        data: {
          recordedById: systemUser.id,
          panShipmentId: panShipment.id,
          reason: WasteReason.CLIENT_RETURN,
          quantity: calculatedWasteGrams,
          unit: 'g',
          costValue: 0, // TODO: Calculate cost value based on recipe/ingredients
          notes: `Automated waste calculation from client return.`,
        },
      });

      // 6. Check if parent Delivery is now fully returned
      const deliveryId = panShipment.deliveryId;
      const otherShipments = await tx.panShipment.findMany({
        where: {
          deliveryId: deliveryId,
          id: { not: id }, // Exclude the one we just updated
        },
        select: {
          inTimestamp: true,
        },
      });

      // Check if all *other* pans have also been returned
      const allOthersReturned = otherShipments.every(
        (shipment) => shipment.inTimestamp !== null,
      );

      if (allOthersReturned) {
        // If all *other* pans are back, and *this* one is now back,
        // the entire delivery can be marked as RETURNED.
        await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status: DeliveryStatus.RETURNED,
          },
        });
      }

      return updatedShipment;
    });

    // If transaction is successful, return the result
    return NextResponse.json(updatedPanShipment, { status: 200 });
  } catch (error) {
    console.error('Error handling pan return:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    // Handle specific errors thrown from the transaction
    if (errorMessage === 'PanShipment not found') {
      return new NextResponse(errorMessage, { status: 404 });
    }
    if (errorMessage === 'Pan has already been returned') {
      return new NextResponse(errorMessage, { status: 409 }); // 409 Conflict
    }
    if (errorMessage.includes('tare weight not found')) {
      return new NextResponse(errorMessage, { status: 400 });
    }

    // Generic error
    return new NextResponse(errorMessage, { status: 500 });
  }
}