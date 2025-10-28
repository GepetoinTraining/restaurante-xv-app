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

