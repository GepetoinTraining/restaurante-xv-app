// PATH: app/dashboard/buffet-status/components/RefillPanModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Stack, LoadingOverlay, Select, NumberInput, Text, Title, Alert } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse, StorageLocation } from "@/lib/types";
import { servingPan } from "@prisma/client"; // Import base type

// Type matching the pan passed from BuffetStationDisplay
type PanToRefill = (Omit<servingPan, 'currentQuantity' | 'capacity'> & {
        currentQuantity: string;
        capacity: string;
        ingredient: { id: string; name: string; unit: string; } | null;
 });

interface RefillPanModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    pan: PanToRefill | null;
    locations: StorageLocation[];
}

export function RefillPanModal({
    opened,
    onClose,
    onSuccess,
    pan,
    locations,
}: RefillPanModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            quantityToAdd: "",
            sourceLocationId: null as string | null,
        },
        validate: {
             quantityToAdd: (value) => {
                const num = parseFloat(value);
                return !isNaN(num) && num > 0 ? null : "Quantidade inválida (> 0)";
            },
            sourceLocationId: (val) => (val ? null : "Localização de origem é obrigatória"),
        },
    });

    // Reset form when modal opens or pan changes
    useEffect(() => {
        if (opened && pan) {
            // Optionally pre-fill quantity needed?
            // const needed = parseFloat(pan.capacity) - parseFloat(pan.currentQuantity);
            // form.setFieldValue('quantityToAdd', needed > 0 ? needed.toFixed(3) : "");
            form.reset(); // Or just reset
        } else if (!opened) {
             form.reset();
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened, pan]);


    const handleSubmit = async (values: typeof form.values) => {
         if (!pan) return; // Should not happen
        setIsSubmitting(true);
        const payload = {
            quantityToAdd: values.quantityToAdd, // API expects string or number
            sourceLocationId: values.sourceLocationId,
        };

        try {
            const response = await fetch(`/api/buffet/pans/${pan.id}/refill`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data: ApiResponse = await response.json();

            if (response.ok && data.success) {
                notifications.show({ title: "Sucesso", message: `Cuba de ${pan.ingredient?.name ?? pan.id} reabastecida!`, color: "green" });
                onSuccess();
            } else {
                notifications.show({ title: "Erro", message: data.error || "Falha ao reabastecer cuba", color: "red" });
            }
        } catch (error: any) {
            notifications.show({ title: "Erro", message: error.message || "Erro inesperado", color: "red" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));

    if (!pan || !pan.ingredient) return null; // Should have ingredient if modal is opened

    const currentQty = parseFloat(pan.currentQuantity);
    const capacityQty = parseFloat(pan.capacity);
    const unit = pan.ingredient.unit;

    return (
        <Modal opened={opened} onClose={onClose} title={`Reabastecer: ${pan.ingredient.name}`} centered>
            <LoadingOverlay visible={isSubmitting} />
             <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                     <Text size="sm">Cuba contém atualmente {currentQty.toFixed(1)}/{capacityQty.toFixed(1)} {unit}.</Text>
                     <Select
                        required
                        label="Origem do Estoque"
                        placeholder="De onde retirar o ingrediente?"
                        data={locationOptions}
                        {...form.getInputProps('sourceLocationId')}
                        searchable
                    />
                    <NumberInput
                        required
                        label={`Quantidade a Adicionar (em ${unit})`}
                        placeholder="Ex: 500"
                        min={0.001}
                        decimalScale={3}
                        step={0.1}
                        {...form.getInputProps('quantityToAdd')}
                    />
                    <Button type="submit" mt="md" loading={isSubmitting}>
                        Confirmar Reabastecimento
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}