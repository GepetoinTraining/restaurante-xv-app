// PATH: app/dashboard/routing/components/CreateRouteModal.tsx

'use client';

import {
  Modal,
  Button,
  Stack,
  TextInput,
  Select,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconExclamationCircle } from '@tabler/icons-react';
import { StaffList, VehicleList } from '@/lib/types';
import { toUTC } from '@/lib/utils';
import { Route } from '@prisma/client';

type CreateRouteModalProps = {
  opened: boolean;
  onClose: () => void;
  routeDate: Date; // The date selected on the manager page
};

type ErrorResponse = {
  error: string;
};

export function CreateRouteModal({
  opened,
  onClose,
  routeDate,
}: CreateRouteModalProps) {
  const queryClient = useQueryClient();

  // 1. Fetch Vehicles
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<
    VehicleList[]
  >({
    queryKey: ['vehicles'],
    queryFn: () => axios.get('/api/vehicles').then((res) => res.data),
  });

  // 2. Fetch Drivers (Staff with DRIVER role)
  const { data: drivers, isLoading: isLoadingDrivers } = useQuery<StaffList[]>({
    queryKey: ['staff', 'drivers'],
    queryFn: () => axios.get('/api/staff?role=DRIVER').then((res) => res.data),
  });

  const form = useForm({
    initialValues: {
      routeName: '',
      vehicleId: null,
      driverId: null,
    },
  });

  // 3. Mutation to create the route
  const {
    mutate: createRoute,
    isPending,
    isError,
    error,
  } = useMutation<
    Route,
    AxiosError<ErrorResponse>,
    typeof form.values
  >({
    mutationFn: (values) => {
      const payload = {
        ...values,
        routeDate: toUTC(routeDate).toISOString(), // Use the date from props
      };
      return axios.post('/api/routes', payload).then((res) => res.data);
    },
    onSuccess: (newRoute) => {
      notifications.show({
        title: 'Route Created',
        message: `Successfully created ${newRoute.routeName}.`,
        color: 'green',
        icon: <IconCheck />,
      });
      // Invalidate the main routes query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['routes', routeDate.toISOString().split('T')[0]],
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message:
          error.response?.data?.error || 'Failed to create route.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    createRoute(values);
  };

  // Format data for Select components
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Create New Route for ${routeDate.toLocaleDateString()}`}
      centered
    >
      <LoadingOverlay visible={isLoadingVehicles || isLoadingDrivers} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Route Name"
            placeholder={`e.g., North Route ${routeDate.toLocaleDateString()}`}
            {...form.getInputProps('routeName')}
          />
          <Select
            label="Assign Vehicle"
            placeholder="Select a vehicle"
            data={vehicleData}
            {...form.getInputProps('vehicleId')}
            searchable
            clearable
          />
          <Select
            label="Assign Driver"
            placeholder="Select a driver"
            data={driverData}
            {...form.getInputProps('driverId')}
            searchable
            clearable
          />

          {isError && (
            <Alert color="red" title="Error">
              {error.response?.data?.error || 'An unknown error occurred.'}
            </Alert>
          )}

          <Button type="submit" loading={isPending} mt="md">
            Create Route
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}