// PATH: app/dashboard/live/components/ActiveVisits.tsx
// NOTE: This is a NEW FILE in a NEW FOLDER.

"use client";

import { Paper, Title, Text, Stack, Card, Group, Badge } from "@mantine/core";
import { LiveVisit } from "@/app/api/live/route"; // Import the new type
import { formatCurrency } from "@/lib/utils";
import { IconUser, IconTag, IconMapPin } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActiveVisitsProps {
  visits: LiveVisit[];
}

export function ActiveVisits({ visits }: ActiveVisitsProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={4}>Clientes Ativos ({visits.length})</Title>
      <Text size="sm" c="dimmed" mb="md">
        Clientes que estão atualmente na casa.
      </Text>
      <Stack>
        {visits.length > 0 ? (
          visits.map((visit) => (
            <Card withBorder radius="sm" key={visit.id}>
              <Group justify="space-between">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconUser size={16} />
                    <Text fw={500}>{visit.client.name}</Text>
                  </Group>
                  <Group gap="xs">
                    <IconTag size={16} />
                    <Text size="sm">Tab: {visit.tab.rfid}</Text>
                  </Group>
                  <Group gap="xs">
                    <IconMapPin size={16} />
                    <Text size="sm">
                      Local: {visit.venueObject?.name || "Check-in (sem local)"}
                    </Text>
                  </Group>
                </Stack>
                <Stack align="flex-end" gap="xs">
                  <Badge color="green" variant="light">
                    {formatDistanceToNow(new Date(visit.checkInAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </Badge>
                  <Text size="lg" fw={700}>
                    {/* Price is a string, parse before formatting */}
                    {/* ---- START FIX ---- */}
                    {/* Cast to unknown first, then to string */}
                    {formatCurrency(parseFloat(visit.totalSpent as unknown as string))}
                    {/* ---- END FIX ---- */}
                  </Text>
                </Stack>
              </Group>
            </Card>
          ))
        ) : (
          <Text c="dimmed">Nenhum cliente na casa.</Text>
        )}
      </Stack>
    </Paper>
  );
}