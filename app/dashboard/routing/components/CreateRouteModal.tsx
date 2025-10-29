// File: app/dashboard/routing/components/CreateRouteModal.tsx

'use client';

import {
  Alert,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import { z } from 'zod';
import { ApiResponse, RouteWithStops, StaffList, VehicleList } from '@/lib/types';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';

const createRouteSchema = z.object({
  routeName: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
});

type CreateRouteModalProps = {
  opened: boolean;
  onClose: () => void;
  routeDate: Date;
  onSuccess: () => void;
};

export function CreateRouteModal({
  opened,
  onClose,
  routeDate,
  onSuccess,
}: CreateRouteModalProps) {
  const queryClient = useQueryClient();

  // --- This modal fetches its own data ---
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
    enabled: opened, // Only fetch when modal is open
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
    enabled: opened, // Only fetch when modal is open
  });
  // ---------------------------------------

  const form = useForm({
    initialValues: {
      routeName: '',
      vehicleId: null,
      driverId: null,
    },
    // --- FIX: Cast schema to 'any' to resolve Zod/Mantine type bug ---
    validate: zodResolver(createRouteSchema as any),
    // -------------------------------------------------------------
  });

  const {
    mutate: createRoute,
    isPending,
    isError,
    error,
  } = useMutation<
    RouteWithStops,
    Error,
    z.infer<typeof createRouteSchema>
  >({
    mutationFn: (values) =>
      axios
        .post('/api/routes', {
          ...values,
          routeDate: routeDate.toISOString().split('T')[0],
        })
        .then((res) => res.data.data),
    onSuccess: () => {
      notifications.show({
        title: 'Route Created',
        message: 'A new route has been successfully created.',
        color: 'green',
      });
      onSuccess(); // Call the prop
      onClose();
      form.reset();
    },
  });

  const handleSubmit = (values: z.infer<typeof createRouteSchema>) => {
    createRoute(values);
  };

  const isLoading = isLoadingVehicles || isLoadingDrivers;

  return (
    <Modal opened={opened} onClose={onClose} title="Criar Nova Rota">
      <LoadingOverlay visible={isLoading || isPending} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nome da Rota (Opcional)"
            placeholder={`Rota de ${routeDate.toLocaleDateString()}`}
            {...form.getInputProps('routeName')}
          />
          <Select
            label="Veículo"
            placeholder="Selecione um veículo"
            data={vehicles?.map((v) => ({
              label: `${v.model} (${v.licensePlate})`,
              value: v.id,
            }))}
            {...form.getInputProps('vehicleId')}
            clearable
          />
          <Select
            label="Motorista"
            placeholder="Selecione um motorista"
            data={drivers?.map((d) => ({
              label: d.name,
              value: d.id,
            }))}
            {...form.getInputProps('driverId')}
            clearable
          />

          {isError && (
            <Alert
              color="red"
              icon={<IconAlertCircle size={16} />}
              title="Error"
            >
              {error?.message || 'Failed to create route.'}
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              Criar Rota
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}