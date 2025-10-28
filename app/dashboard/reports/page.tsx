// PATH: app/dashboard/reports/page.tsx
// NOTE: Corrected onChange handler for DatePickerInput

"use client";

import { Container, Stack, Alert, Box } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
// ---- START FIX ----
// Import DatesRangeValue type
import { DatePickerInput, DatesRangeValue } from "@mantine/dates";
// ---- END FIX ----
import { useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import "dayjs/locale/pt-br"; // Import pt-br locale for dates
import { SalesReport } from "./components/SalesReport"; // New component
import { SalesReportResponse } from "@/app/api/reports/sales/route";
import { ApiResponse } from "@/lib/types";

// Create a client
const queryClient = new QueryClient();

// Helper to fetch report data
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
  throw new Error(data.error || "Failed to fetch report");
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
  // Default date range (e.g., last 7 days)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    new Date(), // Today
  ]);

  const [startDate, endDate] = dateRange;

  // useQuery for data fetching
  const { data, error, isLoading, isError, isFetching } =
    useQuery<SalesReportResponse>({
      queryKey: ["salesReport", dateRange],
      queryFn: () => fetchSalesReport(startDate!, endDate!),
      // Only run the query if both dates are set
      enabled: !!startDate && !!endDate,
    });

  // ---- START FIX ----
  // Define the handler function separately to convert string dates to Date objects
  const handleDateChange = (value: DatesRangeValue) => {
    const [start, end] = value;
    setDateRange([
        start ? new Date(start) : null,
        end ? new Date(end) : null
    ]);
  };
  // ---- END FIX ----


  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Relatórios" />
        <Alert
          variant="light"
          color="blue"
          title="Relatório de Vendas"
          icon={<IconAlertCircle />}
        >
          Selecione um período para gerar o relatório de vendas. Apenas pedidos
          com status "Entregue" ou "Pronto" são incluídos.
        </Alert>

        <Box w={{ base: "100%", md: 400 }}>
          <DatePickerInput
            type="range"
            label="Selecione o Período"
            placeholder="DD/MM/YYYY - DD/MM/YYYY"
            value={dateRange}
            // ---- START FIX ----
            // Use the new handler function
            onChange={handleDateChange}
            // ---- END FIX ----
            locale="pt-br"
            clearable
          />
        </Box>

        {/* Display Report, Loading, or Error */}
        <SalesReport
          data={data}
          isLoading={isLoading || isFetching}
          isError={isError}
          error={error as Error | null}
        />
      </Stack>
    </Container>
  );
}