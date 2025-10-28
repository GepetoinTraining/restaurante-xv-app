// PATH: app/dashboard/floorplan/components/FloorPlanPalette.tsx
"use client";

import { Stack, Title, Paper } from "@mantine/core";
import {
  IconTable,
  IconToolsKitchen2,
  IconBox,
  IconFridge,
  IconX,
  IconDoor,
  IconWindow,
  IconDots,
} from "@tabler/icons-react";
import { VenueObjectType } from "@prisma/client";
import { DraggablePaletteItem } from "./DraggablePaletteItem";

// Map types to icons and labels
const paletteItems = [
  {
    type: VenueObjectType.TABLE,
    label: "Mesa",
    icon: <IconTable size={16} />,
  },
  {
    type: VenueObjectType.WORKSTATION,
    label: "Estação de Trabalho",
    icon: <IconToolsKitchen2 size={16} />,
  },
  {
    type: VenueObjectType.STORAGE,
    label: "Estoque Geral",
    icon: <IconBox size={16} />,
  },
  {
    type: VenueObjectType.FREEZER,
    label: "Freezer",
    icon: <IconFridge size={16} />,
  },
  {
    type: VenueObjectType.IMPASSABLE,
    label: "Barreira (Parede)",
    icon: <IconX size={16} />,
  },
  {
    type: VenueObjectType.DOOR,
    label: "Porta",
    icon: <IconDoor size={16} />,
  },
  {
    type: VenueObjectType.WINDOW,
    label: "Janela",
    icon: <IconWindow size={16} />,
  },
  {
    type: VenueObjectType.OTHER,
    label: "Outro",
    icon: <IconDots size={16} />,
  },
];

export function FloorPlanPalette() {
  return (
    <Paper withBorder shadow="md" p="md" style={{ height: "100%" }}>
      <Stack>
        <Title order={4}>Objetos</Title>
        {paletteItems.map((item) => (
          <DraggablePaletteItem
            key={item.type}
            type={item.type}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </Stack>
    </Paper>
  );
}