// File: app/dashboard/routing/components/RouteCard.tsx

'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconDotsVertical,
  IconDroplet,
  IconEdit,
  IconPencil,
  IconTrash,
  IconTruck,
  IconUser,
} from '@tabler/icons-react';
import {
  DeliveryWithClient,
  RouteStopWithDelivery,
  RouteWithStops,
  StaffList,
  VehicleList,
} from '@/lib/types';
import { useDroppable } from '@dnd-kit/core';
import { DraggableDeliveryItem } from './DraggableDeliveryItem';
import { useState } from 'react';
import { UseMutateFunction } from '@tanstack/react-query'; // Import UseMutateFunction

type RouteCardProps = {
  route: RouteWithStops;
  vehicles: VehicleList[];
  drivers: StaffList[];
  // --- FIX: Added the missing prop ---
  onUpdateRoute: UseMutateFunction<
    RouteWithStops,
    Error,
    { routeId: string; vehicleId?: string; driverId?: string }
  >;
  // ----------------------------------
};

export function RouteCard({
  route,
  vehicles,
  drivers,
  onUpdateRoute, // <-- Added here
}: RouteCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `route-drop-zone-${route.id}`,
    data: {
      type: 'ROUTE_DROP_ZONE',
      routeId: route.id,
      currentStopCount: route.stops.length,
    },
  });

  // State for inline editing
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(
    route.vehicleId,
  );
  const [editingDriverId, setEditingDriverId] = useState<string | null>(
    route.driverId,
  );
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdateRoute({
      routeId: route.id,
      vehicleId: editingVehicleId || undefined,
      driverId: editingDriverId || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingVehicleId(route.vehicleId);
    setEditingDriverId(route.driverId);
    setIsEditing(false);
  };

  const sortedStops = [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder);

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={4}>Rota {route.id.substring(0, 4)}</Title>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="transparent">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconPencil size={14} />}
              onClick={() => setIsEditing(true)}
            >
              Editar Veículo/Motorista
            </Menu.Item>
            <Menu.Item leftSection={<IconTrash size={14} />} color="red">
              Excluir Rota
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Paper
        ref={setNodeRef}
        p="md"
        withBorder
        miw={320}
        mih={400}
        style={{
          backgroundColor: isOver
            ? 'var(--mantine-color-blue-0)'
            : 'var(--mantine-color-gray-1)',
          borderStyle: isOver ? 'dashed' : 'solid',
        }}
      >
        <Stack>
          {isEditing ? (
            <Stack>
              <Select
                label="Veículo"
                data={vehicles.map((v) => ({
                  label: `${v.model} (${v.licensePlate})`,
                  value: v.id,
                }))}
                value={editingVehicleId}
                onChange={setEditingVehicleId}
                clearable
              />
              <Select
                label="Motorista"
                data={drivers.map((d) => ({ label: d.name, value: d.id }))}
                value={editingDriverId}
                onChange={setEditingDriverId}
                clearable
              />
              <Group justify="flex-end">
                <Button variant="default" size="xs" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button size="xs" onClick={handleSave}>
                  Salvar
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="xs">
              <Group>
                <IconTruck size={16} />
                <Text fz="sm">
                  {route.vehicle
                    ? `${route.vehicle.model} (${route.vehicle.licensePlate})`
                    : 'Nenhum veículo'}
                </Text>
              </Group>
              <Group>
                <IconUser size={16} />
                <Text fz="sm">
                  {drivers.find((d) => d.id === route.driverId)?.name ||
                    'Nenhum motorista'}
                </Text>
              </Group>
            </Stack>
          )}

          {/* Render Stops */}
          <Box mt="md">
            {sortedStops.length === 0 ? (
              <Text c="dimmed" ta="center" fz="sm" mt="xl">
                Arraste entregas aqui
              </Text>
            ) : (
              <Stack>
                {sortedStops.map((stop, index) => (
                  <DraggableDeliveryItem
                    key={stop.id}
                    delivery={stop.delivery}
                    isAssigned
                    stopNumber={index + 1}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}