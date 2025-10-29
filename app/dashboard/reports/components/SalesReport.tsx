// PATH: app/dashboard/reports/components/SalesReport.tsx
// MODIFIED to include cost data display

"use client";

import {
  Alert,
  SimpleGrid,
  Paper,
  Text,
  Title,
  Stack,
  Loader,
  Center,
  Table,
  Divider, // Import Divider
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { SalesReportResponse } from "@/app/api/reports/sales/route";
// --- FIX: Import FinancialReport from lib/types, not CostReportResponse ---
import { FinancialReport } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface SalesReportProps {
  salesData: SalesReportResponse | undefined;
  // --- FIX: Use FinancialReport type ---
  costData: FinancialReport | undefined; // Add cost data prop
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// Stat card component (unchanged)
function StatCard({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {title}
      </Text>
      <Text fz={32} fw={700} c={color}> {/* Apply color if provided */}
        {value}
      </Text>
    </Paper>
  );
}

export function SalesReport({
  salesData,
  costData, // Receive cost data
  isLoading,
  isError,
  error,
}: SalesReportProps) {
  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Alert
        color="red"
        title="Erro ao Gerar Relatório"
        icon={<IconAlertCircle />}
      >
        {error?.message || "Ocorreu um erro."}
      </Alert>
    );
  }

  // Handle case where only one report type might have loaded, or neither
  if (!salesData && !costData) {
    return (
      <Center h={200}>
        <Text c="dimmed">
          Selecione um período para gerar o relatório.
        </Text>
      </Center>
    );
  }

  // --- Format Sales Data (if available) ---
  const totalRevenue = salesData ? formatCurrency(parseFloat(salesData.totalRevenue)) : "N/A";
  const totalOrders = salesData ? salesData.totalOrders.toString() : "N/A";
  const totalItemsSold = salesData ? salesData.totalItemsSold.toString() : "N/A";

  const productRows = salesData?.topSellingProducts.map((product) => (
    <Table.Tr key={product.productId}>
      <Table.Td>{product.name}</Table.Td>
      <Table.Td>{product.quantity}</Table.Td>
      <Table.Td>
        {formatCurrency(parseFloat(product.revenue))}
      </Table.Td>
    </Table.Tr>
  ));

  // --- FIX: Format Cost Data using FinancialReport type ---
  const totalPurchaseCost = costData ? formatCurrency(costData.summary.totalPurchaseCosts) : "N/A";
  const totalWasteCost = costData ? formatCurrency(costData.summary.totalWasteCosts) : "N/A";
  // 'totalBuffetRevenue' and 'totalPrepCost' are not in FinancialReport, so we use what is available.


  return (
    <Stack gap="lg">
      {/* --- Sales Stats Grid --- */}
      {salesData && (
          <>
            <Title order={3} mt="md">Resumo de Vendas</Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <StatCard title="Receita Total (Vendas)" value={totalRevenue} color="green.4"/>
                <StatCard title="Total de Pedidos" value={totalOrders} />
                <StatCard title="Itens Vendidos (Pedidos)" value={totalItemsSold} />
            </SimpleGrid>
          </>
      )}


      {/* --- Cost Stats Grid --- */}
      {costData && (
          <>
             {/* --- FIX: Updated Title --- */}
             <Title order={3} mt="lg">Resumo de Custos</Title>
             {/* --- FIX: Updated SimpleGrid to show available data --- */}
             <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <StatCard title="Custo de Compras" value={totalPurchaseCost} color="orange.4"/>
                <StatCard title="Custo de Perdas (Total)" value={totalWasteCost} color="red.4"/>
             </SimpleGrid>
          </>
      )}

      {/* --- Divider --- */}
      {salesData && costData && <Divider my="lg" />}

      {/* --- Top Selling Products Table --- */}
      {salesData && (
        <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">
            Produtos Mais Vendidos (Top 10 por Quantidade)
            </Title>
            <Table.ScrollContainer minWidth={400}>
            <Table striped>
                <Table.Thead>
                <Table.Tr>
                    <Table.Th>Produto</Table.Th>
                    <Table.Th>Quantidade</Table.Th>
                    <Table.Th>Receita Gerada</Table.Th>
                </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                {productRows && productRows.length > 0 ? (
                    productRows
                ) : (
                    <Table.Tr>
                    <Table.Td colSpan={3}>
                        <Text c="dimmed" ta="center">
                        Nenhum produto vendido neste período.
                        </Text>
                    </Table.Td>
                    </Table.Tr>
                )}
                </Table.Tbody>
            </Table>
            </Table.ScrollContainer>
        </Paper>
      )}
    </Stack>
  );
}