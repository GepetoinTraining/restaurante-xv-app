// PATH: app/dashboard/floorplan/page.tsx
// NOTE: This is a NEW FILE in a NEW FOLDER.

import { Container, Stack } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { FloorPlanManager } from "./components/FloorPlanManager"; // Main client component

export default function FloorPlanPage() {
  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Plantas e Mesas" />
        <FloorPlanManager />
      </Stack>
    </Container>
  );
}