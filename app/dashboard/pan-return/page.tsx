// PATH: app/dashboard/pan-return/page.tsx

// --- FIX: Add 'use client' ---
'use client';

import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader';
import { PanReturnInterface } from './components/PanReturnInterface';
import { DailyConsumptionTrigger } from './components/DailyConsumptionTrigger';

// --- FIX: Import QueryClient ---
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

// --- FIX: Create a client instance ---
const queryClient = new QueryClient();

export default function PanReturnPage() {
  return (
    // --- FIX: Wrap content in QueryClientProvider ---
    <QueryClientProvider client={queryClient}>
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="Pan Return & Waste" />

          {/* --- Main Pan Return Interface --- */}
          <PanReturnInterface />

          {/* --- Daily Consumption Trigger --- */}
          <DailyConsumptionTrigger />
        </Stack>
      </Container>
    </QueryClientProvider>
    // --- END FIX ---
  );
}