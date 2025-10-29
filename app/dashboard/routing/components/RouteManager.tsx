// File: app/dashboard/routing/components/RouteManager.tsx

'use client';

import {
  Alert,
  Box,
  Button,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DatePickerInput, DateValue } from '@mantine/dates'; // Import DateValue
import { useDisclosure } from '@mantine/hooks';
import { IconCalendar, IconCirclePlus } from '@tabler/icons-react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import {
  ApiResponse,
  DeliveryWithClient,
  RouteStopWithDelivery,
  RouteWithStops,
  StaffList,
  VehicleList,
} from '@/lib/types';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { notifications } from '@mantine/notifications';
import { CreateRouteModal } from './CreateRouteModal';
import { DraggableDeliveryItem } from './DraggableDeliveryItem';
import { RouteCard } from './RouteCard';

export function RouteManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);

  const queryClient = useQueryClient();
  const dateQueryParam = selectedDate.toISOString().split('T')[0];

  // --- 1. Fetch Routes for the selected date ---
  const {
    data: routes,
    isLoading: isLoadingRoutes,
    isError: isErrorRoutes,
  } = useQuery<RouteWithStops[]>({
    queryKey: ['routes', dateQueryParam],
    queryFn: async () => {
      const res = await axios.get<ApiResponse<RouteWithStops[]>>(
        `/api/routes?date=${dateQueryParam}`,
      );
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to fetch routes');
      }
      return res.data.data;
    },
  });

  // --- 2. Fetch Unassigned Deliveries for the selected date ---
  const {
    data: unassignedDeliveries,
    isLoading: isLoadingDeliveries,
    isError: isErrorDeliveries,
  } = useQuery<DeliveryWithClient[]>({
    queryKey: [
      'deliveries',
      'unassigned',
      dateQueryParam,
    ],
    queryFn: async () => {
      const res = await axios.get<ApiResponse<DeliveryWithClient[]>>(
        `/api/deliveries?date=${dateQueryParam}&status=READY_FOR_DISPATCH`,
      );
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to fetch deliveries');
      }
      return res.data.data;
    },
  });

  // --- 3. Fetch supporting data for Modals (Vehicles, Drivers) ---
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<
    VehicleList[]
  >({
    queryKey: ['vehicles', 'list'],
    queryFn: async () => {
      const res = await axios.get<ApiResponse<VehicleList[]>>('/api/vehicles');
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to fetch vehicles');
      }
      return res.data.data;
    },
  });

  const { data: drivers, isLoading: isLoadingDrivers } = useQuery<
    StaffList[]
  >({
    queryKey: ['staff', 'drivers'],
    queryFn: async () => {
      const res = await axios.get<ApiResponse<StaffList[]>>(
        '/api/staff?role=DRIVER',
      );
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to fetch drivers');
      }
      return res.data.data;
    },
  });

  // --- Mutation for adding a stop to a route ---
  const { mutate: addStop, isPending: isAddingStop } = useMutation<
    RouteStopWithDelivery,
    Error,
    { routeId: string; deliveryId: string; stopOrder: number }
  >({
    mutationFn: ({ routeId, deliveryId, stopOrder }) =>
      axios
        .post(`/api/routes/${routeId}/stops`, { deliveryId, stopOrder })
        .then((res) => res.data.data),
    onSuccess: () => {
      notifications.show({
        title: 'Delivery Added',
        message: 'Delivery has been successfully added to the route.',
        color: 'green',
      });
      queryClient.invalidateQueries({
        queryKey: ['routes', dateQueryParam],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'deliveries',
          'unassigned',
          dateQueryParam,
        ],
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add delivery to route.',
        color: 'red',
      });
    },
  });

  // --- Mutation for updating route details (vehicle/driver) ---
  const { mutate: updateRoute, isPending: isUpdatingRoute } = useMutation<
    RouteWithStops,
    Error,
    { routeId: string; vehicleId?: string; driverId?: string }
  >({
    mutationFn: ({ routeId, ...data }) =>
      axios.patch(`/api/routes/${routeId}`, data).then((res) => res.data.data),
    // --- FIX: Added '=>' and arrow function body ---
    onSuccess: () => {
      notifications.show({
        title: 'Route Updated',
        message: 'Route vehicle/driver has been updated.',
        color: 'blue',
      });
      queryClient.invalidateQueries({
        queryKey: ['routes', dateQueryParam],
      });
    },
    // --- END FIX ---
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update route.',
        color: 'red',
      });
    },
  });

  // --- DND Drop Handler ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (
      over &&
      active.data.current?.type === 'DELIVERY' &&
      over.data.current?.type === 'ROUTE_DROP_ZONE'
    ) {
      const deliveryId = active.data.current?.deliveryId;
      const routeId = over.data.current?.routeId;
      const currentStopCount = over.data.current?.currentStopCount || 0;

      if (deliveryId && routeId) {
        addStop({
          routeId,
          deliveryId,
          stopOrder: currentStopCount + 1,
        });
      }
    }
  };

  const isLoading =
    isLoadingRoutes ||
    isLoadingDeliveries ||
    isLoadingVehicles ||
    isLoadingDrivers;

  const isError = isErrorRoutes || isErrorDeliveries;

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <Stack>
        <Paper withBorder p="md">
          <Group justify="space-between">
            <DatePickerInput
              label="Data da Rota"
              value={selectedDate}
              // --- FIX: Handle string | Date | null from onChange ---
              onChange={(date: DateValue) => {
                if (date) {
                  setSelectedDate(new Date(date));
                }
              }}
              // --- FIX: Use 'leftSection' prop instead of 'icon' ---
              leftSection={<IconCalendar size={16} />}
              maw={250}
            />
            <Button
              leftSection={<IconCirclePlus size={16} />}
              onClick={openCreateModal}
              loading={isLoadingVehicles || isLoadingDrivers}
              disabled={isLoadingVehicles || isLoadingDrivers}
            >
              Criar Nova Rota
            </Button>
          </Group>
        </Paper>

        <Box pos="relative" miw="100%">
          <LoadingOverlay
            visible={isLoading || isAddingStop || isUpdatingRoute}
          />
          {isError && (
            <Alert color="red" title="Error">
              Falha ao carregar dados de rota.
            </Alert>
          )}

          <Box
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              padding: '16px',
              minHeight: '60vh',
            }}
          >
            {/* Unassigned Deliveries Column */}
            <Stack>
              <Title order={4}>Entregas Não Atribuídas</Title>
              <Paper
                p="md"
                withBorder
                miw={300}
                mih={400}
                style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}
              >
                <Stack>
                  {unassignedDeliveries?.length === 0 && (
                    <Text c="dimmed" ta="center" fz="sm">
                      Nenhuma entrega pronta.
                    </Text>
                  )}
                  {unassignedDeliveries?.map((delivery) => (
                    <DraggableDeliveryItem
                      key={delivery.id}
                      delivery={delivery}
                    />
                  ))}
                </Stack>
              </Paper>
            </Stack>

            {/* Route Cards */}
            {routes?.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                // --- FIX: Removed 'unassignedDeliveries' prop ---
                onUpdateRoute={updateRoute}
                vehicles={vehicles || []}
                drivers={drivers || []}
              />
            ))}
          </Box>
        </Box>
      </Stack>

      <CreateRouteModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        routeDate={selectedDate}
        // --- FIX: Removed 'vehicles' and 'drivers' props ---
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['routes', dateQueryParam],
          });
        }}
      />
    </DndContext>
  );
}