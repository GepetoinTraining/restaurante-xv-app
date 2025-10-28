// PATH: app/api/djsessions/route.ts
// NOTE: This is a NEW FILE.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * GET /api/djsessions
 * Fetches the currently live DJ session
 */
export async function GET(req: NextRequest) {
  try {
    const liveSession = await prisma.dJSession.findFirst({
      where: {
        status: "LIVE",
      },
      include: {
        event: {
          include: {
            entertainer: true,
          },
        },
        tracksPlayed: {
          include: {
            vinylRecord: true,
          },
          orderBy: {
            playedAt: "desc",
          },
        },
      },
    });

    if (!liveSession) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nenhuma sessão ao vivo" },
        { status: 404 }
      );
    }
    
    // TODO: Serialize decimals on vinyl records if needed

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: liveSession },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching live session:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}


/**
 * POST /api/djsessions
 * Creates a new DJ Session ("Go Live")
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  if (
    !user?.isLoggedIn ||
    (user.role !== "MANAGER" && user.role !== "OWNER" && user.role !== "DJ")
  ) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID do Evento é obrigatório" },
        { status: 400 }
      );
    }
    
    // Check for any other live sessions
    const existingLive = await prisma.dJSession.findFirst({
        where: { status: "LIVE" }
    });
    
    if (existingLive) {
         return NextResponse.json<ApiResponse>(
          { success: false, error: "Já existe uma sessão ao vivo. Encerre-a primeiro." },
          { status: 409 }
        );
    }

    const newSession = await prisma.dJSession.create({
      data: {
        eventId: eventId,
        status: "LIVE",
        actualStartTime: new Date(),
      },
       include: {
        event: {
          include: {
            entertainer: true,
          },
        },
      }
    });

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: newSession },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error starting session:", error);
     if (error.code === "P2002") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Este evento já possui uma sessão." },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/djsessions
 * Ends a live DJ Session ("End Session")
 */
export async function PATCH(req: NextRequest) {
    // Auth check...
    
    try {
        const { sessionId } = await req.json();
        if (!sessionId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ID da Sessão é obrigatório" },
                { status: 400 }
            );
        }
        
        const endedSession = await prisma.dJSession.update({
            where: { id: sessionId, status: "LIVE" },
            data: {
                status: "FINISHED",
                actualEndTime: new Date()
            }
        });
        
         return NextResponse.json<ApiResponse<any>>(
          { success: true, data: endedSession },
          { status: 200 }
        );

    } catch(error: any) {
         console.error("Error ending session:", error);
         if (error.code === "P2025") {
             return NextResponse.json<ApiResponse>(
                { success: false, error: "Sessão ao vivo não encontrada" },
                { status: 404 }
            );
         }
         return NextResponse.json<ApiResponse>(
          { success: false, error: "Erro interno do servidor" },
          { status: 500 }
        );
    }
}