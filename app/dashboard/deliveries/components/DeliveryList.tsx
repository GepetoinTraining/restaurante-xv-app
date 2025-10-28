// PATH: app/dashboard/deliveries/components/DeliveryList.tsx
"use client";

import { SerializedDeliveryBasic } from "../page";
import { Paper, Stack, Text, Group, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { IconTruck, IconUserCircle, IconSteeringWheel, IconBoxMultiple, IconDots, IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";

interface DeliveryListProps {
    deliveries: SerializedDeliveryBasic[];
    // Add handlers later for view details, dispatch, etc.
    // onViewDetails: (deliveryId: string) => void;
    // onDispatch: (deliveryId: string) => void;
}

const getStatusColor = (status: string) => {
    switch(status) {
        case 'PENDING': return 'gray';
        case 'READY_FOR_DISPATCH': return 'blue';
        case 'OUT_FOR_DELIVERY': return 'yellow';
        case 'DELIVERED': return 'green';
        case 'RETURNED': return 'teal';
        case 'CANCELLED': return 'red';
        default: return 'dark';
    }
}

export function DeliveryList({ deliveries }: DeliveryListProps) {

    if (deliveries.length === 0) {
        return <Text c="dimmed" ta="center" mt="md">Nenhuma entrega agendada para esta data.</Text>
    }

    return (
        <Stack gap="sm">
            {deliveries.map(delivery => (
                <Paper key={delivery.id} withBorder p="sm" radius="sm">
                    <Group justify="space-between" wrap="nowrap">
                        {/* Left Side: Client Info & Status */}
                        <Stack gap={4}>
                            <Text fw={500}>{delivery.companyClient.companyName}</Text>
                             <Badge
                                variant="light"
                                color={getStatusColor(delivery.status)}
                                size="sm"
                                // Add icon based on status?
                            >
                                {delivery.status.replace(/_/g, ' ')}
                            </Badge>
                             <Text size="xs" c="dimmed">{delivery._count?.panShipments ?? 0} pans</Text>

                        </Stack>

                        {/* Right Side: Vehicle, Driver, Actions */}
                        <Group gap="xs" align="center" wrap="nowrap">
                             <Tooltip label={`Veículo: ${delivery.vehicle?.model ?? 'N/A'} (${delivery.vehicle?.licensePlate ?? 'N/A'})`}>
                                <ActionIcon variant="subtle" color="gray">
                                    <IconTruck size={18} />
                                </ActionIcon>
                             </Tooltip>
                             <Tooltip label={`Motorista: ${delivery.driver?.name ?? 'N/A'}`}>
                                <ActionIcon variant="subtle" color="gray">
                                    <IconUserCircle size={18} />
                                </ActionIcon>
                             </Tooltip>
                              <Tooltip label="Ver/Editar Detalhes">
                                <ActionIcon variant="subtle" color="blue" onClick={() => alert(`View/Edit ${delivery.id}`)}>
                                    <IconInfoCircle size={18} />
                                </ActionIcon>
                             </Tooltip>
                            {/* Add Dispatch Button based on status later */}
                            {/* {delivery.status === 'READY_FOR_DISPATCH' && (
                                <Button size="xs" variant="filled" color="green">Despachar</Button>
                            )} */}
                        </Group>
                    </Group>
                </Paper>
            ))}
        </Stack>
    );
}
