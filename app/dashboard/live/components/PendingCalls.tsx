// PATH: app/dashboard/live/components/PendingCalls.tsx
// NOTE: This is a NEW FILE in a NEW FOLDER.

"use client";

import {
  Paper,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
} from "@mantine/core";
import { LiveServerCall } from "@/app/api/live/route"; // Import the new type
import { IconBellRinging, IconHandClick } from "@tabler/icons-react";
import { ServerCallStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";

interface PendingCallsProps {
  calls: LiveServerCall[];
  onRefresh: () => void; // Function to refetch live data
}

export function PendingCalls({ calls, onRefresh }: PendingCallsProps) {
  const [loadingCallId, setLoadingCallId] = useState<string | null>(null);

  const handleUpdateCall = async (
    id: string,
    status: ServerCallStatus,
    action: string
  ) => {
    setLoadingCallId(id);
    try {
      // We need a new API route to handle this
      // Let's create /api/server-calls/[id]
      const response = await fetch(`/api/server-calls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      
      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Falha ao ${action} chamada`);
      }

      notifications.show({
        title: "Sucesso",
        message: `Chamada ${action} com sucesso.`,
        color: "green",
      });
      onRefresh(); // Refresh the live data
    } catch (error: any) {
      notifications.show({
        title: "Erro",
        message: error.message,
        color: "red",
      });
    } finally {
      setLoadingCallId(null);
    }
  };

  const pending = calls.filter((c) => c.status === ServerCallStatus.PENDING);
  const acknowledged = calls.filter(
    (c) => c.status === ServerCallStatus.ACKNOWLEDGED
  );

  return (
    <Paper withBorder p="md" radius="md">
      <Title order={4}>Chamadas de Garçom ({calls.length})</Title>
      <Text size="sm" c="dimmed" mb="md">
        Chamadas ativas de clientes.
      </Text>
      <Stack>
        {calls.length === 0 && <Text c="dimmed">Nenhuma chamada ativa.</Text>}

        {/* Pending Calls */}
        {pending.map((call) => (
          <Card withBorder radius="sm" key={call.id} bg="red.0">
            <Group justify="space-between">
              <Stack gap="xs">
                <Group gap="xs">
                  <IconBellRinging size={16} />
                  <Text fw={700} size="lg">
                    {call.venueObject.name}
                  </Text>
                </Group>
                <Text size="sm">
                  Cliente: {call.visit.client.name}
                </Text>
                <Badge color="red" variant="filled">
                  {formatDistanceToNow(new Date(call.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </Badge>
              </Stack>
              <Button
                color="blue"
                variant="filled"
                loading={loadingCallId === call.id}
                onClick={() =>
                  handleUpdateCall(
                    call.id,
                    ServerCallStatus.ACKNOWLEDGED,
                    "confirmar"
                  )
                }
              >
                Confirmar
              </Button>
            </Group>
          </Card>
        ))}

        {/* Acknowledged Calls */}
        {acknowledged.map((call) => (
          <Card withBorder radius="sm" key={call.id} bg="yellow.0">
            <Group justify="space-between">
              <Stack gap="xs">
                <Group gap="xs">
                  <IconHandClick size={16} />
                  <Text fw={500} size="lg">
                    {call.venueObject.name}
                  </Text>
                </Group>
                <Text size="sm">
                  Confirmado por: {call.acknowledgedBy?.name || "N/A"}
                </Text>
                <Badge color="orange" variant="light">
                  Confirmado{" "}
                  {formatDistanceToNow(new Date(call.acknowledgedAt!), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </Badge>
              </Stack>
              <Button
                color="green"
                variant="light"
                loading={loadingCallId === call.id}
                onClick={() =>
                  handleUpdateCall(
                    call.id,
                    ServerCallStatus.RESOLVED,
                    "resolver"
                  )
                }
              >
                Resolver
              </Button>
            </Group>
          </Card>
        ))}
      </Stack>
    </Paper>
  );
}