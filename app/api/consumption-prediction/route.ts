// PATH: app/api/consumption-prediction/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { toUTC } from '@/lib/utils';
import { Decimal } from '@prisma/client/runtime/library';

// Schema to validate the incoming request body
const predictionBodySchema = z.object({
  recordDate: z.string().datetime(), // Expecting an ISO string date
  companyClientId: z.string().cuid(),
});

// Helper: Defines a simple weather-based adjustment factor
function getWeatherAdjustment(condition: string, tempC: number): number {
  let adjustment = 1.0;

  // Rule 1: Cold/Rainy weather increases consumption
  if (tempC < 18 || condition === 'Rain' || condition === 'Drizzle') {
    adjustment = 1.1; // 10% increase
  }

  // Rule 2: Extremely hot weather might decrease consumption (e.g., less appetite)
  if (tempC > 30) {
    adjustment = 0.95; // 5% decrease
  }

  // This is our V1 "magic formula"
  return adjustment;
}

/**
 * POST /api/consumption-prediction
 *
 * Generates a V1 consumption prediction for a specific client and date,
 * fetches weather data, and saves it to the DailyConsumptionRecord.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = predictionBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { companyClientId } = validation.data;
    const recordDate = toUTC(new Date(validation.data.recordDate));

    // 1. Get CompanyClient data
    const client = await prisma.companyClient.findUnique({
      where: { id: companyClientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'CompanyClient not found' },
        { status: 404 },
      );
    }

    if (!client.employeeCount) {
      return NextResponse.json(
        { error: 'Client is missing employeeCount' },
        { status: 409 },
      );
    }

    if (!client.addressZipCode) {
      return NextResponse.json(
        { error: 'Client is missing addressZipCode for weather' },
        { status: 409 },
      );
    }

    // 2. Fetch weather data from our *own* API route
    // We need the full URL for the server-side fetch
    const host = req.headers.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const weatherApiUrl = `${protocol}://${host}/api/weather?zipCode=${client.addressZipCode}`;

    const weatherResponse = await fetch(weatherApiUrl);
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data from internal API');
    }
    const weatherData: { weatherCondition: string; temperatureC: number } =
      await weatherResponse.json();

    // 3. Calculate V1 Prediction
    // Base = (Employee Count * Base Consumption Factor)
    const baseConsumption =
      client.employeeCount * (client.consumptionFactor || 1.0);

    // Weather Adjustment
    const weatherAdjustment = getWeatherAdjustment(
      weatherData.weatherCondition,
      weatherData.temperatureC,
    );

    // Final Prediction
    const predictedKg = baseConsumption * weatherAdjustment;
    const predictedConsumptionKg = new Decimal(predictedKg);

    // 4. Upsert (Create or Update) the DailyConsumptionRecord
    const record = await prisma.dailyConsumptionRecord.upsert({
      where: {
        recordDate_companyClientId: {
          recordDate: recordDate,
          companyClientId: companyClientId,
        },
      },
      create: {
        recordDate: recordDate,
        companyClientId: companyClientId,
        weatherCondition: weatherData.weatherCondition,
        temperatureC: weatherData.temperatureC,
        predictedConsumptionKg: predictedConsumptionKg,
      },
      update: {
        weatherCondition: weatherData.weatherCondition,
        temperatureC: weatherData.temperatureC,
        predictedConsumptionKg: predictedConsumptionKg,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Failed to generate consumption prediction:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}