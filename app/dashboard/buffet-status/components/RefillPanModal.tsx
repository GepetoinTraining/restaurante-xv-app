// PATH: app/dashboard/buffet-status/components/RefillPanModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Select, NumberInput, Group, Text, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from "@mantine/notifications";
// --- START FIX: Import SerializedservingPan ---
import { ApiResponse, StorageLocation, SerializedservingPan } from "@/lib/types";
// --- END FIX ---
// --- REMOVED ServingPan import as SerializedservingPan is used ---
// import { ServingPan } from "@prisma/client";

// --- REMOVED local PanToRefill type definition ---
// type PanToRefill = (Omit<ServingPan, 'currentQuantity' | 'capacity'> & {
//     currentQuantity: string; // Serialized
//     capacity: string | null;  // Serialized
//     ingredient: {
//         id: string;
//         name: string;
//         unit: string;
//     } | null;
// });

interface RefillPanModalProps {
  opened: boolean;
  onClose: () => void;
  // --- START FIX: Use SerializedservingPan type for the pan prop ---
  pan: SerializedservingPan | null;
  // --- END FIX ---
  locations: StorageLocation[]; // Use StorageLocation from lib/types
  onSuccess: (updatedPan: any) => void; // Callback after successful refill
}

// --- START FIX: Update component prop type ---
export function RefillPanModal({ opened, onClose, pan, locations, onSuccess: onRefillSuccess }: RefillPanModalProps) {
// --- END FIX ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      quantityToAdd: '',
      sourceLocationId: '',
    },
    validate: {
      // Keep existing validation
      quantityToAdd: (value) => {
        if (!value) return 'Quantidade é obrigatória';
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) return 'Quantidade deve ser positiva';
        // Check against capacity if available
        if (pan?.capacity) {
            const current = parseFloat(pan.currentQuantity);
            const capacity = parseFloat(pan.capacity);
            if (!isNaN(current) && !isNaN(capacity) && (current + num > capacity)) {
                return `Excede a capacidade (${capacity.toFixed(3)} ${pan.ingredient?.unit})`;
            }
        }
        return null;
      },
      sourceLocationId: (value) => (value ? null : 'Local de origem é obrigatório'),
    },
  });

  // --- START FIX: Adjust data fetching for locations if needed, ensure labels/values are correct ---
  // Assuming locations prop is already formatted correctly [{ label: string, value: string }]
  const storageLocationsOptions = locations.map(loc => ({ label: loc.name, value: loc.id }));
  // --- END FIX ---

  const handleSubmit = async (values: typeof form.values) => {
    if (!pan || !pan.ingredient) {
        setError("Informação da cuba ou ingrediente ausente.");
        return;
    }; // Ensure pan and ingredient exist
    setIsLoading(true);
    setError(null);

    try {
      // API endpoint expects pan *ID* in the URL
      const res = await fetch(`/api/buffet/${pan.id}/refill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityToAdd: values.quantityToAdd, // API expects string or number
          sourceLocationId: values.sourceLocationId,
        }),
      });

      const data: ApiResponse = await res.json();

      if (data.success && data.data) {
        notifications.show({
          title: 'Sucesso!',
          message: `Cuba de ${pan.ingredient?.name} reabastecida.`,
          color: 'green',
        });
        onRefillSuccess(data.data); // Pass updated pan back
        handleClose();
      } else {
        // --- START FIX: Display more specific error from API ---
        setError(data.error || 'Falha ao reabastecer a cuba.');
        // --- END FIX ---
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setError(null);
    onClose();
  };

  // --- START FIX: Calculations based on SerializedservingPan ---
  const currentQuantityNum = pan ? parseFloat(pan.currentQuantity) : 0;
  const capacityNum = pan?.capacity ? parseFloat(pan.capacity) : undefined;
  const maxRefill = capacityNum !== undefined ? (capacityNum - currentQuantityNum) : undefined;
  // --- END FIX ---

  return (
    <Modal opened={opened} onClose={handleClose} title={`Reabastecer ${pan?.ingredient?.name || 'Cuba'}`}>
      {pan && (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Text size="sm">
            {/* --- Use calculated numbers for display --- */}
            Atual: {currentQuantityNum.toFixed(3)} / {capacityNum !== undefined ? capacityNum.toFixed(3) : 'N/A'} {pan.ingredient?.unit}
          </Text>
          {capacityNum !== undefined && maxRefill !== undefined && (
             <Text size="xs" c="dimmed">
              (Máx. para adicionar: {maxRefill.toFixed(3)} {pan.ingredient?.unit})
            </Text>
          )}

          <Select
            label="Origem do Estoque"
            placeholder="Selecione o local de origem"
            // --- Use correctly formatted options ---
            data={storageLocationsOptions}
            searchable
            required
            mt="md"
            {...form.getInputProps('sourceLocationId')}
          />

          <NumberInput
            label={`Quantidade a Adicionar (${pan.ingredient?.unit})`}
            placeholder="Ex: 5.5"
            decimalScale={3}
            min={0.001} // Minimum positive value
            // --- Set max based on calculation ---
            max={maxRefill}
            required
            mt="md"
            {...form.getInputProps('quantityToAdd')}
          />

          {error && (
            <Alert color="red" title="Erro" mt="md" withCloseButton onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleClose} loading={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              Confirmar Reabastecimento
            </Button>
          </Group>
        </form>
      )}
    </Modal>
  );
}