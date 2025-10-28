// PATH: app/dashboard/buffet-status/components/BuffetStationDisplay.tsx
"use client";

import { Paper, Title, Stack, Group, Text, Progress, Badge, Button, Tooltip } from "@mantine/core";
import { BuffetStationWithPans } from "@/app/api/buffet/stations/route";
import { StorageLocation } from "@/lib/types";
import { IconToolsKitchen2, IconRefresh } from "@tabler/icons-react"; // Changed icon
import { useState } from "react";
import { RefillPanModal } from "./RefillPanModal"; // Import the modal
import { BuffetPan } from "@prisma/client"; // Import base type

interface BuffetStationDisplayProps {
    station: BuffetStationWithPans;
    locations: StorageLocation[];
    onRefillSuccess: () => void;
}

// Type for the specific pan being refilled (including ingredient)
type PanToRefill = (Omit<BuffetPan, 'currentQuantity' | 'capacity'> & {
        currentQuantity: string;
        capacity: string;
        ingredient: { id: string; name: string; unit: string; } | null;
 });


export function BuffetStationDisplay({ station, locations, onRefillSuccess }: BuffetStationDisplayProps) {
    const [modalOpened, setModalOpened] = useState(false);
    const [panToRefill, setPanToRefill] = useState<PanToRefill | null>(null);

    const handleOpenRefillModal = (pan: PanToRefill) => {
        setPanToRefill(pan);
        setModalOpened(true);
    };

    const handleCloseRefillModal = () => {
        setPanToRefill(null);
        setModalOpened(false);
    };


    return (
         <>
            <Paper withBorder p="md" radius="md">
                <Stack>
                    <Title order={4}>{station.name}</Title>
                    {station.pans.length === 0 ? (
                         <Text size="sm" c="dimmed">Nenhuma cuba configurada para esta estação.</Text>
                    ) : (
                         station.pans.map(pan => {
                            const current = parseFloat(pan.currentQuantity);
                            const capacity = parseFloat(pan.capacity);
                            const percentage = capacity > 0 ? Math.min(100, Math.max(0, (current / capacity) * 100)) : 0;
                            const color = percentage > 60 ? 'green' : percentage > 20 ? 'yellow' : 'red';
                            const unit = pan.ingredient?.unit ?? '?';

                            return (
                                <Paper key={pan.id} p="sm" radius="sm" withBorder>
                                    <Stack gap="xs">
                                         <Group justify="space-between">
                                            <Text fw={500}>{pan.ingredient?.name ?? `Cuba ID: ${pan.id}`}</Text>
                                            <Badge size="sm" variant="light" color={color}>
                                                 {current.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} / {capacity.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {unit}
                                             </Badge>
                                         </Group>
                                         <Progress value={percentage} color={color} size="sm" />
                                         <Button
                                             size="xs"
                                             variant="outline"
                                             leftSection={<IconRefresh size={14}/>}
                                             onClick={() => handleOpenRefillModal(pan)}
                                             disabled={!pan.ingredient} // Can't refill if no ingredient assigned
                                         >
                                             Reabastecer
                                         </Button>
                                     </Stack>
                                </Paper>
                            );
                         })
                    )}
                </Stack>
            </Paper>

            <RefillPanModal
                opened={modalOpened}
                onClose={handleCloseRefillModal}
                onSuccess={() => {
                    handleCloseRefillModal();
                    onRefillSuccess();
                }}
                pan={panToRefill}
                locations={locations}
            />
        </>
    );
}