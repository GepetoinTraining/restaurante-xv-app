// PATH: app/api/wallet-transactions/route.ts
// NOTE: This is a NEW FILE.

import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import {
  WalletTransaction,
  TransactionType,
  TransactionStatus,
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
    
    // For SPEND, amount should be negative
    if (type === TransactionType.SPEND && amountDecimal.isPositive()) {
        amountDecimal = amountDecimal.negated();
    }
     // For TOP_UP, amount should be positive
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
          clientId: clientId, // Also link to client
          amount: amountDecimal,
          type: type as TransactionType,
          status: status as TransactionStatus,
          proofOfPay: proofOfPay || null,
          approvedBy:
            status === TransactionStatus.COMPLETED ? user.id : null,
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

    const serializedTransaction = {
      ...newTransaction,
      amount: newTransaction.amount.toString(),
    };

    return NextResponse.json<ApiResponse<any>>(
      { success: true, data: serializedTransaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating wallet transaction:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}