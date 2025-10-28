// PATH: app/dashboard/sales-pipeline/components/SalesPipelineColumn.tsx

'use client';

import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { SalesPipelineClient } from '@/lib/types';
import { SalesPipelineCard } from './SalesPipelineCard';
// --- DND Imports ---
import { useDroppable } from '@dnd-kit/core';
// -------------------

type SalesPipelineColumnProps = {
  title: string;
  stageId: string;
  clients: SalesPipelineClient[];
};

export function SalesPipelineColumn({
  title,
  stageId,
  clients,
}: SalesPipelineColumnProps) {
  // --- DND Hook ---
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stageId}`,
    data: {
      type: 'COLUMN',
      stageId: stageId,
    },
  });
  // ----------------

  const dropzoneStyle = {
    backgroundColor: isOver
      ? 'var(--mantine-color-green-light)'
      : 'var(--mantine-color-gray-0)',
    border: isOver
      ? '2px dashed var(--mantine-color-green-filled)'
      : '1px solid var(--mantine-color-gray-3)',
    transition: 'background-color 0.2s ease, border 0.2s ease',
  };

  return (
    <Paper
      ref={setNodeRef} // Attach ref
      shadow="sm"
      p="md"
      withBorder
      style={{
        ...dropzoneStyle,
        width: 300,
        flexShrink: 0,
      }}
    >
      <Stack>
        <Group justify="space-between">
          <Title order={4}>{title}</Title>
          <Text c="dimmed" size="sm">
            ({clients.length})
          </Text>
        </Group>

        <Stack gap="sm">
          {clients.length === 0 && (
            <Text c="dimmed" size="xs" ta="center" pt="xl">
              Drag clients here
            </Text>
          )}
          {clients.map((client) => (
            <SalesPipelineCard key={client.id} client={client} />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}