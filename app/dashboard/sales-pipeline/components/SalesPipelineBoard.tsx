// PATH: app/dashboard/sales-pipeline/components/SalesPipelineBoard.tsx

'use client';

import {
  Alert,
  Box,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { SalesPipelineClient } from '@/lib/types';
import { IconExclamationCircle, IconFilter } from '@tabler/icons-react';
import { SalesPipelineColumn } from './SalesPipelineColumn';
// --- DND Imports ---
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { notifications } from '@mantine/notifications';
import { CompanyClient } from '@prisma/client';
// -------------------

// Define the order and title of columns
const pipelineStagesV2 = [
  { id: 'LEAD', title: 'Lead' },
  { id: 'CONTACTED', title: 'Contactado' },
  { id: 'PROPOSAL', title: 'Proposta' },
  { id: 'NEGOTIATION', title: 'Negociação' },
  { id: 'CLOSED_WON', title: 'Fechado Ganho' },
  { id: 'CLOSED_LOST', title: 'Fechado Perdido' },
];

type ErrorResponse = { error: string };

export function SalesPipelineBoard() {
  const queryClient = useQueryClient();

  // 1. Fetch all Company Clients
  const {
    data: clients,
    isLoading,
    isError,
    error,
  } = useQuery<SalesPipelineClient[]>({
    queryKey: ['companyClients', 'all'],
    queryFn: () => axios.get('/api/company-clients').then((res) => res.data),
  });

  // 2. Mutation for updating the client's sales stage
  const { mutate: updateStage, isPending: isUpdating } = useMutation<
    CompanyClient,
    AxiosError<ErrorResponse>,
    { clientId: string; newStage: string }
  >({
    mutationFn: ({ clientId, newStage }) =>
      axios
        .patch(`/api/company-clients/${clientId}/sales-stage`, {
          salesPipelineStage: newStage,
        })
        .then((res) => res.data),
    onSuccess: (updatedClient) => {
      notifications.show({
        title: 'Stage Updated',
        message: `${
          updatedClient.companyName
        } moved to ${updatedClient.salesPipelineStage.toLowerCase()}`,
        color: 'blue',
      });
      // Refetch all client data to update the board
      queryClient.invalidateQueries({ queryKey: ['companyClients', 'all'] });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error Updating Stage',
        message:
          error.response?.data?.error || 'An unknown error occurred.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  // --- DND Logic ---
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return; // Dropped nowhere

    const clientId = active.data.current?.clientId;
    const currentStage = active.data.current?.currentStage;
    const newStage = over.data.current?.stageId;

    // Check if it's a client card being dropped on a valid column
    if (
      active.data.current?.type === 'CLIENT_CARD' &&
      over.data.current?.type === 'COLUMN' &&
      clientId &&
      newStage
    ) {
      // Only make API call if the stage is different
      if (currentStage !== newStage) {
        updateStage({ clientId, newStage });
      }
    }
  };
  // -------------------

  if (isError) {
    return (
      <Alert color="red" title="Error">
        {error?.message || 'Failed to load sales pipeline data.'}
      </Alert>
    );
  }

  // Group clients by their sales stage
  const groupedClients =
    clients?.reduce(
      (acc, client) => {
        const stage = client.salesPipelineStage;
        if (!acc[stage]) {
          acc[stage] = [];
        }
        acc[stage].push(client);
        return acc;
      },
      {} as Record<string, SalesPipelineClient[]>,
    ) || {};

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Box pos="relative">
        <LoadingOverlay visible={isLoading || isUpdating} />
        {clients?.length === 0 && !isLoading && (
          <Alert icon={<IconFilter size={16} />} color="gray">
            No clients found in the sales pipeline.
          </Alert>
        )}

        <Box
          style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            padding: '16px',
            minHeight: '60vh', // Ensure columns have height
          }}
        >
          {pipelineStagesV2.map((stage) => (
            <SalesPipelineColumn
              key={stage.id}
              title={stage.title}
      S       stageId={stage.id}
              clients={groupedClients[stage.id] || []}
            />
          ))}
        </Box>
      </Box>
    </DndContext>
  );
}