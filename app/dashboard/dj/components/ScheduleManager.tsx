// PATH: app/dashboard/dj/components/ScheduleManager.tsx
// NOTE: This is a NEW FILE.

"use client";

import {
  Stack,
  Button,
  Table,
  Text,
  Loader,
  Alert,
  Group,
  Avatar,
  Badge,
} from "@mantine/core";
import { IconPlus, IconAlertCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { ApiResponse } from "@/lib/types";
import { Entertainer, ScheduledEvent } from "@prisma/client";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { CreateEventModal } from "./CreateEventModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Type for the API response
export type SerializedEntertainer = Omit<Entertainer, "rate"> & {
  rate: string | null;
};
export type EventWithEntertainer = ScheduledEvent & {
  entertainer: SerializedEntertainer;
};

// Helper to fetch events
const fetchEvents = async (): Promise<EventWithEntertainer[]> => {
  const response = await fetch("/api/events");
  const data: ApiResponse<EventWithEntertainer[]> = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || "Failed to fetch events");
};

export function ScheduleManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entertainers, setEntertainers] = useState<SerializedEntertainer[]>([]);

  const {
    data: events,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EventWithEntertainer[]>({
    queryKey: ["scheduledEvents"],
    queryFn: fetchEvents,
  });

  // Fetch entertainers to pass to the modal
  const fetchEntertainers = async () => {
    try {
      const response = await fetch("/api/entertainers");
      const data: ApiResponse<SerializedEntertainer[]> = await response.json();
      if (data.success && data.data) {
        setEntertainers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch entertainers", error);
    }
  };

  useEffect(() => {
    fetchEntertainers();
  }, []);

  const rows = events?.map((event) => (
    <Table.Tr key={event.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar size={40} src={event.entertainer.imageUrl} radius={40} />
          <Text fz="sm" fw={500}>
            {event.entertainer.name}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge
          color={event.entertainer.type === "DJ" ? "pink" : "orange"}
        >
          {event.entertainer.type}
        </Badge>
      </Table.Td>
      <Table.Td>
        {format(new Date(event.startTime), "dd/MM/yy 'às' HH:mm", {
          locale: ptBR,
        })}
      </Table.Td>
      <Table.Td>
        {format(new Date(event.endTime), "dd/MM/yy 'às' HH:mm", {
          locale: ptBR,
        })}
      </Table.Td>
      {/* TODO: Add actions (e.g., Delete event) */}
    </Table.Tr>
  ));

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Text>Agenda de eventos futuros e passados.</Text>
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={() => setIsModalOpen(true)}
            disabled={entertainers.length === 0}
          >
            Agendar Evento
          </Button>
        </Group>

        {isLoading && <Loader />}
        {isError && (
          <Alert
            color="red"
            title="Erro ao Carregar Agenda"
            icon={<IconAlertCircle />}
          >
            {(error as Error)?.message || "Erro desconhecido"}
          </Alert>
        )}

        {!isLoading && !isError && (
          <Table.ScrollContainer minWidth={600}>
            <Table verticalSpacing="sm" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Artista</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Início</Table.Th>
                  <Table.Th>Fim</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows && rows.length > 0 ? (
                  rows
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" ta="center">
                        Nenhum evento agendado.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>

      <CreateEventModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          refetch(); // Refetch events
        }}
        entertainers={entertainers}
      />
    </>
  );
}