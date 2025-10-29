// PATH: app/dashboard/financials/page.tsx

// --- FIX: Add 'use client' ---
'use client';

import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader';
import { PurchaseOrderReceiving } from './components/PurchaseOrderReceiving';
import { FinancialReportDisplay } from './components/FinancialReportDisplay';

// --- FIX: Import QueryClient ---
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

// --- FIX: Create a client instance ---
const queryClient = new QueryClient();

export default function FinancialsPage() {
  return (
    // --- FIX: Wrap content in QueryClientProvider ---
    <QueryClientProvider client={queryClient}>
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="Financials & Purchasing" />

          {/* --- Report Display --- */}
          <FinancialReportDisplay />

          {/* --- PO Receiving --- */}
          <PurchaseOrderReceiving />
        </Stack>
      </Container>
    </QueryClientProvider>
    // --- END FIX ---
  );
}