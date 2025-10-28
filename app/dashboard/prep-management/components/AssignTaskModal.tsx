// PATH: app/dashboard/prep-management/components/AssignTaskModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Stack, Select, Text, Title, LoadingOverlay } from "@mantine/core"; // Added LoadingOverlay
import { useForm } from "@mantine/form";
import { SerializedPrepTask, UserWithWorkstation } from "@/lib/types";

interface AssignTaskModalProps {
    opened: boolean;
    onClose: () => void;
    onAssign: (userId: string | null) => void; // Pass null to unassign
    staffList: UserWithWorkstation[];
    task: SerializedPrepTask | null;
    // isLoading?: boolean; // Add loading state from parent if needed
}

export function AssignTaskModal({
    opened,
    onClose,
    onAssign,
    staffList,
    task,
    // isLoading // Destructure loading state if passed
}: AssignTaskModalProps) {
    const form = useForm({
        initialValues: {
            assignedToUserId: null as string | null, // Initialize as null
        },
        // No validation needed for just selecting
    });

    // Update form value if task changes while modal is open
    useEffect(() => {
        if (opened && task) {
            // Set to null explicitly if task.assignedToUserId is null/undefined
            form.setFieldValue('assignedToUserId', task.assignedToUserId ?? null);
        } else if (!opened) {
            form.reset(); // Reset when closing
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task, opened]);


    const handleSubmit = (values: { assignedToUserId: string | null }) => {
        // If the empty string option ('') was selected, treat it as null (unassign)
        onAssign(values.assignedToUserId === '' ? null : values.assignedToUserId);
    };

     const handleClose = () => {
        // Resetting is handled by useEffect
        onClose();
    };

    // Prepare options for the Select component
    const staffOptions = [
         { value: '', label: 'Remover atribuição (Pendente)' }, // Option to unassign, use empty string value
         ...staffList.map(s => ({ value: s.id, label: s.name }))
     ];

    if (!task) return null; // Don't render if no task is provided

    // Safely access potentially null properties
    const unit = task.prepRecipe?.outputIngredient?.unit ?? 'unid.';
    const name = task.prepRecipe?.outputIngredient?.name ?? 'Item Preparado';
    const recipeName = task.prepRecipe?.name ?? 'Receita Desconhecida';
    const locationName = task.location?.name ?? 'Local Desconhecido';

    return (
        <Modal opened={opened} onClose={handleClose} title="Atribuir Tarefa de Preparo">
            {/* <LoadingOverlay visible={isLoading} /> */} {/* Uncomment if parent passes loading state */}
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Title order={5}>{recipeName}</Title>
                     <Text size="sm">
                        Meta: {task.targetQuantity} {unit} de {name}
                    </Text>
                     <Text size="sm" c="dimmed">Local: {locationName}</Text>

                    <Select
                        label="Atribuir Para"
                        placeholder="Selecione um membro da equipe..."
                        data={staffOptions}
                        {...form.getInputProps('assignedToUserId')}
                        searchable
                        clearable // Allows selecting the 'Remover' option easily
                        nothingFoundMessage="Nenhum membro da equipe encontrado"
                        mt="md"
                    />
                    <Button type="submit" mt="md" > {/* Removed loading state unless passed */}
                        {form.values.assignedToUserId ? "Confirmar Atribuição" : "Remover Atribuição"}
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}

