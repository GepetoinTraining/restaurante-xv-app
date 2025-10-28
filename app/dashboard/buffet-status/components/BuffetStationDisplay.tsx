// PATH: app/dashboard/buffet-status/components/BuffetStationDisplay.tsx
'use client';

import { Paper, Title, Stack, Group, Text, Progress, Badge, Button, Tooltip } from "@mantine/core";
// ---- START FIX: Import from lib/types instead of API route ----
import { BuffetStationWithPans, SerializedBuffetPan, StorageLocation } from "@/lib/types";
// ---- END FIX ----
import { IconToolsKitchen2, IconRefresh } from "@tabler/icons-react"; // Changed icon
import { useState } from "react";
import { RefillPanModal } from "./RefillPanModal"; // Assuming modal is in the same folder

type BuffetStationProps = {
    station: BuffetStationWithPans;
    storageLocations: StorageLocation[];
    onRefresh: () => void; // Callback to refresh data after refill
};

export function BuffetStationDisplay({ station, storageLocations, onRefresh }: BuffetStationProps) {
    const [selectedPan, setSelectedPan] = useState<SerializedBuffetPan | null>(null);

    const handleRefillClick = (pan: SerializedBuffetPan) => {
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
                        const capacity = parseFloat(pan.capacity);
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
                                        {current.toFixed(2)} / {capacity.toFixed(2)} {unit}
                                    </Badge>
                                </Group>
                                <Progress value={percentage} color={progressColor} animated={percentage < 25} />
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="blue"
                                    mt="xs"
                                    onClick={() => handleRefillClick(pan)}
                                    disabled={!pan.ingredient}
                                    leftSection={<IconRefresh size={14} />}
                                >
                                    Repor
                                </Button>
                            </div>
                        );
                    })}
                </Stack>
            </Stack>

            {/* Refill Modal */}
            <RefillPanModal
                pan={selectedPan}
                locations={storageLocations}
                opened={!!selectedPan}
                onClose={handleModalClose}
                onSuccess={handleRefillSuccess}
            />
        </Paper>
    );
}