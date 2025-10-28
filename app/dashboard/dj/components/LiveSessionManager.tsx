// PATH: app/dashboard/dj/components/LiveSessionManager.tsx
// NOTE: This is a NEW FILE.

"use client";

import {
  Stack,
  Button,
  Text,
  Loader,
  Alert,
  Group,
  Paper,
  Title,
  Select,
  ActionIcon,
  Badge,
} from "@mantine/core";
import { IconPlayerPlay, IconPlayerStop, IconPlus, IconTrash } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiResponse } from "@/lib/types";
import { DJSession, VinylRecord, DJSetTrack } from "@prisma/client"; // DJSetTrack is already imported
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { EventWithEntertainer } from "./ScheduleManager";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Define complex type for the live session response
type LiveSessionResponse = DJSession & {
  event: EventWithEntertainer;
  tracksPlayed: (DJSetTrack & { vinylRecord: VinylRecord })[];
};

// Define the specific type for the add track API response data
type AddTrackResponseData = DJSetTrack & {
    vinylRecord: VinylRecord;
};

// Helper to fetch live session
const fetchLiveSession = async (): Promise<LiveSessionResponse | null> => {
  const response = await fetch("/api/djsessions");
  const data: ApiResponse<LiveSessionResponse> = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  if (response.status === 404) {
    return null; // No live session, this is not an error
  }
  throw new Error(data.error || "Failed to fetch live session");
};

export function LiveSessionManager() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Query for the *current* live session
  const {
    data: liveSession,
    isLoading,
    isError,
    error,
  } = useQuery<LiveSessionResponse | null>({
    queryKey: ["liveDjSession"],
    queryFn: fetchLiveSession,
    refetchInterval: 10000, // Poll for live session updates
  });

  // Query for *upcoming* events to start a session
  const { data: events } = useQuery<EventWithEntertainer[]>({
     queryKey: ["scheduledEvents"], // Re-use key from ScheduleManager
     queryFn: async () => {
         const response = await fetch("/api/events");
         const data: ApiResponse<EventWithEntertainer[]> = await response.json();
         if (data.success && data.data) {
             // Filter for events that haven't ended
             return data.data.filter(e => new Date(e.endTime) > new Date());
         }
         return [];
     },
     enabled: !liveSession, // Only fetch if no session is live
  });

  // Mutation to START a session
  const startSession = useMutation({
    mutationFn: (eventId: string) =>
      fetch("/api/djsessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      }).then((res) => res.json()),
    onSuccess: (data: ApiResponse) => {
      if (data.success) {
        notifications.show({ title: "Sucesso", message: "Sessão iniciada!", color: "green" });
        queryClient.invalidateQueries({ queryKey: ["liveDjSession"] });
      } else {
        notifications.show({ title: "Erro", message: data.error || "Falha ao iniciar sessão", color: "red" });
      }
    },
     onError: (error: any) => { // Added onError
        notifications.show({ title: "Erro", message: error?.message || "Erro inesperado", color: "red" });
     }
  });

  // Mutation to END a session
  const endSession = useMutation({
    mutationFn: (sessionId: string) =>
      fetch("/api/djsessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then((res) => res.json()),
     onSuccess: (data: ApiResponse) => {
      if (data.success) {
        notifications.show({ title: "Sucesso", message: "Sessão encerrada!", color: "gray" });
        queryClient.invalidateQueries({ queryKey: ["liveDjSession"] });
      } else {
        notifications.show({ title: "Erro", message: data.error || "Falha ao encerrar sessão", color: "red" });
      }
    },
     onError: (error: any) => { // Added onError
        notifications.show({ title: "Erro", message: error?.message || "Erro inesperado", color: "red" });
     }
  });

  const handleStartSession = () => {
      if (selectedEvent) {
          startSession.mutate(selectedEvent);
      }
  };

  const handleEndSession = () => {
      if (liveSession) {
          endSession.mutate(liveSession.id);
      }
  };

  if (isLoading) return <Loader />;

  if (liveSession) {
    // --- LIVE SESSION VIEW ---
    return (
        <Paper withBorder p="md" radius="md">
            <Stack>
                <Title order={3}>Sessão Ao Vivo</Title>
                <Badge color="red" size="lg" variant="filled">LIVE</Badge>
                <Text>Artista: <Text span fw={700}>{liveSession.event.entertainer.name}</Text></Text>
                <Text>Início: {format(new Date(liveSession.actualStartTime), "HH:mm", { locale: ptBR })}</Text>

                <AddTrackToSession sessionId={liveSession.id} />

                <Title order={5} mt="md">Tracks Tocadas ({liveSession.tracksPlayed.length})</Title>
                <Stack>
                    {liveSession.tracksPlayed.map(track => (
                        <Group key={track.id} justify="space-between">
                            <Text size="sm">{track.vinylRecord.title} - {track.vinylRecord.artist}</Text>
                            <Text size="xs" c="dimmed">
                                {format(new Date(track.playedAt), "HH:mm:ss", { locale: ptBR })}
                            </Text>
                        </Group>
                    ))}
                    {liveSession.tracksPlayed.length === 0 && (
                        <Text c="dimmed" size="sm">Nenhuma track adicionada ainda.</Text>
                    )}
                </Stack>

                <Button
                    color="red"
                    leftSection={<IconPlayerStop size={14} />}
                    mt="xl"
                    onClick={handleEndSession}
                    loading={endSession.isPending}
                    disabled={endSession.isPending} // Disable while ending
                >
                    Encerrar Sessão
                </Button>
            </Stack>
        </Paper>
    );
  }

  // --- NO LIVE SESSION VIEW ---
  const eventOptions = events?.map((e) => ({
      value: e.id,
      label: `${e.entertainer.name} @ ${format(new Date(e.startTime), "HH:mm", { locale: ptBR })}`
  })) || [];

  return (
    <Paper withBorder p="md" radius="md">
      <Stack>
        <Title order={3}>Nenhuma sessão ao vivo</Title>
        <Text>Selecione um evento agendado para iniciar a sessão.</Text>
        <Select
          label="Eventos Agendados (Futuros)"
          placeholder={events === undefined ? "Carregando..." : "Selecione..."}
          data={eventOptions}
          value={selectedEvent}
          onChange={setSelectedEvent}
          disabled={!events || startSession.isPending} // Also disable while starting
          searchable
          clearable
        />
        <Button
          leftSection={<IconPlayerPlay size={14} />}
          onClick={handleStartSession}
          disabled={!selectedEvent || startSession.isPending}
          loading={startSession.isPending}
        >
          Iniciar Sessão (Go Live)
        </Button>
         {isError && ( // Show error if fetching live session failed
            <Alert color="red" title="Erro" mt="md">
                {(error as Error)?.message || "Não foi possível verificar a sessão ao vivo."}
            </Alert>
         )}
      </Stack>
    </Paper>
  );
}


// --- Sub-component to add tracks ---
function AddTrackToSession({ sessionId }: { sessionId: string }) {
    const queryClient = useQueryClient();
    const [vinylRecords, setVinylRecords] = useState<VinylRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

    // Fetch all vinyl records
    useEffect(() => {
        const fetchRecords = async () => {
            try { // Added try-catch
                const res = await fetch("/api/vinyl-records");
                const data: ApiResponse<VinylRecord[]> = await res.json();
                if (data.success) setVinylRecords(data.data ?? []);
                else console.error("Failed to fetch vinyl records:", data.error);
            } catch (err) {
                console.error("Error fetching vinyl records:", err);
            }
        }
        fetchRecords();
    }, []);

    const addTrack = useMutation({
       mutationFn: (vinylRecordId: string) =>
        fetch("/api/djsessions/tracks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, vinylRecordId }),
        }).then((res) => res.json()),
       // --- FIX: Explicitly type 'data' here ---
       onSuccess: (data: ApiResponse<AddTrackResponseData>) => {
       // --- END FIX ---
            // Now TypeScript knows data.data has vinylRecord
            if (data.success && data.data?.vinylRecord) {
                notifications.show({ title: "Track Adicionada", message: `Track ${data.data.vinylRecord.title} registrada.`, color: "blue" });
                queryClient.invalidateQueries({ queryKey: ["liveDjSession"] });
                setSelectedRecord(null);
            } else {
                 notifications.show({ title: "Erro", message: data.error || "Falha ao adicionar track (resposta inválida)", color: "red" });
            }
       },
       onError: (error: any) => {
            notifications.show({ title: "Erro", message: error?.message || "Erro inesperado ao adicionar track", color: "red" });
       }
    });

    const recordOptions = vinylRecords.map(r => ({
        value: r.id,
        label: `${r.artist} - ${r.title}`
    }));

    return (
        <Group mt="lg" grow>
            <Select
                placeholder="Buscar disco na biblioteca..."
                data={recordOptions}
                value={selectedRecord}
                onChange={setSelectedRecord}
                searchable
                clearable
                disabled={addTrack.isPending} // Disable select while adding
            />
            <Button
                leftSection={<IconPlus size={14} />}
                onClick={() => { if(selectedRecord) addTrack.mutate(selectedRecord) }}
                disabled={!selectedRecord || addTrack.isPending}
                loading={addTrack.isPending}
            >
                Adicionar Track
            </Button>
        </Group>
    );
}