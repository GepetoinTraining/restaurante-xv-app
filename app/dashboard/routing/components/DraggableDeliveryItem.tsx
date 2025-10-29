// File: app/dashboard/routing/components/DraggableDeliveryItem.tsx

'use client';

import { DeliveryWithClient } from '@/lib/types';
import { useDraggable } from '@dnd-kit/core';
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Menu,
  Paper,
  Text,
} from '@mantine/core';
import {
  IconArrowRight,
  IconDotsVertical,
  IconGripVertical,
  IconMapPin,
  IconTrash,
} from '@tabler/icons-react';

type DraggableDeliveryItemProps = {
  delivery: DeliveryWithClient;
  // --- FIX: Add missing props ---
  isAssigned?: boolean;
  stopNumber?: number;
  // ------------------------------
};

export function DraggableDeliveryItem({
  delivery,
  isAssigned,
  stopNumber,
}: DraggableDeliveryItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `delivery-${delivery.id}`,
    data: {
      type: 'DELIVERY',
      deliveryId: delivery.id,
    },
    disabled: isAssigned, // Disable dragging if already assigned
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100, // Ensure it's on top while dragging
      }
    : undefined;

  return (
    <Paper
      shadow="xs"
      p="sm"
      withBorder
      ref={setNodeRef}
      style={style}
      bg="white"
    >
      <Group justify="space-between">
        <Group>
          {!isAssigned ? (
            <ActionIcon {...listeners} {...attributes} variant="transparent">
              <IconGripVertical size={16} />
            </ActionIcon>
          ) : (
            <Badge circle size="lg">
              {stopNumber}
            </Badge>
          )}

          <div>
            <Text fw={500}>
              {delivery.companyClient.companyName}
            </Text>
            <Text size="xs" c="dimmed">
              {delivery.companyClient.addressStreet}
            </Text>
          </div>
        </Group>

        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="transparent">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconMapPin size={14} />}>
              Ver no Mapa
            </Menu.Item>
            {isAssigned && (
              <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                Remover da Rota
              </Menu.Item>
            )}
            {!isAssigned && (
              <Menu.Item leftSection={<IconArrowRight size={14} />}>
                Atribuir Manualmente...
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Paper>
  );
}