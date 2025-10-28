// PATH: app/dashboard/floorplan/components/DraggablePaletteItem.tsx
"use client";

import { Paper, Text, Group } from "@mantine/core";
import { useDraggable } from "@dnd-kit/core";
import { VenueObjectType } from "@prisma/client";
import { IconCategory } from "@tabler/icons-react"; // Generic icon
import { CSS } from "@dnd-kit/utilities";

type Props = {
  type: VenueObjectType;
  label: string;
  icon: React.ReactNode;
};

export function DraggablePaletteItem({ type, label, icon }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-item-${type}`,
    data: {
      type: "PALETTE_ITEM",
      objectType: type,
      label: label,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      p="xs"
      withBorder
      shadow={isDragging ? "xl" : "sm"}
    >
      <Group>
        {icon || <IconCategory size={16} />}
        <Text size="sm" fw={500}>
          {label}
        </Text>
      </Group>
    </Paper>
  );
}