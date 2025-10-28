// PATH: app/dashboard/prep-management/components/CreatePrepTaskModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Stack, LoadingOverlay, Select, NumberInput, Textarea, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { SerializedPrepRecipe, StorageLocation, UserWithWorkstation } from "@/lib/types";
import { notifications } from "@mantine/notifications"; // Import notifications

interface CreatePrepTaskModalProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: (values: {
        prepRecipeId: string | null;
        targetQuantity: string;
        locationId: string | null;
        assignedToUserId: string | null;
        notes: string;
    }) => void;
    isLoading: boolean;
    recipes: SerializedPrepRecipe[];
    locations: StorageLocation[];
    staff: UserWithWorkstation[];
}

export function CreatePrepTaskModal({
    opened,
    onClose,
    onSubmit,
    isLoading,
    recipes,
    locations,
    staff,
}: CreatePrepTaskModalProps) {

    const form = useForm({
        initialValues: {
            prepRecipeId: null as string | null,
            targetQuantity: "",
            locationId: null as string | null,
            assignedToUserId: null as string | null, // Changed from empty string to null
            notes: "",
        },
        validate: {
            prepRecipeId: (val) => (val ? null : "Receita é obrigatória"),
            targetQuantity: (val) => {
                const num = parseFloat(val);
                // Ensure it's a positive number
                return !isNaN(num) && num > 0 ? null : "Qtd. Alvo inválida (deve ser > 0)";
            },
            locationId: (val) => (val ? null : "Localização é obrigatória"),
        },
    });

    // Reset form when modal closes
    useEffect(() => {
        if (!opened) {
            form.reset();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    // Handle form submission by calling the parent's onSubmit
    const handleSubmit = (values: typeof form.values) => {
        // Ensure assignedToUserId is null if empty string was selected
        const finalValues = {
            ...values,
            assignedToUserId: values.assignedToUserId === '' ? null : values.assignedToUserId
        };
        onSubmit(finalValues);
    };

    const handleClose = () => {
        // Form reset is handled by useEffect
        onClose();
    }

    // Prepare data for Select components
    const recipeOptions = recipes.map(r => ({
        value: r.id,
        // Check for null outputIngredient safely
        label: `${r.name} (Produz ${r.outputQuantity} ${r.outputIngredient?.unit ?? 'UN'} ${r.outputIngredient?.name ?? ''})`
    }));
    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
    // Add "Unassigned" option, ensure value is handled correctly (null vs '')
    const staffOptions = [{value: '', label: 'Não atribuir (Pendente)'}, ...staff.map(s => ({ value: s.id, label: s.name }))];

    const selectedRecipe = recipes.find(r => r.id === form.values.prepRecipeId);
    // Safely access unit
    const outputUnit = selectedRecipe?.outputIngredient?.unit ?? 'UN';

    return (
        <Modal opened={opened} onClose={handleClose} title="Criar Nova Tarefa de Preparo Manual" size="lg">
            <LoadingOverlay visible={isLoading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Select
                        required
                        label="Receita de Preparo"
                        placeholder="Selecione a receita a ser executada"
                        data={recipeOptions}
                        {...form.getInputProps('prepRecipeId')}
                        searchable
                        limit={20}
                        nothingFoundMessage="Nenhuma receita encontrada"
                        error={form.errors.prepRecipeId} // Show validation error
                    />
                     <NumberInput
                        required
                        label={`Quantidade Alvo (em ${outputUnit})`}
                        description="Quanto você quer que seja produzido?"
                        placeholder="Ex: 500"
                        min={0.001} // Smallest allowed value
                        decimalScale={3} // Allow decimals
                        step={0.1} // Step for controls
                        {...form.getInputProps('targetQuantity')}
                        error={form.errors.targetQuantity} // Show validation error
                    />
                    <Select
                        required
                        label="Localização da Produção/Armazenagem"
                        placeholder="Onde será feito e/ou guardado?"
                        data={locationOptions}
                        {...form.getInputProps('locationId')}
                        searchable
                        limit={20}
                        nothingFoundMessage="Nenhum local encontrado"
                        error={form.errors.locationId} // Show validation error
                    />
                     <Select
                        label="Atribuir Para (Opcional)"
                        placeholder="Deixar pendente para alguém assumir"
                        data={staffOptions}
                        {...form.getInputProps('assignedToUserId')}
                        searchable
                        clearable // Allows easily selecting "Não atribuir"
                        limit={20}
                        nothingFoundMessage="Nenhum membro da equipe encontrado"
                        // No specific validation error needed here usually
                    />
                    <Textarea
                        label="Notas (Opcional)"
                        placeholder="Instruções adicionais, prioridade, etc."
                        {...form.getInputProps('notes')}
                        minRows={2}
                    />

                    <Button type="submit" mt="md" loading={isLoading}>
                        Criar Tarefa
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}

