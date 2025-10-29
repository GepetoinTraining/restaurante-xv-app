// PATH: app/dashboard/buffet-status/components/RefillPanModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Select, NumberInput, Group, Text, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from "@mantine/notifications";
import { ApiResponse, StorageLocation } from "@/lib/types";
import { ServingPan } from "@prisma/client"; // Import base type

// Type matching the pan passed from BuffetStationDisplay
type PanToRefill = (Omit<ServingPan, 'currentQuantity' | 'capacity'> & {
    currentQuantity: string; // Serialized
    capacity: string | null;  // Serialized
    ingredient: {
        id: string;
        name: string;
        unit: string;
    } | null;
});

interface RefillPanModalProps {
  opened: boolean;
  onClose: () => void;
  pan: PanToRefill | null;
  onRefillSuccess: (updatedPan: any) => void;
}

export function RefillPanModal({ opened, onClose, pan, onRefillSuccess }: RefillPanModalProps) {
  const [storageLocations, setStorageLocations] = useState<{ label: string; value: string; }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      quantityToAdd: '',
      sourceLocationId: '',
    },
    validate: {
      quantityToAdd: (value) => (value ? null : 'Quantidade é obrigatória'),
      sourceLocationId: (value) => (value ? null : 'Local de origem é obrigatório'),
    },
  });

  // Fetch storage locations on mount
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/storage-locations');
        const data: ApiResponse<StorageLocation[]> = await res.json();
        if (data.success && data.data) {
          const formatted = data.data.map(loc => ({
            label: loc.name,
            value: loc.id,
          }));
          setStorageLocations(formatted);
        } else {
          setError('Falha ao buscar locais de estoque.');
        }
      } catch (err) {
        setError('Erro ao conectar com a API de locais de estoque.');
      }
    }
    fetchLocations();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    if (!pan) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/buffet/${pan.id}/refill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityToAdd: values.quantityToAdd,
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
        setError(data.error || 'Falha ao reabastecer a cuba.');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setError(null);
    onClose();
  };

  const maxRefill = pan?.capacity ? (parseFloat(pan.capacity) - parseFloat(pan.currentQuantity)) : undefined;

  return (
    <Modal opened={opened} onClose={handleClose} title={`Reabastecer ${pan?.ingredient?.name || 'Cuba'}`}>
      {pan && (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Text size="sm">
            Atual: {pan.currentQuantity} / {pan.capacity || 'N/A'} {pan.ingredient?.unit}
          </Text>
          {pan.capacity && (
             <Text size="xs" color="dimmed">
              (Máx. para adicionar: {maxRefill?.toFixed(3)} {pan.ingredient?.unit})
            </Text>
          )}

          <Select
            label="Origem do Estoque"
            placeholder="Selecione o local de origem"
            data={storageLocations}
            searchable
            required
            mt="md"
            {...form.getInputProps('sourceLocationId')}
          />

          <NumberInput
            label={`Quantidade a Adicionar (${pan.ingredient?.unit})`}
            placeholder="Ex: 5.5"
            // --- START FIX: Changed 'precision' to 'decimalScale' ---
            decimalScale={3}
            // --- END FIX ---
            min={0}
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

          <Group position="right" mt="xl">
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