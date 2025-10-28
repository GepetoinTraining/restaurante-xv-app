// PATH: app/dashboard/dj/page.tsx
// NOTE: This is a NEW FILE in a NEW FOLDER.

"use client";

import { Container, Stack, Tabs } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { IconMusic, IconCalendarTime } from "@tabler/icons-react";
import { ScheduleManager } from "./components/ScheduleManager";
import { LiveSessionManager } from "./components/LiveSessionManager";

// Create a client
const queryClient = new QueryClient();

// Main component wrapped in QueryClientProvider
export default function DjPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <DjPage />
    </QueryClientProvider>
  );
}

// The actual page content
function DjPage() {
  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Eventos & DJ" />

        <Tabs defaultValue="live">
          <Tabs.List>
            <Tabs.Tab value="live" leftSection={<IconMusic size={14} />}>
              Sessão Ao Vivo
            </Tabs.Tab>
            <Tabs.Tab
              value="schedule"
              leftSection={<IconCalendarTime size={14} />}
            >
              Agenda
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="live" pt="xs">
            <LiveSessionManager />
          </Tabs.Panel>

          <Tabs.Panel value="schedule" pt="xs">
            <ScheduleManager />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}