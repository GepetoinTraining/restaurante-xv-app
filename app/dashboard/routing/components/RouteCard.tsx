// PATH: app/dashboard/routing/components/RouteCard.tsx

'use client';

import {
  Paper,
  Text,
  Title,
  Stack,
  Group,
  Select,
  ActionIcon,
  Alert,
  Divider,
} from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import {
  IconBox,
  IconExclamationCircle,
  IconSteeringWheel,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import {
  RouteWithStops,
  StaffList,
  VehicleList,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { notifications } from '@mantine/notifications';
import { Route, RouteStatus } from '@prisma/client';

type RouteCardProps = {
  route: RouteWithStops;
  dateQueryParam: string; // To help with cache invalidation
};

type ErrorResponse = { error: string };

export function RouteCard({ route, dateQueryParam }: RouteCardProps) {
  const queryClient = useQueryClient();
  const { isOver, setNodeRef } = useDroppable({
    id: `route-${route.id}`,
    data: {
      type: 'ROUTE',
      routeId: route.id,
    },
  });

  // --- Data Fetching for Selects ---
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<
    VehicleList[]
  >({ queryKey: ['vehicles'] });

  const { data: drivers, isLoading: isLoadingDrivers } = useQuery<StaffList[]>({
    queryKey: ['staff', 'drivers'],
  });

  // --- Mutation for Updating Route (Driver/Vehicle) ---
  const { mutate: updateRoute, isPending: isUpdating } = useMutation<
    Route,
    AxiosError<ErrorResponse>,
    { vehicleId?: string | null; driverId?: string | null; status?: RouteStatus }
  >({
    mutationFn: (payload) =>
      axios.patch(`/api/routes/${route.id}`, payload).then((res) => res.data),
    onSuccess: (updatedRoute) => {
      notifications.show({
        title: 'Route Updated',
        message: `${updatedRoute.routeName} has been updated.`,
        color: 'blue',
      });
      // Invalidate and refetch the routes list
      queryClient.invalidateQueries({ queryKey: ['routes', dateQueryParam] });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error updating route',
        message: error.response?.data?.error || 'Unknown error',
        color: 'red',
      });
    },
  });

  // --- Mutation for Removing a Stop ---
  const { mutate: removeStop, isPending: isRemoving } = useMutation<
    unknown,
    AxiosError<ErrorResponse>,
    { stopId: string }
  >({
    mutationFn: ({ stopId }) => axios.delete(`/api/route-stops/${stopId}`),
    onSuccess: () => {
      notifications.show({
        title: 'Stop Removed',
        message: 'The stop has been removed from the route.',
        color: 'orange',
      });
      // Refetch routes AND unassigned deliveries
      queryClient.invalidateQueries({ queryKey: ['routes', dateQueryParam] });
      queryClient.invalidateQueries({
        queryKey: ['deliveries', dateQueryParam, 'unassigned'],
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error removing stop',
        message: error.response?.data?.error || 'Unknown error',
        color: 'red',
      });
    },
  });

  // --- Handlers ---
  const handleVehicleChange = (vehicleId: string | null) => {
    updateRoute({ vehicleId });
  };
  const handleDriverChange = (driverId: string | null) => {
    updateRoute({ driverId });
  };
  const handleRemoveStop = (stopId: string) => {
    removeStop({ stopId });
  };

  const vehicleData =
    vehicles?.map((v) => ({
      value: v.id,
      label: `${v.model} (${v.licensePlate})`,
    })) || [];

  const driverData =
    drivers?.map((d) => ({
      value: d.id,
      label: d.name,
    })) || [];

  const dropzoneStyle = {
    backgroundColor: isOver ? 'var(--mantine-color-green-light)' : undefined,
    border: isOver
      ? '2px dashed var(--mantine-color-green-filled)'
      : '1px solid var(--mantine-color-gray-3)',
    transition: 'background-color 0.2s ease, border 0.2s ease',
  };

  return (
    <Paper
      ref={setNodeRef}
      shadow="sm"
      p="md"
      withBorder
      radius="md"
      style={dropzoneStyle}
    >
      <Stack>
        {/* --- Header & Assignment --- */}
        <Group justify="space-between">
          <Title order={4}>{route.routeName}</Title>
          <Text size="sm" c="dimmed">
            {route.status}
          </Text>
        </Group>
        <Group grow>
          <Select
            label="Vehicle"
            icon={<IconSteeringWheel size={16} />}
            placeholder="Assign vehicle"
            data={vehicleData}
            value={route.vehicleId}
            onChange={handleVehicleChange}
            disabled={isLoadingVehicles || isUpdating}
            searchable
            clearable
          />
          <Select
            label="Driver"
            icon={<IconUser size={16} />}
            placeholder="Assign driver"
            data={driverData}
            value={route.driverId}
            onChange={handleDriverChange}
            disabled={isLoadingDrivers || isUpdating}
            searchable
            clearable
          />
        </Group>

        <Divider label="Stops" />

        {/* --- Stops List --- */}
        <Stack gap="xs">
          {route.stops.length === 0 && (
            <Alert
              icon={<IconBox size={16} />}
              color="gray"
              variant="outline"
              ta="center"
            >
              Drag unassigned deliveries here to add stops.
            </Alert>
          )}

          {route.stops.map((stop, index) => (
            <Paper
              key={stop.id}
              p="xs"
              withBorder
              radius="sm"
              bg="gray.0"
            >
              <Group justify="space-between">
                <Group gap="sm">
                  <Text fw={700}>{index + 1}.</Text>
                  <Stack gap={0}>
                    <Text>
                      {stop.delivery.companyClient.companyName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {stop.delivery.companyClient.addressStreet ||
                        'No address'}
                    </Text>
                  </Stack>
                </Group>
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => handleRemoveStop(stop.id)}
                  loading={isRemoving}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}