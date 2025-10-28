// PATH: lib/utils.ts
import { PrepTaskStatus } from "@prisma/client";
import { NextResponse } from 'next/server';

/**
 * Formats a number as BRL (Brazilian Reais) currency.
 * @param amount The number to format
 * @returns A string like "R$ 1.234,56"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

// ---- START FIX: Added missing function ----

/**
 * Gets a display label and color for a task status.
 * @param status The status (e.g., PrepTaskStatus)
 * @returns An object with { label: string, color: string }
 */
export function getStatusInfo(status: PrepTaskStatus | 'default') {
  switch (status) {
    case PrepTaskStatus.PENDING:
      return { label: 'Pendente', color: 'gray' };
    case PrepTaskStatus.ASSIGNED:
      return { label: 'Atribuída', color: 'blue' };
    case PrepTaskStatus.IN_PROGRESS:
      return { label: 'Em Progresso', color: 'yellow' };
    case PrepTaskStatus.COMPLETED:
      return { label: 'Concluída', color: 'green' };
    case PrepTaskStatus.CANCELLED:
      return { label: 'Cancelada', color: 'red' };
    case PrepTaskStatus.PROBLEM:
      return { label: 'Problema', color: 'orange' };
    default:
      return { label: status.toUpperCase(), color: 'dark' };
  }
}

export function toUTC(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function handleApiError(error: unknown, message: string) {
  console.error(message, error);

  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

  return NextResponse.json(
    { error: message, details: errorMessage },
    { status: 500 }
  );
}