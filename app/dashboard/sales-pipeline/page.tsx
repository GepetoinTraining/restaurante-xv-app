// PATH: app/dashboard/sales-pipeline/page.tsx

// --- FIX: Add 'use client' ---
'use client';

import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader2';
import { SalesPipelineBoard } from './components/SalesPipelineBoard';

// --- FIX: Import QueryClient ---
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

// --- FIX: Create a client instance ---
const queryClient = new QueryClient();

export default function SalesPipelinePage() {
  return (
    // --- FIX: Wrap content in QueryClientProvider ---
    <QueryClientProvider client={queryClient}>
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="Sales Pipeline" />
          <SalesPipelineBoard />
        </Stack>
      </Container>
    </QueryClientProvider>
    // --- END FIX ---
  );
}