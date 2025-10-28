// PATH: app/dashboard/reports/components/SalesReport.tsx
// NOTE: This is a NEW FILE in a NEW FOLDER.

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
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { SalesReportResponse } from "@/app/api/reports/sales/route";
import { formatCurrency } from "@/lib/utils";

interface SalesReportProps {
  data: SalesReportResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// A simple stat card component
function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {title}
      </Text>
      <Text fz={32} fw={700}>
        {value}
      </Text>
    </Paper>
  );
}

export function SalesReport({
  data,
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

  if (!data) {
    return (
      <Center h={200}>
        <Text c="dimmed">
          Selecione um período para gerar o relatório.
        </Text>
      </Center>
    );
  }

  // Format data for display
  const totalRevenue = formatCurrency(parseFloat(data.totalRevenue));
  const totalOrders = data.totalOrders.toString();
  const totalItemsSold = data.totalItemsSold.toString();

  const productRows = data.topSellingProducts.map((product) => (
    <Table.Tr key={product.productId}>
      <Table.Td>{product.name}</Table.Td>
      <Table.Td>{product.quantity}</Table.Td>
      <Table.Td>
        {formatCurrency(parseFloat(product.revenue))}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="lg">
      {/* 1. Stat Grid */}
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <StatCard title="Receita Total" value={totalRevenue} />
        <StatCard title="Total de Pedidos" value={totalOrders} />
        <StatCard title="Itens Vendidos" value={totalItemsSold} />
      </SimpleGrid>

      {/* 2. Top Selling Products */}
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
              {productRows.length > 0 ? (
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
    </Stack>
  );
}