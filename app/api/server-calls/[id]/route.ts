// File: app/api/server-calls/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';
import { ServerCallStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

// Type definition for route parameters
type Params = {
  params: {
    id: string; // ID of the ServerCall
  };
};

// Zod schema for PATCH request validation
const serverCallUpdateSchema = z.object({
  status: z.nativeEnum(ServerCallStatus), // Must provide a new status
});

/**
 * PATCH /api/server-calls/[id]
 * Updates the status of a server call (e.g., PENDING -> ACKNOWLEDGED -> RESOLVED).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user?.isLoggedIn) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Não autorizado" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = params;

  try {
    const body = await request.json();
    const validation = serverCallUpdateSchema.safeParse(body);

    if (!validation.success) {
      // --- FIX: Serialize errors into 'error' string ---
      const errorDetails = validation.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
      return NextResponse.json<ApiResponse>({ success: false, error: `Dados inválidos: ${errorDetails}` }, { status: 400 });
      // -------------------------------------------------
    }

    const { status: newStatus } = validation.data;

    const currentCall = await prisma.serverCall.findUnique({
      where: { id },
    });

    if (!currentCall) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Chamada não encontrada." }, { status: 404 });
    }

    const updateData: Prisma.ServerCallUpdateInput = { status: newStatus };
    let isValidTransition = false;

    if (newStatus === ServerCallStatus.ACKNOWLEDGED && currentCall.status === ServerCallStatus.PENDING) {
      updateData.acknowledgedById = userId;
      updateData.acknowledgedAt = new Date();
      isValidTransition = true;
    } else if (newStatus === ServerCallStatus.RESOLVED && currentCall.status === ServerCallStatus.ACKNOWLEDGED) {
      updateData.resolvedById = userId;
      updateData.resolvedAt = new Date();
      isValidTransition = true;
    } else if (newStatus === ServerCallStatus.CANCELLED && (currentCall.status === ServerCallStatus.PENDING || currentCall.status === ServerCallStatus.ACKNOWLEDGED)) {
      isValidTransition = true;
    }

    if (!isValidTransition) {
       return NextResponse.json<ApiResponse>({ success: false, error: `Transição de status inválida de ${currentCall.status} para ${newStatus}` }, { status: 400 });
    }


    const updatedCall = await prisma.serverCall.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json<ApiResponse<any>>({ success: true, data: updatedCall });

  } catch (error: any) {
    console.error(`Error updating server call ${id}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return NextResponse.json<ApiResponse>({ success: false, error: "Chamada ou usuário relacionado não encontrado." }, { status: 404 });
     }
    return NextResponse.json<ApiResponse>({ success: false, error: `Erro interno do servidor: ${error.message}` }, { status: 500 });
  }
}