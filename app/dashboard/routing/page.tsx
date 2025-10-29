// PATH: app/dashboard/routing/page.tsx

// --- FIX: Add 'use client' ---
'use client';

import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader2';
import { RouteManager } from './components/RouteManager';

// --- FIX: Import QueryClient ---
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

// --- FIX: Create a client instance ---
const queryClient = new QueryClient();

export default function RoutingPage() {
  return (
    // --- FIX: Wrap content in QueryClientProvider ---
    <QueryClientProvider client={queryClient}>
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="Logistics & Routing" />
          <RouteManager />
        </Stack>
      </Container>
    </QueryClientProvider>
    // --- END FIX ---
  );
}