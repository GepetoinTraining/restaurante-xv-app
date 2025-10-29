// PATH: app/dashboard/buffet-status/components/BuffetStationDisplay.tsx
'use client';

import { Paper, Title, Stack, Group, Text, Progress, Badge, Button, Tooltip } from "@mantine/core";
import { BuffetStationWithPans, SerializedservingPan, StorageLocation } from "@/lib/types"; // Correct import from lib/types
import { IconToolsKitchen2, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { RefillPanModal } from "./RefillPanModal";

type BuffetStationProps = {
    station: BuffetStationWithPans;
    storageLocations: StorageLocation[];
    onRefresh: () => void; // Callback to refresh data after refill
};

export function BuffetStationDisplay({ station, storageLocations, onRefresh }: BuffetStationProps) {
    // State uses the correct type 'SerializedservingPan'
    const [selectedPan, setSelectedPan] = useState<SerializedservingPan | null>(null);

    const handleRefillClick = (pan: SerializedservingPan) => {
        if (pan.ingredient) {
            setSelectedPan(pan);
        }
    };

    const handleModalClose = () => {
        setSelectedPan(null);
    };

    const handleRefillSuccess = () => {
        setSelectedPan(null); // Close modal
        onRefresh(); // Trigger data refresh
    };

    return (
        <Paper withBorder shadow="md" p="md">
            <Stack>
                <Group justify="space-between">
                    <Title order={3}>{station.name}</Title>
                    <IconToolsKitchen2 size={24} />
                </Group>

                <Stack gap="lg" mt="md">
                    {station.pans.length === 0 && (
                        <Text c="dimmed" fs="italic">Nenhuma cuba cadastrada para esta estação.</Text>
                    )}
                    {station.pans.map((pan) => {
                        const current = parseFloat(pan.currentQuantity);
                        // --- START FIX: Handle null capacity before parsing ---
                        const capacity = pan.capacity !== null ? parseFloat(pan.capacity) : 0;
                        // --- END FIX ---
                        const percentage = (capacity > 0) ? (current / capacity) * 100 : 0;

                        let progressColor = 'green';
                        if (percentage < 25) progressColor = 'red';
                        else if (percentage < 50) progressColor = 'orange';

                        const panName = pan.ingredient ? pan.ingredient.name : "Cuba Vazia";
                        const unit = pan.ingredient ? pan.ingredient.unit : '';

                        return (
                            <div key={pan.id}>
                                <Group justify="space-between" mb={2}>
                                    <Text fw={500}>{panName}</Text>
                                    <Badge
                                        color={pan.ingredient ? 'blue' : 'gray'}
                                        variant="light"
                                        size="sm"
                                    >
                                        {/* --- START FIX: Display capacity appropriately --- */}
                                        {current.toFixed(2)} / {capacity > 0 ? capacity.toFixed(2) : 'N/A'} {unit}
                                        {/* --- END FIX --- */}
                                    </Badge>
                                </Group>
                                <Progress value={percentage} color={progressColor} animated={percentage < 25} />
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="blue"
                                    mt="xs"
                                    onClick={() => handleRefillClick(pan)}
                                    disabled={!pan.ingredient} // Can't refill if no ingredient assigned
                                    leftSection={<IconRefresh size={14} />}
                                >
                                    Repor
                                </Button>
                            </div>
                        );
                    })}
                </Stack>
            </Stack>

            {/* Refill Modal - Props passed here are now correctly typed */}
            <RefillPanModal
                pan={selectedPan}
                locations={storageLocations}
                opened={!!selectedPan}
                onClose={handleModalClose}
                onSuccess={handleRefillSuccess} // Renamed prop in Modal was 'onSuccess'
            />
        </Paper>
    );
}