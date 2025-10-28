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
import axios from 'axios';
import { useState } from 'react';
import { DatePickerInput, DateValue } from '@mantine/dates';
import { toUTC } from '@/lib/utils';
import { FinancialReport } from '@/lib/types';
import { StatCard } from '@/components/StatCard'; // Reusing your StatCard

// Helper to format currency
const formatCurrency = (value: number) => {
  return `R$ ${value.toFixed(2)}`;
};

export function FinancialReportDisplay() {
  const [dateRange, setDateRange] = useState<[DateValue, DateValue]>([
    new Date(new Date().setDate(new Date().getDate() - 30)),
    new Date(),
  ]);

  const startDate = dateRange[0] ? toUTC(dateRange[0]).toISOString().split('T')[0] : '';
  const endDate = dateRange[1] ? toUTC(dateRange[1]).toISOString().split('T')[0] : '';

  // 1. Fetch Financial Report
  const {
    data: report,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<FinancialReport>({
    queryKey: ['financialReport', startDate, endDate],
    queryFn: () =>
      axios
        .get(`/api/reports/financial?startDate=${startDate}&endDate=${endDate}`)
        .then((res) => res.data),
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
              {error?.message || 'Failed to fetch financial report'}
            </Alert>
          )}

          {report && (
            <Grid>
              <Grid.Col span={4}>
                <StatCard
                  title="Total Costs"
                  value={formatCurrency(report.summary.totalCosts)}
                  description="Purchases + Total Waste"
                  color="red"
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <StatCard
                  title="Total Purchase Costs"
                  value={formatCurrency(report.summary.totalPurchaseCosts)}
                  description="From received POs"
                  color="blue"
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <StatCard
                  title="Total Waste Costs"
                  value={formatCurrency(report.summary.totalWasteCosts)}
                  description="Client Returns + Internal"
                  color="orange"
                />
              </Grid.Col>
            </Grid>
          )}
        </Paper>
      </Stack>
    </Paper>
  );
}