// PATH: app/dashboard/financials/components/FinancialReportDisplay.tsx

'use client';

import {
  Title,
  Stack,
  Paper,
  LoadingOverlay,
  Alert,
  Group,
  Text,
  Grid,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios'; // Import AxiosError
import { useState } from 'react';
import { DatePickerInput, DateValue } from '@mantine/dates';
import { toUTC } from '@/lib/utils';
// --- START FIX: Import ApiResponse and the correct report type ---
import { ApiResponse, FinancialReport } from '@/lib/types';
// --- END FIX ---
import { StatCard } from '@/components/StatCard'; // Reusing your StatCard

// Helper to format currency
const formatCurrency = (value: number) => {
  return `R$ ${value.toFixed(2)}`;
};

// --- START FIX: Define error response type ---
type ErrorResponse = {
  error: string;
};
// --- END FIX ---

export function FinancialReportDisplay() {
  const [dateRange, setDateRange] = useState<[DateValue, DateValue]>([
    new Date(new Date().setDate(new Date().getDate() - 30)),
    new Date(),
  ]);

  // --- START FIX: Cast DateValue (Date | null) to Date after null check ---
  // The ternary handles the 'null' case, so we can safely cast the non-null
  const startDate = dateRange[0] ? toUTC(dateRange[0] as Date).toISOString().split('T')[0] : '';
  const endDate = dateRange[1] ? toUTC(dateRange[1] as Date).toISOString().split('T')[0] : '';
  // --- END FIX ---

  // 1. Fetch Financial Report
  const {
    data: report,
    isLoading,
    isError,
    error,
    isFetching,
    // --- START FIX: Type the hook for better error handling ---
  } = useQuery<ApiResponse<FinancialReport>, AxiosError<ErrorResponse>>({
    // --- END FIX ---
    queryKey: ['financialReport', startDate, endDate],
    queryFn: () =>
      axios
        .get(`/api/reports/financial?startDate=${startDate}&endDate=${endDate}`)
        // --- START FIX: Handle ApiResponse wrapper ---
        .then((res) => {
          if (!res.data.success) {
            throw new Error(res.data.error || 'Failed to fetch report');
          }
          return res.data;
        }),
    // --- END FIX ---
    enabled: !!startDate && !!endDate, // Only fetch if dates are set
  });

  return (
    <Paper shadow="md" p="lg" withBorder>
      <Stack>
        <Group justify="space-between" mb="md">
          <Title order={3}>Financial Report</Title>
          <DatePickerInput
            type="range"
            label="Select Date Range"
            placeholder="Pick dates range"
            value={dateRange}
            onChange={setDateRange}
            maw={300}
          />
        </Group>

        <Paper p="md" withBorder pos="relative" radius="md">
          <LoadingOverlay visible={isLoading || isFetching} />
          {isError && (
            <Alert color="red" title="Error">
              {error.response?.data?.error || error.message || 'Failed to fetch financial report'}
            </Alert>
          )}

          {/* --- START FIX: Access data from ApiResponse --- */}
          {report && report.data && (
          // --- END FIX ---
            <Grid>
              {/* --- START FIX: Updated StatCard implementation --- */}
              <Grid.Col span={4}>
                <StatCard
                  title="Total Costs"
                  value={formatCurrency(report.data.summary.totalCosts)}
                  icon="dollars" // Pass required icon prop
                />
                <Text size="xs" c="dimmed" mt={-5}>
                  Purchases + Total Waste
                </Text>
              </Grid.Col>
              <Grid.Col span={4}>
                <StatCard
                  title="Total Purchase Costs"
                  value={formatCurrency(report.data.summary.totalPurchaseCosts)}
                  icon="dollars" // Pass required icon prop
                />
                <Text size="xs" c="dimmed" mt={-5}>
                  From received POs
                </Text>
              </Grid.Col>
              <Grid.Col span={4}>
                <StatCard
                  title="Total Waste Costs"
                  value={formatCurrency(report.data.summary.totalWasteCosts)}
                  icon="dollars" // Pass required icon prop
                />
                <Text size="xs" c="dimmed" mt={-5}>
                  Client Returns + Internal
                </Text>
              </Grid.Col>
              {/* --- END FIX --- */}
            </Grid>
          )}
        </Paper>
      </Stack>
    </Paper>
  );
}