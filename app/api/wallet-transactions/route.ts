// PATH: app/api/wallet-transactions/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import {
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  Prisma, // Import Prisma
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getSession } from "@/lib/auth";

/**
 * POST /api/wallet-transactions
 * Creates a new wallet transaction (e.g., a staff-initiated top-up)
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  if (!user?.isLoggedIn || (user.role !== "CASHIER" && user.role !== "MANAGER" && user.role !== "OWNER")) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Não autorizado: Apenas Caixa, Gerente ou Dono" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { clientId, amount, type, status, proofOfPay } = body;

    if (!clientId || !amount || !type || !status) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "ID do Cliente, Valor, Tipo e Status são obrigatórios",
        },
        { status: 400 }
      );
    }

    let amountDecimal: Decimal;
    try {
      amountDecimal = new Decimal(amount);
      if (amountDecimal.isZero()) {
         return NextResponse.json<ApiResponse>(
          { success: false, error: "Valor não pode ser zero" },
          { status: 400 }
        );
      }
    } catch (e) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Formato de valor inválido" },
        { status: 400 }
      );
    }
    
    if (type === TransactionType.SPEND && amountDecimal.isPositive()) {
        amountDecimal = amountDecimal.negated();
    }
    if (type === TransactionType.TOP_UP && amountDecimal.isNegative()) {
       return NextResponse.json<ApiResponse>(
          { success: false, error: "Top-up deve ser um valor positivo" },
          { status: 400 }
        );
    }

    // --- Transaction logic ---
    const [newTransaction] = await prisma.$transaction(async (tx) => {
      // 1. Find or create the client's wallet
      let wallet = await tx.clientWallet.findUnique({
        where: { clientId: clientId },
      });

      if (!wallet) {
        const client = await tx.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new Error("Cliente não encontrado.");
        }
        wallet = await tx.clientWallet.create({
          data: {
            clientId: clientId,
            balance: new Decimal(0),
          },
        });
      }

      // 2. Create the transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          clientId: clientId,
          amount: amountDecimal,
          type: type as TransactionType,
          status: status as TransactionStatus,
          proofOfPay: proofOfPay || null,
          // ---- START FIX ----
          // Use the scalar foreign key field 'approvedById'
          approvedById:
            status === TransactionStatus.COMPLETED ? user.id : null,
          // Also set 'approvedAt' as defined in the schema
          approvedAt:
            status === TransactionStatus.COMPLETED ? new Date() : null,
          // ---- END FIX ----
        },
      });

      // 3. If the transaction is COMPLETED, update the wallet balance
      if (status === TransactionStatus.COMPLETED) {
        await tx.clientWallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: amountDecimal,
            },
          },
        });
      }
      
      return [transaction];
    });

    // Serialize the response
    const serializedTransaction = {
      ...newTransaction,
      amount: newTransaction.amount.toString(),
      // approvedById and approvedAt are fine as-is
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedTransaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating wallet transaction:", error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025' || error.message.includes("Cliente não encontrado")) { 
            return NextResponse.json<ApiResponse>({ success: false, error: "Cliente não encontrado." }, { status: 404 });
        }
     }
     if (error.message.includes("Cliente não encontrado")) {
         return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: 404 });
     }
    return NextResponse.json<ApiResponse>(
      { success: false, error: `Erro interno do servidor: ${error.message}` },
      { status: 500 }
    );
  }
}