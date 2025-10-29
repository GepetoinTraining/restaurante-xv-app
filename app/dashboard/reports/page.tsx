// PATH: app/dashboard/reports/page.tsx
"use client";

import { Container, Stack, Alert, Box, Text } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { DatePickerInput, DatesRangeValue } from "@mantine/dates";
import { useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import "dayjs/locale/pt-br";
import { SalesReport } from "./components/SalesReport";
// Import the new cost report type
import { SalesReportResponse } from "@/app/api/reports/sales/route";
import { CostReportResponse } from "../../../app/api/reports/costs/route"; // <-- Import Cost Report type
import { ApiResponse } from "@/lib/types";

// Create a client
const queryClient = new QueryClient();

// Helper to fetch sales report data
const fetchSalesReport = async (
  startDate: Date,
  endDate: Date
): Promise<SalesReportResponse> => {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  const response = await fetch(`/api/reports/sales?${params.toString()}`);
  const data: ApiResponse<SalesReportResponse> = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || "Failed to fetch sales report");
};

// Helper to fetch cost report data
const fetchCostReport = async (
  startDate: Date,
  endDate: Date
): Promise<CostReportResponse> => {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  // Use the new endpoint
  const response = await fetch(`/api/reports/costs?${params.toString()}`);
  const data: ApiResponse<CostReportResponse> = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || "Failed to fetch cost report");
};


// Main component wrapped in QueryClientProvider
export default function ReportsPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReportsPage />
    </QueryClientProvider>
  );
}

// The actual page content
function ReportsPage() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    new Date(), // Today
  ]);

  const [startDate, endDate] = dateRange;

  // --- useQuery for Sales Data ---
  const {
      data: salesData,
      error: salesError,
      isLoading: isLoadingSales,
      isError: isSalesError,
      isFetching: isFetchingSales
    } = useQuery<SalesReportResponse>({
      queryKey: ["salesReport", dateRange],
      queryFn: () => fetchSalesReport(startDate!, endDate!),
      enabled: !!startDate && !!endDate,
    });

  // --- useQuery for Cost Data ---
  const {
      data: costData,
      error: costError,
      isLoading: isLoadingCosts,
      isError: isCostsError,
      isFetching: isFetchingCosts
    } = useQuery<CostReportResponse>({
      // Use a different query key for costs
      queryKey: ["costReport", dateRange],
      queryFn: () => fetchCostReport(startDate!, endDate!),
      enabled: !!startDate && !!endDate,
    });

  const handleDateChange = (value: DatesRangeValue) => {
    const [start, end] = value;
    setDateRange([
        start ? new Date(start) : null,
        end ? new Date(end) : null
    ]);
  };

  // Combine loading and error states
  const isLoading = isLoadingSales || isLoadingCosts || isFetchingSales || isFetchingCosts;
  const isError = isSalesError || isCostsError;
  const error = salesError || costError;


  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Relatórios" />
        <Alert
          variant="light"
          color="blue"
          title="Relatórios de Vendas e Custos"
          icon={<IconAlertCircle />}
        >
          Selecione um período para gerar os relatórios. Vendas incluem apenas pedidos
          com status "Entregue" ou "Pronto". Custos são calculados com base em preparos concluídos, perdas registradas e pratos de buffet pesados.
        </Alert>

        <Box w={{ base: "100%", md: 400 }}>
          <DatePickerInput
            type="range"
            label="Selecione o Período"
            placeholder="DD/MM/YYYY - DD/MM/YYYY"
            value={dateRange}
            onChange={handleDateChange}
            locale="pt-br"
            clearable
          />
        </Box>

        {/* Display Report, Loading, or Error */}
        {/* Pass both sales and cost data to the component */}
        <SalesReport
          salesData={salesData}
          costData={costData} // Pass cost data
          isLoading={isLoading}
          isError={isError}
          error={error as Error | null}
        />
      </Stack>
    </Container>
  );
}