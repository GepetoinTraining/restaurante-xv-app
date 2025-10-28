// PATH: app/dashboard/pan-return/page.tsx

import { Container, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader';
import { PanReturnInterface } from './components/PanReturnInterface';
import { DailyConsumptionTrigger } from './components/DailyConsumptionTrigger';

export default function PanReturnPage() {
  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Pan Return & Waste" />

        {/* --- Main Pan Return Interface --- */}
        <PanReturnInterface />

        {/* --- Daily Consumption Trigger --- */}
        <DailyConsumptionTrigger />
      </Stack>
    </Container>
  );
}