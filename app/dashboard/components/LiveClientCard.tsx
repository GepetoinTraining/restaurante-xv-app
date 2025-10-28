// File: app/dashboard/components/LiveClientCard.tsx
"use client";

import { Paper, Group, Text, Badge } from "@mantine/core";
import { LiveClient } from "@/lib/types"; // Import the correct type
import { User } from "lucide-react";

export function LiveClientCard({ client }: { client: LiveClient }) {
  return (
    <Paper withBorder p="sm" radius="md" shadow="xs">
      <Group justify="space-between">
        <Group>
          <User size={18} />
          {/* Display client name or placeholder */}
          <Text fw={500}>{client.name || `Visita #${client.visitId}`}</Text>
        </Group>
        {/* --- FIX: Removed the Badge displaying credit --- */}
        {/* <Badge color="green" variant="light">
          Crédito: R$ {client.consumableCreditRemaining.toFixed(2)}
        </Badge> */}
        {/* Optionally display Seating Area */}
        {client.seatingAreaName && (
             <Badge color="blue" variant="outline" size="sm">
                 {client.seatingAreaName}
             </Badge>
        )}
      </Group>
    </Paper>
  );
}