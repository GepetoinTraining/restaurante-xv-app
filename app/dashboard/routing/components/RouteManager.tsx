// PATH: app/dashboard/routing/components/RouteManager.tsx

'use client';

import {
  Box,
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useState } from 'react';
import { toUTC } from '@/lib/utils';
import { DeliveryWithClient, RouteWithStops } from '@/lib/types';
import { IconExclamationCircle, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { CreateRouteModal } from './CreateRouteModal';
// --- DND IMPORTS ---
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { DraggableDeliveryItem } from './DraggableDeliveryItem';
import { RouteCard } from './RouteCard';
import { notifications } from '@mantine/notifications';
import { RouteStop } from '@prisma/client';
// -------------------

// ... (DataDisplayWrapper helper component remains the same) ...
function DataDisplayWrapper({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <LoadingOverlay visible />;
  }
  if (error) {
    return (
      <Text c="red">
        Error fetching data: {error.message || 'Unknown error'}
      </Text>
    );
  }
  return <>{children}</>;
}
// -----------------------------------------------------------

type ErrorResponse = { error: string };

export function RouteManager() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [
    modalOpened,
    { open: openModal, close: closeModal },
  ] = useDisclosure(false);

  const dateQueryParam = toUTC(selectedDate).toISOString().split('T')[0];

  // --- Data Fetching ---
  const {
    data: routes,
    isLoading: isLoadingRoutes,
    error: routesError,
  } = useQuery<RouteWithStops[]>({
    queryKey: ['routes', dateQueryParam],
    queryFn: () =>
      axios.get(`/api/routes?date=${dateQueryParam}`).then((res) => res.data),
  });

  const {
    data: unassignedDeliveries,
    isLoading: isLoadingDeliveries,
    error: deliveriesError,
  } = useQuery<DeliveryWithClient[]>({
    queryKey: ['deliveries', dateQueryParam, 'unassigned'],
    queryFn: () =>
      axios
        .get(`/api/deliveries?date=${dateQueryParam}&unassigned=true`)
        .then((res) => res.data),
  });

  // --- Mutation for ADDING a stop (from DND) ---
  const { mutate: addStop, isPending: isAddingStop } = useMutation<
    RouteStop,
    AxiosError<ErrorResponse>,
    { routeId: string; deliveryId: string }
  >({
    mutationFn: ({ routeId, deliveryId }) =>
      axios
        .post(`/api/routes/${routeId}/stops`, { deliveryId })
        .then((res) => res.data),
    onSuccess: () => {
      notifications.show({
        title: 'Stop Added',
        message: 'The delivery has been added to the route.',
        color: 'green',
      });
      // Refetch both lists
      queryClient.invalidateQueries({ queryKey: ['routes', dateQueryParam] });
      queryClient.invalidateQueries({
        queryKey: ['deliveries', dateQueryParam, 'unassigned'],
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error adding stop',
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

    // Check if we are dropping over a valid dropzone
    if (!over) return;

    // Check if we are dragging a DELIVERY
    if (active.data.current?.type !== 'DELIVERY') return;

    // Check if we are dropping onto a ROUTE
    if (over.data.current?.type === 'ROUTE') {
      const deliveryId = active.data.current?.deliveryId;
      const routeId = over.data.current?.routeId;

      if (deliveryId && routeId) {
        // Optimistic update (visual only) before API call
        // This is complex, so for MVP we will rely on the query invalidation
        addStop({ routeId, deliveryId });
      }
    }
    // We can add reordering logic here later
  };

  const isLoading = isLoadingRoutes || isLoadingDeliveries;

  return (
    <>
      <CreateRouteModal
        opened={modalOpened}
        onClose={closeModal}
        routeDate={selectedDate}
      />

      <Stack>
        <Paper shadow="md" p="md" withBorder>
          {/* ... (Header & Date Picker - same as before) ... */}
           <Group justify="space-between">
            <Title order={3}>
              Routes for {selectedDate.toLocaleDateString()}
            </Title>
            <DatePickerInput
              label="Select Date"
              placeholder="Pick date"
              value={selectedDate}
              // --- FIX: Convert the string back to a Date object ---
              onChange={(date) => {
                // If date is truthy (not null) and is a string
                if (date) {
                  // We cast to 'any' to handle the string, then create a new Date
                  setSelectedDate(new Date(date as any));
                }
              }}
              maw={300}
            />
          </Group>
        </Paper>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <Box pos="relative">
            <LoadingOverlay visible={isLoading || isAddingStop} />
            <Grid>
              {/* --- Unassigned Deliveries Column --- */}
              <Grid.Col span={4}>
                <Paper shadow="sm" p="md" withBorder>
                  <Title order={4} mb="md">
                    Unassigned Deliveries
                  </Title>
                  <DataDisplayWrapper
                    isLoading={isLoadingDeliveries}
                    error={deliveriesError as Error | null}
                  >
                    <Stack gap="sm">
                      {unassignedDeliveries?.length === 0 && (
                        <Text c="dimmed" size="sm">
                          No unassigned deliveries for this date.
                        </Text>
                      )}
                      {unassignedDeliveries?.map((delivery) => (
                        // --- Use Draggable Component ---
                        <DraggableDeliveryItem
                          key={delivery.id}
                          delivery={delivery}
                        />
                      ))}
                    </Stack>
                  </DataDisplayWrapper>
                </Paper>
              </Grid.Col>

              {/* --- Routes Column --- */}
              <Grid.Col span={8}>
                <Stack>
                  <Group justify="space-between">
                    <Title order={4}>Active Routes</Title>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      size="xs"
                      onClick={openModal}
                    >
                      Create New Route
                    </Button>
                  </Group>

                  <DataDisplayWrapper
                    isLoading={isLoadingRoutes}
                    error={routesError as Error | null}
                  >
                    <Stack gap="md">
                      {routes?.length === 0 && (
                        <Text c="dimmed" size="sm" ta="center" mt="xl">
                          No routes created for this date.
                        </Text>
                      )}
                      {routes?.map((route) => (
                        // --- Use RouteCard Component ---
                        <RouteCard
                          key={route.id}
                          route={route}
                          dateQueryParam={dateQueryParam}
                        />
                      ))}
                    </Stack>
                  </DataDisplayWrapper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Box>
        </DndContext>
      </Stack>
    </>
  );
}