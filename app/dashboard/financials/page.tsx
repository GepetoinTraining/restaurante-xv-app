// PATH: app/dashboard/financials/page.tsx

import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader';
import { PurchaseOrderReceiving } from './components/PurchaseOrderReceiving';
import { FinancialReportDisplay } from './components/FinancialReportDisplay';

export default function FinancialsPage() {
  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Financials & Purchasing" />

        {/* --- Report Display --- */}
        <FinancialReportDisplay />

        {/* --- PO Receiving --- */}
        <PurchaseOrderReceiving />
      </Stack>
    </Container>
  );
}