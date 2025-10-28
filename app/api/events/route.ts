// PATH: app/api/events/route.ts
// NOTE: This is a NEW FILE.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * GET /api/events
 * Fetches all scheduled events, including the entertainer
 */
export async function GET(req: NextRequest) {
  try {
    const events = await prisma.scheduledEvent.findMany({
      include: {
        entertainer: true,
      },
      orderBy: {
        startTime: "desc",
      },
    });

    // Serialize Decimal fields on entertainer
    const serializedEvents = events.map((event) => ({
      ...event,
      entertainer: {
        ...event.entertainer,
        rate: event.entertainer.rate?.toString() || null,
      },
    }));

    return NextResponse.json<ApiResponse<any[]>>(
      { success: true, data: serializedEvents },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Creates a new scheduled event
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  if (
    !user?.isLoggedIn ||
    (user.role !== "MANAGER" && user.role !== "OWNER")
  ) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { entertainerId, startTime, endTime } = body;

    if (!entertainerId || !startTime || !endTime) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Artista, Início e Fim são obrigatórios" },
        { status: 400 }
      );
    }

    const newEvent = await prisma.scheduledEvent.create({
      data: {
        entertainerId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: newEvent },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating event:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}