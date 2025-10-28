// PATH: app/dashboard/routing/components/DraggableDeliveryItem.tsx

'use client';

import { Paper, Text } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import { DeliveryWithClient } from '@/lib/types';
import { CSS } from '@dnd-kit/utilities';

type DraggableDeliveryItemProps = {
  delivery: DeliveryWithClient;
};

export function DraggableDeliveryItem({
  delivery,
}: DraggableDeliveryItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `delivery-${delivery.id}`,
    data: {
      type: 'DELIVERY',
      deliveryId: delivery.id,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 100, // Make sure it renders on top
        cursor: 'grabbing',
      }
    : {
        cursor: 'grab',
      };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      p="sm"
      withBorder
      radius="md"
      shadow="sm"
    >
      <Text fw={500}>{delivery.companyClient.companyName}</Text>
      <Text size="xs" c="dimmed">
        {delivery.companyClient.addressStreet || 'No address'}
      </Text>
    </Paper>
  );
}