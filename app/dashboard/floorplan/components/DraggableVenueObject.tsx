// PATH: app/dashboard/floorplan/components/DraggableVenueObject.tsx
"use client";

import { Paper, Text, Group, ActionIcon, Badge, Stack } from "@mantine/core";
import { useDraggable } from "@dnd-kit/core";
import { VenueObject, Workstation } from "@prisma/client";
import { CSS } from "@dnd-kit/utilities";
import { IconPencil, IconTrash, IconArrowsMove } from "@tabler/icons-react";

type Props = {
  object: VenueObject & { workstation: Workstation | null };
  onEdit: () => void;
  onDelete: () => void;
};

export function DraggableVenueObject({ object, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `object-${object.id}`,
    data: {
      type: "VENUE_OBJECT",
      objectId: object.id,
      // Store original position to calculate delta on drop
      originalX: object.anchorX,
      originalY: object.anchorY,
    },
  });

  const style = {
    // Apply transform for dragging
    transform: CSS.Translate.toString(transform),
    // Use layout positioning when not dragging
    position: "absolute" as const,
    left: object.anchorX,
    top: object.anchorY,
    width: object.width || 100,
    height: object.height || 100,
    transformOrigin: "center center",
    rotate: `${object.rotation || 0}deg`,
    zIndex: isDragging ? 1100 : 100, // Be on top when dragging
    opacity: isDragging ? 0.8 : 1,
    cursor: "default", // Default, listener will change to grab
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder
      shadow="md"
      p="xs"
      bg={isDragging ? "blue.0" : "white"}
    >
      <Stack gap={0} justify="space-between" h="100%">
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" fw={500} truncate>
            {object.name}
          </Text>
          <Group gap={2} wrap="nowrap">
            {/* The drag handle is the move icon */}
            <ActionIcon
              variant="transparent"
              size="sm"
              {...listeners}
              {...attributes}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              <IconArrowsMove size={14} />
            </ActionIcon>
            <ActionIcon variant="transparent" color="blue" size="sm" onClick={onEdit}>
              <IconPencil size={14} />
            </ActionIcon>
            <ActionIcon variant="transparent" color="red" size="sm" onClick={onDelete}>
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>
        
        <Badge
          variant="light"
          size="xs"
          color={object.workstation ? "cyan" : "gray"}
        >
          {object.workstation ? object.workstation.name : object.type}
        </Badge>
      </Stack>
    </Paper>
  );
}