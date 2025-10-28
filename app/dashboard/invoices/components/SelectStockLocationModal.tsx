// PATH: app/dashboard/invoices/components/SelectStockLocationModal.tsx
"use client";

import { Modal, Button, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { StorageLocation } from "@/lib/types";

interface SelectStockLocationModalProps {
    opened: boolean;
    onClose: () => void;
    onSelect: (locationId: string | null) => void;
    locations: StorageLocation[];
    itemCount: number; // Number of items to be added
}

export function SelectStockLocationModal({
    opened,
    onClose,
    onSelect,
    locations,
    itemCount,
}: SelectStockLocationModalProps) {
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));

    const handleConfirm = () => {
        if (selectedLocationId) {
            onSelect(selectedLocationId);
        } else {
             // Should be caught by validation, but good practice
             onSelect(null); // Indicate no selection if something goes wrong
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Selecionar Local de Estoque"
            centered
        >
            <Stack>
                <Text>Selecione onde os {itemCount} item(ns) recebido(s) serão armazenados:</Text>
                <Select
                    required
                    label="Localização"
                    placeholder="Escolha um local..."
                    data={locationOptions}
                    value={selectedLocationId}
                    onChange={setSelectedLocationId}
                    searchable
                    nothingFoundMessage="Nenhum local encontrado"
                />
                <Button
                    mt="md"
                    onClick={handleConfirm}
                    disabled={!selectedLocationId}
                >
                    Confirmar e Adicionar ao Estoque
                </Button>
            </Stack>
        </Modal>
    );
}