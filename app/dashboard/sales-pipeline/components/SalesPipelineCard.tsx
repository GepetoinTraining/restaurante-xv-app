// PATH: app/dashboard/sales-pipeline/components/SalesPipelineCard.tsx

'use client';

import { Paper, Text, Stack } from '@mantine/core';
import { SalesPipelineClient } from '@/lib/types';
// --- DND Imports ---
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
// -------------------

type SalesPipelineCardProps = {
  client: SalesPipelineClient;
};

export function SalesPipelineCard({ client }: SalesPipelineCardProps) {
  // --- DND Hook ---
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `client-${client.id}`,
    data: {
      type: 'CLIENT_CARD',
      clientId: client.id,
      currentStage: client.salesPipelineStage,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 100,
        cursor: 'grabbing',
      }
    : {
        cursor: 'grab',
      };
  // ----------------

  return (
    <Paper
      ref={setNodeRef} // Attach ref
      style={style} // Attach style
      {...listeners} // Attach listeners
      {...attributes} // Attach attributes
      withBorder
      p="sm"
      radius="md"
      shadow="xs"
    >
      <Stack gap="xs">
        <Text fw={500}>{client.companyName}</Text>
        <Text size="xs" c="dimmed">
          {client.contactName || 'No contact'}
        </Text>
      </Stack>
    </Paper>
  );
}