// PATH: app/dashboard/routing/page.tsx
'use client';

import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader';
import { RouteManager } from './components/RouteManager';

export default function RoutingPage() {
  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Logistics & Routing" />
        <RouteManager />
      </Stack>
    </Container>
  );
}