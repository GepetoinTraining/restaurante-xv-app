// PATH: app/dashboard/reports/page.tsx
'use client';

import { PageHeader } from "@/app/dashboard/components/PageHeader2";
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

// --- FIX: This is the component we will use for both tabs ---
import { SalesReport } from "./components/SalesReport";
// ----------------------------------------------------------------
import { SalesReportResponse } from "@/app/api/reports/sales/route";

// Import the correct FinancialReport type
import { ApiResponse, FinancialReport } from "@/lib/types";
// --- FIX: This component is no longer needed if SalesReport handles costs ---
// import { FinancialReportDisplay } from "../financials/components/FinancialReportDisplay";
// ----------------------------------------------------------------

// Create a client
const queryClient = new QueryClient();

function ReportsPageContent() {
  const [activeTab, setActiveTab] = useState<string | null>("sales");
  const [dateRange, setDateRange] = useState<[DateValue, DateValue]>([
    subDays(new Date(), 7),
    new Date(),
  ]);

  // --- FIX: Check if date is a Date object before calling toISOString ---
  const from = (dateRange[0] && dateRange[0] instanceof Date)
    ? dateRange[0].toISOString()
    : "";
  const to = (dateRange[1] && dateRange[1] instanceof Date)
    ? dateRange[1].toISOString()
    : "";
  // --- END FIX ---

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
  } = useQuery<ApiResponse<FinancialReport>>({
    queryKey: ['costReport', from, to],
    queryFn: () =>
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

  // --- FIX: These are now separate for each query ---
  // const isLoading = isLoadingSales || isLoadingCost;
  // const isError = isErrorSales || isErrorCost;
  // const error = salesError || costError;
  // --- END FIX ---

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

        {/* --- FIX: We can remove the outer LoadingOverlay/Alert --- */}
        {/* The SalesReport component handles its own loading/error state */}
        <Box pos="relative" pt="md">
          <Tabs.Panel value="sales">
            {/* --- FIX: Pass all required props to SalesReport --- */}
            <SalesReport
              salesData={salesReport}
              costData={undefined} // Don't pass cost data here
              isLoading={isLoadingSales}
              isError={isErrorSales}
              error={salesError as Error | null}
            />
            {/* --- END FIX --- */}
          </Tabs.Panel>

          <Tabs.Panel value="costs">
            {/* --- FIX: Use SalesReport component for costs too --- */}
            <SalesReport
              salesData={undefined} // Don't pass sales data here
              costData={costReport}
              isLoading={isLoadingCost}
              isError={isErrorCost}
              error={costError as Error | null}
            />
            {/* --- END FIX --- */}
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