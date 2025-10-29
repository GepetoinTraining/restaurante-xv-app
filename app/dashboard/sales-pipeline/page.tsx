// PATH: app/dashboard/sales-pipeline/page.tsx
'use client';
import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader';
import { SalesPipelineBoard } from './components/SalesPipelineBoard';

export default function SalesPipelinePage() {
  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Sales Pipeline" />
        <SalesPipelineBoard />
      </Stack>
    </Container>
  );
}