// PATH: app/dashboard/reports/page.tsx
'use client';

import { PageHeader } from "@/app/dashboard/components/PageHeader";
import {
  Alert,
  Box,
  LoadingOverlay,
  Paper,
  SegmentedControl,
  Tabs,
  Title,
  Text,
} from "@mantine/core";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { DatePickerInput, DateValue } from "@mantine/dates";
import { useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import { subDays } from "date-fns";
import { SalesReport } from "./components/SalesReport";
// Import the sales report type
import { SalesReportResponse } from "@/app/api/reports/sales/route";

// --- FIX: Remove incorrect import for CostReportResponse ---
// import { CostReportResponse } from "@/app/api/reports/costs/route";
import { ApiResponse, FinancialReport } from "@/lib/types"; // FinancialReport is the correct type
import { FinancialReportDisplay } from "../financials/components/FinancialReportDisplay";
// ----------------------------------------------------------------

// Create a client
const queryClient = new QueryClient();

function ReportsPageContent() {
  const [activeTab, setActiveTab] = useState<string | null>("sales");
  const [dateRange, setDateRange] = useState<[DateValue, DateValue]>([
    subDays(new Date(), 7),
    new Date(),
  ]);

  const from = dateRange[0]?.toISOString() || "";
  const to = dateRange[1]?.toISOString() || "";

  // Query for Sales Report
  const {
    data: salesReportData,
    isLoading: isLoadingSales,
    isError: isErrorSales,
    error: salesError,
    refetch: refetchSalesReport,
  } = useQuery<ApiResponse<SalesReportResponse>>({
    queryKey: ['salesReport', from, to],
    queryFn: () =>
      fetch(`/api/reports/sales?from=${from}&to=${to}`)
        .then((res) => res.json()),
    enabled: !!(from && to && activeTab === 'sales'), // Only fetch if tab is active
  });

  // Query for Cost Report
  const {
    data: costReportData,
    isLoading: isLoadingCost,
    isError: isErrorCost,
    error: costError,
    refetch: refetchCostReport,
    // --- FIX: Use the correct FinancialReport type ---
  } = useQuery<ApiResponse<FinancialReport>>({
    queryKey: ['costReport', from, to],
    queryFn: () =>
      // --- FIX: Use the correct API route ---
      fetch(`/api/reports/costs?from=${from}&to=${to}`)
        .then((res) => res.json()),
    enabled: !!(from && to && activeTab === 'costs'), // Only fetch if tab is active
  });

  const handleDateChange = (range: [DateValue, DateValue]) => {
    setDateRange(range);
    // Refetch active tab's data
    if (activeTab === 'sales') {
      refetchSalesReport();
    } else if (activeTab === 'costs') {
      refetchCostReport();
    }
  };

  const isLoading = isLoadingSales || isLoadingCost;
  const isError = isErrorSales || isErrorCost;
  const error = salesError || costError;

  // --- FIX: Use the correct FinancialReport type ---
  const salesReport: SalesReportResponse | undefined = salesReportData?.data;
  const costReport: FinancialReport | undefined = costReportData?.data;

  return (
    <>
      <PageHeader
        title="Relatórios"
        actionButton={
          <DatePickerInput
            type="range"
            label="Período"
            placeholder="Selecione o período"
            value={dateRange}
            onChange={handleDateChange}
            maw={300}
            clearable={false}
          />
        }
      />

      <Tabs value={activeTab} onChange={setActiveTab} mt="md">
        <Tabs.List>
          <Tabs.Tab value="sales">Relatório de Vendas</Tabs.Tab>
          <Tabs.Tab value="costs">Relatório de Custos</Tabs.Tab>
        </Tabs.List>

        <Box pos="relative" pt="md">
          <LoadingOverlay
            visible={isLoading}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
          />

          {isError && (
            <Alert
              color="red"
              title="Erro ao carregar relatório"
              icon={<IconAlertCircle />}
            >
              {(error as Error)?.message ||
                "Não foi possível carregar os dados do relatório."}
            </Alert>
          )}

          <Tabs.Panel value="sales">
            {salesReport && !isLoading && !isError && (
              <SalesReport data={salesReport} />
            )}
            {!salesReport && !isLoading && !isError && (
              <Text c="dimmed">Nenhum dado de vendas para este período.</Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="costs">
            {/* --- FIX: Cast is no longer needed --- */}
            {costReport && !isLoading && !isError && (
              <FinancialReportDisplay report={costReport} />
            )}
            {!costReport && !isLoading && !isError && (
              <Text c="dimmed">Nenhum dado de custos para este período.</Text>
            )}
          </Tabs.Panel>
        </Box>
      </Tabs>
    </>
  );
}

export default function ReportsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReportsPageContent />
    </QueryClientProvider>
  );
}