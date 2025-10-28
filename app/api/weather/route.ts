// PATH: app/api/weather/route.ts

import { NextResponse } from 'next/server';

/**
 * GET /api/weather
 *
 * Fetches weather forecast data from an external API (e.g., OpenWeatherMap).
 * This route is used to securely fetch data using a server-side API key.
 *
 * Query Params:
 * - ?lat={latitude}&lon={longitude} (Priority)
 * OR
 * - ?zipCode={zipCode} (Used if lat/lon are not provided)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const zipCode = searchParams.get('zipCode');

  const API_KEY = process.env.WEATHER_API_KEY;
  if (!API_KEY) {
    console.error('WEATHER_API_KEY is not set in .env');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 },
    );
  }

  let queryParam = '';
  if (lat && lon) {
    queryParam = `lat=${lat}&lon=${lon}`;
  } else if (zipCode) {
    // Assuming 'br' for Brazil, adjust if needed
    queryParam = `zip=${zipCode},br`;
  } else {
    return NextResponse.json(
      { error: 'Latitude/Longitude or Zip Code is required' },
      { status: 400 },
    );
  }

  // Example URL for OpenWeatherMap 5-day/3-hour forecast.
  const WEATHER_URL = `https://api.openweathermap.org/data/2.5/forecast?${queryParam}&appid=${API_KEY}&units=metric`;

  try {
    const response = await fetch(WEATHER_URL);

    if (!response.ok) {
      console.error('Failed to fetch weather data:', response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: response.status },
      );
    }

    const data = await response.json();

    // --- Data Parsing (Example for OpenWeatherMap Forecast) ---
    // Let's find the forecast for tomorrow around 12:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    const noonForecast = data.list?.find((item: any) => {
      return (
        item.dt_txt.startsWith(tomorrowDateStr) &&
        item.dt_txt.endsWith('12:00:00')
      );
    });

    // Fallback to the first available forecast if noon isn't found
    const forecast = noonForecast || data.list?.[0];

    if (!forecast) {
      return NextResponse.json(
        { error: 'No forecast data found in response' },
        { status: 404 },
      );
    }

    const simplifiedData = {
      weatherCondition: forecast.weather[0]?.main || 'Unknown', // e.g., "Rain", "Clouds"
      temperatureC: forecast.main?.temp || 0, // e.g., 25.4
      forecastTime: forecast.dt_txt,
    };
    // --- End Data Parsing ---

    return NextResponse.json(simplifiedData);
  } catch (error) {
    console.error('Error in weather API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}